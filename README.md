# Foodplan

Recipe management application with Node.js backend, PostgreSQL database, and PWA frontend.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (including Docker Compose)
- Git (e.g. Git Bash on Windows)

---

## Setup & Running Locally

### 1. Configure Environment Variables
Create a `.env` file in the project root with database credentials and API key:

```env
DB_USER=samuel
DB_PASSWORD=your_password
DB_NAME=foodplan
API_KEY=your_secret_api_key
```

### 2. Start Containers
Start the containers in detached mode:

```bash
docker compose up -d
```

> [!NOTE]
> The backend and database are now running in Docker. Do not run the initial seed (`seed.js`), as the live database is already active and contains current recipes. Use the down-sync script instead to populate your local database.

### 3. Open the Application
Once containers are running, access the application at:

- **Home & Recipe Filter**: [http://localhost:3000](http://localhost:3000)
- **Weekplan / Wishlist**: [http://localhost:3000/weekplan.html](http://localhost:3000/weekplan.html)
- **Recipe Management (Admin)**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

> [!TIP]
> **Admin Access:** To create, edit, or delete recipes in the admin panel, enter the `API_KEY` defined in your `.env` into the input field at the top of the admin page.

---

## PWA Installation (Mobile / Tablet)

Foodplan is a Progressive Web App (PWA) and can be installed on your home screen:
- **iOS (Safari):** Tap the Share button -> *Add to Home Screen*
- **Android (Chrome):** Tap the menu (three dots) -> *Install app* or *Add to Home screen*

---

## Scripts

Shell scripts (`.sh`) can be executed using Git Bash on Windows or terminal on Linux/macOS:

### 1. Sync Live Data Locally (`./down-sync.sh`)
Pulls the latest database state (recipes and wishlists) from the production server into your local Docker database:

```bash
./down-sync.sh
```

*(Requires SSH access to the server. Default credentials can be overridden via environment variables, e.g. `SERVER_USER=samu ./down-sync.sh`)*

### 2. Create Database Backup (`./backup.sh`)
Creates a timestamped SQL dump of the local database in the `backups/` folder:

```bash
./backup.sh
```

*Restore a backup:*
```bash
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < backups/dump_YYYY-MM-DD_HH-MM-SS.sql
```

### 3. Run Migrations (`./migrate.sh`)
Applies pending SQL migration files from `backend/db/migrations/` to the running database:

```bash
./migrate.sh
```

---

## Stop Containers

```bash
docker compose down
```

> [!WARNING]
> Run `docker compose down` without the `-v` flag to preserve your local database volume.

---

## Troubleshooting

### Recipes not loading on localhost (404 on `/api/recipes`)
If the web UI opens but recipes do not load and the browser console shows a 404 for `/api/recipes`, another service is likely occupying port 3000 (often the VS Code **Live Server** extension):
1. Stop Live Server (click *Port: 3000* in the VS Code status bar) or change its port setting to another port (e.g. `5500`).
2. Restart the backend container:
   ```bash
   docker compose restart backend
   ```

---

## Documentation

- For API endpoints, query parameters, and database schema, see the [API Documentation](docs/api.md).
