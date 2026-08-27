'use strict';

const express = require('express');
const path = require('path');
// pg = node-postgres: die Bibliothek um sich mit PostgreSQL zu verbinden
const { Pool } = require('pg');
// Rate Limiting: Begrenzt die Anzahl der Requests pro IP in einem Zeitfenster.
// Schützt die Auth-Endpunkte vor Brute-Force-Angriffen.
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Pool = ein Verbindungspool, der mehrere DB-Verbindungen offen hält.
// Statt für jede Anfrage eine neue Verbindung aufzubauen (langsam),
// werden bestehende Verbindungen wiederverwendet.
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'foodplan',
    password: process.env.DB_PASSWORD || 'foodplan',
    database: process.env.DB_NAME || 'foodplan',
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// JSON body parser
app.use(express.json());

// Rate Limiter für Auth-Endpunkte: Max. 10 Requests pro IP in 15 Minuten.
// Danach wird die IP temporär gesperrt und bekommt einen 429-Fehler.
// standardHeaders: sendet RateLimit-* Header mit (zeigt verbleibende Versuche)
// legacyHeaders: deaktiviert die alten X-RateLimit-* Header
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    // Nur fehlgeschlagene Requests zählen – erfolgreiche Auth wird nicht limitiert.
    // So können authentifizierte Nutzer beliebig viele Änderungen vornehmen,
    // während Brute-Force-Angriffe (falsche Keys) nach 5 Versuchen geblockt werden.
    skipSuccessfulRequests: true,
    message: { error: 'Zu viele Versuche. Bitte in 15 Minuten erneut probieren.' },
});

// Vierstellige Codes haben nur wenig Entropie. Fehlgeschlagene Code-Aufrufe
// werden deshalb pro IP begrenzt, damit Codes nicht einfach ausprobiert werden.
const wishlistLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Zu viele Code-Versuche. Bitte spaeter erneut probieren.' },
});

// Auth middleware for write operations
const requireAuth = (req, res, next) => {
    const key = req.headers['x-api-key'];

    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// Baut die Haupt-SQL-Query, die ein Rezept mit all seinen Tags und Zutaten lädt.
// conditions = optionale WHERE-Bedingungen (z.B. Suche, Filter)
// sort = optionale Sortierung (z.B. name_asc)
const buildRecipeQuery = (conditions = [], sort = null) => {
    let query = `
        SELECT
            r.id,
            r.title,
            r.description,
            r.instruction,
            r.img,
            r.calories,
            r.servings,
            r.duration,

            -- Subquery für Tags: Sammelt alle Tag-Namen in ein JSON-Array, z.B. ["meat", "rice"]
            -- COALESCE(..., '[]') gibt ein leeres Array zurück wenn keine Tags vorhanden
            COALESCE(
                (SELECT json_agg(t.name)
                 FROM recipe_tags rt
                 JOIN tags t ON t.id = rt.tag_id
                 WHERE rt.recipe_id = r.id),
                '[]'
            ) AS tags,

            -- Subquery für Zutaten: Baut pro Zutat ein JSON-Objekt {name, amount, unit}
            -- und sammelt alle in ein Array, alphabetisch sortiert.
            -- Subqueries statt JOINs vermeiden Duplikate durch Kreuzprodukt (Tags × Zutaten)
            COALESCE(
                (SELECT json_agg(
                    json_build_object('name', i.name, 'amount', ri.amount, 'unit', ri.unit)
                    ORDER BY i.name)
                 FROM recipe_ingredients ri
                 JOIN ingredients i ON i.id = ri.ingredient_id
                 WHERE ri.recipe_id = r.id),
                '[]'
            ) AS ingredients

        FROM recipes r
    `;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    if (sort) {
        // NULLS LAST = Rezepte ohne Wert (z.B. ohne Kalorienangabe) kommen ans Ende
        const sortMap = {
            name_asc: 'r.title ASC',
            name_desc: 'r.title DESC',
            duration_asc: 'r.duration ASC NULLS LAST',
            duration_desc: 'r.duration DESC NULLS LAST',
            calories_asc: 'r.calories ASC NULLS LAST',
            calories_desc: 'r.calories DESC NULLS LAST',
        };

        if (sortMap[sort]) {
            query += ` ORDER BY ${sortMap[sort]}`;
        }
    }

    return query;
};

// Upsert: Zutat einfügen oder bestehende ID holen.
// ON CONFLICT (name) = wenn der Name schon existiert (UNIQUE constraint)...
// DO UPDATE SET name = EXCLUDED.name = ...dann aktualisiere den Datensatz (nötig damit RETURNING die ID liefert)
// RETURNING id = gibt die ID der eingefügten oder gefundenen Zeile zurück
// $1 = Platzhalter für den ersten Parameter (verhindert SQL-Injection)
const getOrCreateIngredient = async (client, name) => {
    const result = await client.query(
        'INSERT INTO ingredients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name]
    );
    return result.rows[0].id;
};

// Gleiche Upsert-Logik wie bei Zutaten, nur für Tags
const getOrCreateTag = async (client, name) => {
    const result = await client.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name]
    );
    return result.rows[0].id;
};

// Speichert die Verknüpfungen eines Rezepts zu Tags und Zutaten.
// Strategie: Erst alle alten Verknüpfungen löschen, dann neu einfügen.
// Das ist einfacher als einzelne Änderungen zu vergleichen.
const saveRecipeRelations = async (client, recipeId, tags, ingredients) => {
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

    if (tags && tags.length > 0) {
        for (const tagName of tags) {
            const tagId = await getOrCreateTag(client, tagName);
            // ON CONFLICT DO NOTHING = ignoriert doppelte Einträge stillschweigend
            await client.query(
                'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [recipeId, tagId]
            );
        }
    }

    if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
            const ingredientId = await getOrCreateIngredient(client, ing.name);
            await client.query(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES ($1, $2, $3, $4)',
                [recipeId, ingredientId, ing.amount || null, ing.unit || null]
            );
        }
    }
};

const isWishlistCode = (code) => typeof code === 'string' && /^[\x21-\x7E]{4}$/.test(code);

const normalizeRecipeIds = (ids) => [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0))];

const getWishlist = async (code) => {
    const result = await pool.query(
        `SELECT m.code, COALESCE(json_agg(mr.recipe_id ORDER BY mr.created_at, mr.recipe_id)
                FILTER (WHERE mr.recipe_id IS NOT NULL), '[]') AS recipe_ids
         FROM merklisten m
         LEFT JOIN merkliste_rezepte mr ON mr.merkliste_code = m.code
         WHERE m.code = $1
         GROUP BY m.code`,
        [code]
    );
    return result.rows[0] || null;
};

const replaceWishlistRecipes = async (client, code, recipeIds) => {
    const ids = normalizeRecipeIds(recipeIds);
    if (ids.length > 0) {
        const existing = await client.query('SELECT id FROM recipes WHERE id = ANY($1::int[])', [ids]);
        if (existing.rows.length !== ids.length) {
            const existingIds = new Set(existing.rows.map((row) => row.id));
            return { error: 'Eine oder mehrere Rezept-IDs sind ungueltig.', ids: [...existingIds] };
        }
    }
    await client.query('DELETE FROM merkliste_rezepte WHERE merkliste_code = $1', [code]);
    for (const recipeId of ids) {
        await client.query(
            'INSERT INTO merkliste_rezepte (merkliste_code, recipe_id) VALUES ($1, $2)',
            [code, recipeId]
        );
    }
    return { ids };
};

// GET /api/merklisten/:code - Eine geteilte Merkliste laden
app.get('/api/merklisten/:code', wishlistLimiter, async (req, res) => {
    const { code } = req.params;
    if (!isWishlistCode(code)) return res.status(400).json({ error: 'Der Code muss genau 4 Zeichen enthalten.' });

    try {
        const wishlist = await getWishlist(code);
        if (!wishlist) return res.status(404).json({ error: 'Merkliste nicht gefunden.' });
        const recipes = await pool.query(`${buildRecipeQuery(['r.id = ANY($1::int[])'])} ORDER BY array_position($1::int[], r.id)`, [wishlist.recipe_ids]);
        res.json({ code: wishlist.code, recipeIds: wishlist.recipe_ids, recipes: recipes.rows });
    } catch (err) {
        console.error('Load wishlist error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/merklisten - Merkliste anlegen/aktualisieren (Code ist der Zugriff)
app.post('/api/merklisten', wishlistLimiter, async (req, res) => {
    const { code } = req.body;
    if (!isWishlistCode(code)) return res.status(400).json({ error: 'Der Code muss genau 4 Zeichen enthalten.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO merklisten (code) VALUES ($1) ON CONFLICT (code) DO NOTHING', [code]);
        const result = await replaceWishlistRecipes(client, code, req.body.recipeIds);
        if (result.error) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: result.error });
        }
        await client.query('COMMIT');
        res.status(201).json({ code, recipeIds: result.ids });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create wishlist error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT /api/merklisten/:code - Inhalt einer geteilten Liste ersetzen
app.put('/api/merklisten/:code', wishlistLimiter, async (req, res) => {
    const { code } = req.params;
    if (!isWishlistCode(code)) return res.status(400).json({ error: 'Der Code muss genau 4 Zeichen enthalten.' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const list = await client.query('SELECT code FROM merklisten WHERE code = $1 FOR UPDATE', [code]);
        if (!list.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Merkliste nicht gefunden.' }); }
        const result = await replaceWishlistRecipes(client, code, req.body.recipeIds);
        if (result.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: result.error }); }
        await client.query('COMMIT');
        res.json({ code, recipeIds: result.ids });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update wishlist error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

// GET /api/recipes - List all recipes with optional filter, search, sort
app.get('/api/recipes', async (req, res) => {
    const { search, category, sort } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
        // ILIKE = case-insensitive Suche (LIKE wäre case-sensitive)
        // %...% = Wildcard davor und danach, findet den Suchbegriff überall im Titel
        // $1, $2 etc. = nummerierte Platzhalter, werden durch params[] ersetzt
        params.push(`%${search}%`);
        conditions.push(`r.title ILIKE $${params.length}`);
    }

    if (category && category !== 'all') {
        // Subquery: Findet alle recipe_ids die den gewünschten Tag haben.
        // IN (...) = prüft ob die Rezept-ID in der Ergebnisliste vorkommt
        params.push(category);
        conditions.push(`
            r.id IN (
                SELECT rt2.recipe_id FROM recipe_tags rt2
                JOIN tags t2 ON t2.id = rt2.tag_id
                WHERE t2.name = $${params.length}
            )
        `);
    }

    const query = buildRecipeQuery(conditions, sort);

    try {
        // pool.query() führt die SQL-Query aus.
        // params = die Werte für $1, $2 etc. (werden sicher escaped, kein SQL-Injection-Risiko)
        // result.rows = Array der gefundenen Datensätze als JavaScript-Objekte
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/:id - Single recipe
app.get('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;

    const query = buildRecipeQuery(['r.id = $1']);

    try {
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/tags - List all tags
app.get('/api/tags', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM tags ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/recipes - Create recipe (auth required)
app.post('/api/recipes', authLimiter, requireAuth, async (req, res) => {
    const { title, description, instruction, img, calories, servings, duration, tags, ingredients } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    // pool.connect() holt eine dedizierte Verbindung aus dem Pool.
    // Nötig für Transaktionen, weil BEGIN/COMMIT auf derselben Verbindung laufen müssen.
    const client = await pool.connect();

    try {
        // BEGIN = startet eine Transaktion.
        // Alle folgenden Queries werden erst wirksam wenn COMMIT kommt.
        // Falls ein Fehler auftritt, macht ROLLBACK alles rückgängig.
        // So landet nie ein halbes Rezept (ohne Tags/Zutaten) in der DB.
        await client.query('BEGIN');

        // RETURNING id = gibt die automatisch generierte ID des neuen Datensatzes zurück
        const result = await client.query(
            `INSERT INTO recipes (title, description, instruction, img, calories, servings, duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [title, description || null, instruction || null, img || null, calories || null, servings || null, duration || null]
        );

        const recipeId = result.rows[0].id;
        await saveRecipeRelations(client, recipeId, tags, ingredients);
        await client.query('COMMIT');

        // Das fertige Rezept mit allen Tags/Zutaten laden und zurückgeben
        const recipe = await pool.query(buildRecipeQuery(['r.id = $1']), [recipeId]);
        res.status(201).json(recipe.rows[0]);
    } catch (err) {
        // ROLLBACK = macht alle Änderungen seit BEGIN rückgängig
        await client.query('ROLLBACK');
        console.error('Create recipe error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        // client.release() gibt die Verbindung zurück an den Pool
        client.release();
    }
});

// PUT /api/recipes/:id - Update recipe (auth required)
app.put('/api/recipes/:id', authLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title, description, instruction, img, calories, servings, duration, tags, ingredients } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE recipes SET title = $1, description = $2, instruction = $3, img = $4, calories = $5, servings = $6, duration = $7
             WHERE id = $8
             RETURNING id`,
            [title, description || null, instruction || null, img || null, calories || null, servings || null, duration || null, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recipe not found' });
        }

        await saveRecipeRelations(client, id, tags, ingredients);
        await client.query('COMMIT');

        const recipe = await pool.query(buildRecipeQuery(['r.id = $1']), [id]);
        res.json(recipe.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update recipe error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE /api/recipes/:id - Delete recipe (auth required)
app.delete('/api/recipes/:id', authLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        // RETURNING id = gibt die ID zurück, damit wir prüfen können ob etwas gelöscht wurde.
        // Durch ON DELETE CASCADE in der Tabellendefinition (init.sql) werden
        // die Einträge in recipe_tags und recipe_ingredients automatisch mitgelöscht.
        const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json({ message: 'Recipe deleted' });
    } catch (err) {
        console.error('Delete recipe error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fallback: serve index.html for SPA routing
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
