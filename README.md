# Logbench

Logbench is a Loggly frontend and log archival service built with TanStack Start, React, and Prisma + PostgreSQL.

It provides a UI to browse, search, and inspect logs synced from your [Loggly](https://www.loggly.com/) account, while storing them locally in PostgreSQL for unlimited history beyond Loggly's 30-day retention.

## Features

- **Loggly integration** – sync logs from Loggly's Search API and archive them locally
- Project-based log organization
- Real-time log updates via Server-Sent Events (SSE)
- JSON log payload rendering with level badges
- Fast in-table log search with keyboard shortcut (`Cmd/Ctrl + F`)
- Local PostgreSQL storage through Prisma for infinite history
- Direct log ingestion via POST API (still supported)

## Tech Stack

- TanStack Start + TanStack Router
- React + React Query
- Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui
- Vite

## Getting Started

### Prerequisites

- Bun (recommended) or npm
- Node.js 20+
- PostgreSQL database

### Install

```bash
bun install
```

### Configure Environment

Create a `.env` file with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/logbench"
```

### Prepare Database

```bash
bunx prisma generate
bunx prisma db push
```

This creates/updates the PostgreSQL database schema based on `prisma/schema.prisma`.

### Run Development Server

```bash
bun run dev
```

App runs on `http://localhost:1447`.

## Loggly Setup

1. Create a project in the sidebar
2. Open the project, then click the **⋯** menu → **Loggly Settings**
3. Enter your Loggly **subdomain**, **API token**, and optional **tag** filter
4. Click **Sync from Loggly** in the header to fetch and archive logs

Logs are stored locally in PostgreSQL, giving you unlimited history beyond Loggly's 30-day retention window.

You can find your Loggly API token under **Source Setup > Customer Tokens** in the Loggly web UI. For the Search API, refer to the [Loggly API documentation](https://documentation.solarwinds.com/en/success_center/loggly/content/admin/api-overview.htm).

## Scripts

- `bun run dev` - start local dev server
- `bun run build` - build production bundle
- `bun run preview` - preview production build
- `bun run test` - run Vitest test suite
- `bun run lint` - run ESLint
- `bun run format` - run Prettier
- `bun run check` - run Prettier write + ESLint fix

## API Endpoints

### Projects

- `GET /api/projects` - list projects
- `POST /api/projects` - create project (`{ "title": "My Project", "logglySubdomain": "...", "logglyToken": "...", "logglyTag": "..." }`)
- `GET /api/projects/:projectId` - get a single project
- `PATCH /api/projects/:projectId` - update project (Loggly settings, title)

### Logs

- `GET /api/projects/:projectId/logs` - list logs for a project (newest first)
- `GET /api/projects/:projectId/logs/:logId` - get one log
- `DELETE /api/projects/:projectId/logs/:logId` - delete one log

### Loggly Sync

- `POST /api/projects/:projectId/logs/sync` - sync logs from Loggly into local DB
  - Optional body: `{ "query": "*", "from": "-24h", "until": "now" }`

### Ingestion + Live Stream

- `POST /api/projects/:projectId/logs/ingest` - ingest a log payload (`{ "content": ... }`)
- `GET /api/projects/:projectId/logs/ingest?stream=1` - subscribe to SSE events

Example ingest request:

```bash
curl -X POST "http://localhost:1447/api/projects/<projectId>/logs/ingest" \
  -H "Content-Type: application/json" \
  -d '{"content":{"message":"Hello from curl","level":"INFO"}}'
```

## Notes

- Logs synced from Loggly are deduplicated by their Loggly event ID.
- PostgreSQL is used for persistent, unlimited log storage.
- Generated Prisma client is in `generated/prisma` and gitignored.
- The project header includes a "Copy POST URL" action for quickly sending logs from other local tools.
