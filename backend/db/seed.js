'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'foodplan',
    password: process.env.DB_PASSWORD || 'foodplan',
    database: process.env.DB_NAME || 'foodplan',
});

// Parse ingredient string like "2 Dosen Kidney Bohnen" into { amount, unit, name }
const parseIngredient = (str) => {
    const match = str.match(/^([\d.,/]+)\s+(\S+)\s+(.+)$/);
    if (match) {
        return { amount: match[1], unit: match[2], name: match[3] };
    }

    const matchAmountOnly = str.match(/^([\d.,/]+)\s+(.+)$/);
    if (matchAmountOnly) {
        return { amount: matchAmountOnly[1], unit: null, name: matchAmountOnly[2] };
    }

    return { amount: null, unit: null, name: str };
};

// Tag name mapping from JSON keys to German display names
const tagNameMap = {
    vegetable: 'Gemüse',
    noodle: 'Nudeln',
    rice: 'Reis',
    lentils: 'Linsen',
    meat: 'Fleisch',
    salad: 'Salat',
    other: 'Anderes',
    sweets: 'Süßes',
};

const seed = async () => {
    const recipesPath = path.join(__dirname, '..', '..', 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query('DELETE FROM recipe_tags');
        await client.query('DELETE FROM recipe_ingredients');
        await client.query('DELETE FROM recipes');
        await client.query('DELETE FROM ingredients');
        await client.query('DELETE FROM tags');
        await client.query('ALTER SEQUENCE recipes_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE ingredients_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE tags_id_seq RESTART WITH 1');

        // Pre-seed all tags
        const tagIds = {};
        for (const key of Object.keys(tagNameMap)) {
            const result = await client.query(
                'INSERT INTO tags (name) VALUES ($1) RETURNING id',
                [key]
            );
            tagIds[key] = result.rows[0].id;
        }

        // Cache for ingredient deduplication
        const ingredientIds = {};

        for (const recipe of recipes) {
            // Build servings string
            const servings = recipe.serving && recipe.serving_unit
                ? `${recipe.serving} ${recipe.serving_unit}`
                : recipe.serving
                    ? String(recipe.serving)
                    : null;

            const result = await client.query(
                `INSERT INTO recipes (title, description, instruction, img, calories, servings, duration)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    recipe.name,
                    null,
                    recipe.description || null,
                    recipe.img || null,
                    recipe.calories_in_kcal || null,
                    servings,
                    recipe.duration_in_min || null,
                ]
            );

            const recipeId = result.rows[0].id;

            // Insert tags (only active ones)
            if (recipe.tags) {
                for (const [tagName, active] of Object.entries(recipe.tags)) {
                    if (active && tagIds[tagName]) {
                        await client.query(
                            'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)',
                            [recipeId, tagIds[tagName]]
                        );
                    }
                }
            }

            // Insert ingredients
            if (recipe.ingredients) {
                for (const raw of Object.values(recipe.ingredients)) {
                    const parsed = parseIngredient(raw);

                    // Get or create ingredient
                    if (!ingredientIds[parsed.name]) {
                        const ingResult = await client.query(
                            'INSERT INTO ingredients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                            [parsed.name]
                        );
                        ingredientIds[parsed.name] = ingResult.rows[0].id;
                    }

                    await client.query(
                        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES ($1, $2, $3, $4)',
                        [recipeId, ingredientIds[parsed.name], parsed.amount, parsed.unit]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log(`Seeded ${recipes.length} recipes successfully.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

seed();
