'use strict';

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Fallback: serve index.html for SPA routing
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
