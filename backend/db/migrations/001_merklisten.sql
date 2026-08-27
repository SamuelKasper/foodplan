-- Migration fuer bestehende Foodplan-Datenbanken.
CREATE TABLE IF NOT EXISTS merklisten (
    code VARCHAR(4) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE merklisten
    ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS merkliste_rezepte (
    merkliste_code VARCHAR(4) NOT NULL REFERENCES merklisten(code) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (merkliste_code, recipe_id)
);
