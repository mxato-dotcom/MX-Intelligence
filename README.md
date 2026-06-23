# MX Intelligence

Personal intelligence platform — daily briefs, curated articles, and videos.

## Stack

- **Frontend:** React 18, Vite, TypeScript
- **Backend:** Supabase (Auth, Postgres, RLS)
- **UI:** Modern dark theme

## Status

**Phase 1 complete** — Supabase Auth with email sign up/in, protected routes, and profile creation.

## Quick start

```bash
# Install dependencies
npm install

# Copy environment template and add your Supabase credentials
cp .env.example .env

# Apply database migration in Supabase SQL Editor (see supabase/migrations/001_profiles.sql)

# Start development server (http://localhost:5173)
npm run dev
```

On Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Overview, folder structure, pages, components |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, auth flow, state management |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, RLS policies, migrations |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased development timeline |

## Planned Routes

| Route | Page |
|-------|------|
| `/login` | Login |
| `/signup` | Sign up |
| `/` | Daily Brief |
| `/articles` | Articles |
| `/videos` | Videos |

## Next Steps

1. Phase 2: Dark UI polish and layout components
2. See [docs/ROADMAP.md](docs/ROADMAP.md) for full timeline
