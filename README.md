# Database Migration Automator

A simple backend tool that safely applies and rolls back versioned **MySQL database migrations**. It provides a command-line interface for developers and REST endpoints that a React admin dashboard can call.

## Internship details

| Field | Value |
| --- | --- |
| Intern ID | **CITS3714** |
| Role | **Backend Developer Intern** |
| Stack | **MERN backend (Node.js/Express) + MySQL** |

## Why this project matters

Database structure changes over time: tables may be created, columns added, or indexes updated. Running these changes manually is error-prone, especially when multiple developers work on the same project.

This application stores each change as a numbered SQL migration file and records completed versions in MySQL. Therefore, each environment receives the same schema changes exactly once.

## Features

- Versioned SQL migrations, applied in order
- `up` command to apply every pending migration
- `down` command to safely roll back the most recently applied migration
- `status` command to view applied and pending versions
- `schema_migrations` history table created automatically
- MySQL transactions: a failed migration is rolled back
- Express REST API for a future React admin interface

## Project structure

```text
database-migration-automator/
├── migrations/                 # SQL schema changes
│   ├── 001_create_users.up.sql
│   ├── 001_create_users.down.sql
│   ├── 002_create_posts.up.sql
│   └── 002_create_posts.down.sql
├── src/
│   ├── cli.js                  # Command-line entry point
│   ├── database.js             # MySQL connection pool
│   ├── migrationService.js     # Core migration logic
│   └── server.js               # Express API
├── .env.example
└── package.json
```

## Setup

1. Create a MySQL database:

   ```sql
   CREATE DATABASE migration_demo;
   ```

2. Install project packages:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`, then add your MySQL credentials.

4. Apply migrations:

   ```bash
   npm run migrate:up
   ```

## Commands

| Command | What it does |
| --- | --- |
| `npm run migrate:up` | Applies all migrations not yet recorded in `schema_migrations` |
| `npm run migrate:down` | Rolls back only the latest applied migration |
| `npm run migrate:status` | Displays every migration as `applied` or `pending` |
| `npm start` | Starts the Express API on port 3000 |

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/migrations/status` | Migration status for a React dashboard |
| POST | `/api/migrations/up` | Applies pending migrations |
| POST | `/api/migrations/down` | Rolls back the latest migration |

## How it works

1. The tool reads every `*.up.sql` file from `migrations/` in version order.
2. It compares those versions against MySQL's `schema_migrations` table.
3. Each pending SQL file runs inside a transaction.
4. After success, the version is inserted into `schema_migrations`.
5. On failure, the transaction is rolled back and the migration remains pending.

## Adding a new migration

Create a matching pair of files, using the next number:

```text
migrations/003_add_user_phone.up.sql
migrations/003_add_user_phone.down.sql
```

Example `up`:

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

Example `down`:

```sql
ALTER TABLE users DROP COLUMN phone;
```

Then run `npm run migrate:up`.
