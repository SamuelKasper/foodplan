# API Documentation

## Database Schema

```
recipes (id, title, description, instruction, calories, servings, duration)
├── recipe_tags (recipe_id, tag_id)
│   └── tags (id, name)
└── recipe_ingredients (recipe_id, ingredient_id, amount, unit)
    └── ingredients (id, name)

merklisten (code, created_at, modified_at)
└── merkliste_rezepte (merkliste_code, recipe_id, created_at)
```

## Endpoints

### Recipes

| Method | Path | Description | Authentication |
|---|---|---|---|
| `GET` | `/api/recipes` | List all recipes (filter, search, sort) | No |
| `GET` | `/api/recipes/:id` | Get single recipe by ID | No |
| `GET` | `/api/tags` | List all available tags | No |
| `POST` | `/api/recipes` | Create new recipe | Yes (`X-API-Key`) |
| `PUT` | `/api/recipes/:id` | Update existing recipe | Yes (`X-API-Key`) |
| `DELETE` | `/api/recipes/:id` | Delete recipe | Yes (`X-API-Key`) |

#### Query Parameters for `GET /api/recipes`

| Parameter | Example | Description |
|---|---|---|
| `search` | `?search=burger` | Search recipe title (case-insensitive) |
| `category` | `?category=vegetable` | Filter by tag/category |
| `sort` | `?sort=name_asc` | Sort results |

Available sorting options:
- `name_asc` / `name_desc` (Alphabetical by title)
- `duration_asc` / `duration_desc` (Cooking duration)
- `calories_asc` / `calories_desc` (Calories)

---

### Shared Wishlists (Weekplan)

The weekplan (`weekplan.html`) can be shared via a 4-character code. The code acts as the access key. Inactive wishlists are automatically removed after 7 days.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/merklisten/:code` | Fetch wishlist and recipes |
| `POST` | `/api/merklisten` | Create/initialize wishlist with 4-character code |
| `PUT` | `/api/merklisten/:code` | Update recipe IDs in wishlist |
