'use strict';

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

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

// Base query to select recipes with tags and ingredients
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
            COALESCE(
                json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
                '[]'
            ) AS tags,
            COALESCE(
                json_agg(
                    json_build_object('name', i.name, 'amount', ri.amount, 'unit', ri.unit)
                    ORDER BY i.name
                ) FILTER (WHERE i.name IS NOT NULL),
                '[]'
            ) AS ingredients
        FROM recipes r
        LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
        LEFT JOIN tags t ON t.id = rt.tag_id
        LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        LEFT JOIN ingredients i ON i.id = ri.ingredient_id
    `;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id';

    if (sort) {
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

// Helper: insert or get ingredient ID
const getOrCreateIngredient = async (client, name) => {
    const result = await client.query(
        'INSERT INTO ingredients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name]
    );
    return result.rows[0].id;
};

// Helper: insert or get tag ID
const getOrCreateTag = async (client, name) => {
    const result = await client.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [name]
    );
    return result.rows[0].id;
};

// Helper: save tags and ingredients for a recipe
const saveRecipeRelations = async (client, recipeId, tags, ingredients) => {
    // Clear existing relations
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

    // Insert tags
    if (tags && tags.length > 0) {
        for (const tagName of tags) {
            const tagId = await getOrCreateTag(client, tagName);
            await client.query(
                'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [recipeId, tagId]
            );
        }
    }

    // Insert ingredients
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

// GET /api/recipes - List all recipes with optional filter, search, sort
app.get('/api/recipes', async (req, res) => {
    const { search, category, sort } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`r.title ILIKE $${params.length}`);
    }

    if (category && category !== 'all') {
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
app.post('/api/recipes', requireAuth, async (req, res) => {
    const { title, description, instruction, img, calories, servings, duration, tags, ingredients } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO recipes (title, description, instruction, img, calories, servings, duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [title, description || null, instruction || null, img || null, calories || null, servings || null, duration || null]
        );

        const recipeId = result.rows[0].id;
        await saveRecipeRelations(client, recipeId, tags, ingredients);
        await client.query('COMMIT');

        const recipe = await pool.query(buildRecipeQuery(['r.id = $1']), [recipeId]);
        res.status(201).json(recipe.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create recipe error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT /api/recipes/:id - Update recipe (auth required)
app.put('/api/recipes/:id', requireAuth, async (req, res) => {
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
app.delete('/api/recipes/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
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
