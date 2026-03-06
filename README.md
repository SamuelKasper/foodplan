# Foodplan

Rezeptverwaltung mit Node.js Backend, PostgreSQL Datenbank und statischem Frontend.

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und Docker Compose

## Projekt starten

### 1. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Passe bei Bedarf die Werte in der `.env` an. Bei Sonderzeichen im Passwort den Wert in Anführungszeichen setzen:

```env
DB_PASSWORD="mein$icheres!Passwort#123"
```

### 2. Container starten

```bash
docker compose up -d
```

Das startet zwei Container:

- **backend** — Node.js Server auf Port 3000
- **db** — PostgreSQL 17 Datenbank

Beim ersten Start wird automatisch das Datenbankschema aus `backend/db/init.sql` erstellt.

### 3. Dependencies installieren

```bash
docker compose exec backend npm install
```

### 4. Datenbank mit Rezepten befuellen

```bash
docker compose exec backend node db/seed.js
```

Importiert alle Rezepte aus `recipes.json` in die Datenbank. Muss nur einmal ausgefuehrt werden.

### 5. App oeffnen

Die App laeuft unter [http://localhost:3000](http://localhost:3000).

## Deployment auf einem Server

### 1. Projekt auf den Server bringen

```bash
git clone <repo-url>
cd foodplan
```

### 2. `.env` erstellen

```bash
cp .env.example .env
```

Unbedingt ein sicheres Passwort setzen — nicht die lokalen Standardwerte verwenden.

### 3. Container starten und seeden

```bash
docker compose up -d
docker compose exec backend node db/seed.js
```

Die App laeuft dann unter Port 3000 auf dem Server.

## Weitere Befehle

### Container stoppen

```bash
docker compose down
```

### Container stoppen und Datenbank zuruecksetzen

```bash
docker compose down -v
```

Das `-v` Flag loescht das Datenbank-Volume. Beim naechsten `docker compose up -d` wird die DB neu initialisiert und muss erneut geseeded werden.

### Backup erstellen

```bash
./backup.sh
```

Erstellt einen SQL-Dump mit Zeitstempel im `backups/`-Ordner.

### Backup wiederherstellen

```bash
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < backups/dump_YYYY-MM-DD_HH-MM-SS.sql
```

## Projektstruktur

```
foodplan/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # Express API Server
│   └── db/
│       ├── init.sql            # Datenbankschema
│       └── seed.js             # Import aus recipes.json
├── public/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── svg/
├── docker-compose.yaml
├── backup.sh
├── recipes.json                # Quelldaten fuer den Seed
├── .env.example
└── .env                        # Nicht im Git
```

## Datenbankschema

```
recipes (id, title, description, instruction, calories, servings, duration)
├── recipe_tags (recipe_id, tag_id)
│   └── tags (id, name)
└── recipe_ingredients (recipe_id, ingredient_id, amount, unit)
    └── ingredients (id, name)
```

## API Endpoints

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/recipes` | Alle Rezepte (mit Filter, Suche, Sortierung) |
| GET | `/api/recipes/:id` | Einzelnes Rezept |

### Query-Parameter fuer `/api/recipes`

| Parameter | Beispiel | Beschreibung |
|-----------|----------|-------------|
| `search` | `?search=burger` | Suche nach Rezeptname |
| `category` | `?category=vegetable` | Filter nach Tag |
| `sort` | `?sort=name_asc` | Sortierung |

Verfuegbare Sortierungen: `name_asc`, `name_desc`, `duration_asc`, `duration_desc`, `calories_asc`, `calories_desc`
