# MX Intelligence — Development Plan

Personal intelligence platform: curated daily briefs, articles, and videos with Supabase auth and a modern dark UI.

**Stack:** React 18 + Vite + TypeScript · Supabase (Auth, Postgres, Storage, Edge Functions) · React Router · Tailwind CSS (or CSS variables)

---

## 1. Project Goals

| Goal | Success criteria |
|------|------------------|
| Secure personal workspace | Email/password + optional OAuth; RLS on all user data |
| Daily Brief | One dashboard summarizing today's intelligence items |
| Content discovery | Dedicated Articles and Videos pages with filters |
| Polished UX | Consistent dark theme, responsive, fast loads |
| Maintainable codebase | Typed services, clear folder boundaries, env-based config |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React + Vite (SPA)                          │
│  Pages → Components → Hooks → Services → Supabase Client        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (anon key + user JWT)
┌────────────────────────────▼────────────────────────────────────┐
│                        Supabase                                 │
│  Auth │ Postgres (RLS) │ Storage │ Edge Functions (optional)      │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow

1. User signs in → Supabase Auth issues JWT.
2. `AuthProvider` holds session; `supabase` client attaches JWT to requests.
3. Pages call service layer (`articleService`, `videoService`, `briefService`).
4. Postgres RLS ensures users only read/write their rows (or shared public content).
5. Optional: Edge Function aggregates Daily Brief from articles/videos + user preferences.

### Routing

| Route | Page | Auth |
|-------|------|------|
| `/login` | Login | Public |
| `/signup` | Sign up | Public |
| `/` | Daily Brief (dashboard) | Protected |
| `/articles` | Articles | Protected |
| `/videos` | Videos | Protected |
| `/settings` | User settings (phase 2) | Protected |

---

## 3. Folder Structure

```
MX-Intelligence/
├── docs/                          # Planning & architecture (this file)
│   ├── DEVELOPMENT_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── ROADMAP.md
├── public/                        # Static assets (favicon, og images)
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── icons/
│   ├── components/
│   │   ├── layout/                # AppShell, Sidebar, Header, PageContainer
│   │   ├── ui/                    # Button, Card, Input, Badge, Skeleton, Modal
│   │   ├── auth/                  # LoginForm, SignUpForm, AuthGuard
│   │   ├── dashboard/             # BriefHeader, BriefSection, QuickStats
│   │   ├── articles/              # ArticleCard, ArticleList, ArticleFilters
│   │   ├── videos/                # VideoCard, VideoGrid, VideoFilters
│   │   └── common/                # EmptyState, ErrorBoundary, LoadingSpinner
│   ├── contexts/
│   │   └── AuthContext.tsx        # Session + auth helpers
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useArticles.ts
│   │   ├── useVideos.ts
│   │   └── useDailyBrief.ts
│   ├── lib/
│   │   ├── supabase.ts            # Singleton client
│   │   └── constants.ts           # Routes, theme tokens
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignUpPage.tsx
│   │   ├── DailyBriefPage.tsx
│   │   ├── ArticlesPage.tsx
│   │   └── VideosPage.tsx
│   ├── services/
│   │   ├── authService.ts
│   │   ├── articleService.ts
│   │   ├── videoService.ts
│   │   └── briefService.ts
│   ├── styles/
│   │   ├── globals.css            # Dark theme CSS variables
│   │   └── tokens.css             # Color/spacing tokens
│   ├── types/
│   │   ├── database.ts            # Generated from Supabase
│   │   ├── article.ts
│   │   ├── video.ts
│   │   └── brief.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/
│   ├── migrations/                # SQL migrations
│   └── seed/                      # Seed data for dev
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 4. Pages — Responsibilities

### LoginPage / SignUpPage
- Email + password forms with validation.
- Redirect to `/` on success; show Supabase error messages.
- Link between login and signup.

### DailyBriefPage (dashboard)
- Hero: date, greeting, optional streak/read count.
- Sections: "Top articles today", "Videos to watch", "Saved for later" (phase 2).
- Pulls from `briefService.getDailyBrief()` or composes from articles + videos queries.

### ArticlesPage
- List/grid of article cards (title, source, summary, tags, read time).
- Filters: date range, tags, source, read/unread.
- Optional: mark read, open external URL.

### VideosPage
- Grid of video cards (thumbnail, title, duration, channel).
- Filters: tags, duration, watched/unwatched.
- Open YouTube/external link or embed (phase 2).

---

## 5. Components — Inventory

### Layout
| Component | Purpose |
|-----------|---------|
| `AppShell` | Sidebar + main content wrapper |
| `Sidebar` | Nav: Brief, Articles, Videos, Settings |
| `Header` | Page title, user menu, logout |
| `PageContainer` | Consistent padding and max-width |

### UI primitives
| Component | Purpose |
|-----------|---------|
| `Button`, `Input`, `Card`, `Badge` | Base design system |
| `Skeleton` | Loading placeholders |
| `Modal` | Confirmations (phase 2) |

### Feature
| Component | Purpose |
|-----------|---------|
| `BriefSection` | Titled list block on dashboard |
| `ArticleCard`, `ArticleList`, `ArticleFilters` | Articles feature |
| `VideoCard`, `VideoGrid`, `VideoFilters` | Videos feature |
| `AuthGuard` | Redirect unauthenticated users |
| `EmptyState`, `ErrorBoundary` | UX resilience |

---

## 6. Services & Hooks

| Layer | Responsibility |
|-------|----------------|
| `lib/supabase.ts` | Create client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `authService` | `signIn`, `signUp`, `signOut`, `getSession` |
| `articleService` | `list`, `getById`, `markRead` (CRUD aligned with RLS) |
| `videoService` | `list`, `getById`, `markWatched` |
| `briefService` | `getDailyBrief(userId, date)` — query or Edge Function |
| Hooks | Wrap services with React state, loading/error, cache keys |

---

## 7. Dark UI Design System

- **Background:** `#0f0f12` (base), `#16161d` (surface), `#1e1e28` (elevated).
- **Text:** `#f4f4f5` (primary), `#a1a1aa` (muted).
- **Accent:** Single brand color (e.g. `#6366f1` indigo) for CTAs and active nav.
- **Borders:** `#27272a` subtle dividers.
- Typography: system stack or Inter; 16px base; clear hierarchy (h1 28–32px).
- Cards: rounded-lg, subtle border, no heavy shadows.
- Responsive: sidebar collapses to bottom nav or hamburger on `< md`.

Implementation: CSS variables in `tokens.css`, consumed by Tailwind or plain CSS modules.

---

## 8. Environment & Config

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit real keys. Use Supabase dashboard for URL and anon key.

---

## 9. Security Checklist

- [ ] RLS enabled on every table
- [ ] Anon key only in frontend; service role only in Edge Functions / CI
- [ ] Auth routes excluded from protected layout
- [ ] Validate redirects after login (no open redirects)
- [ ] HTTPS in production

---

## 10. Testing Strategy (when implementing)

| Area | Approach |
|------|----------|
| Services | Unit tests with mocked Supabase client |
| Hooks | React Testing Library |
| Critical paths | E2E: login → view brief → open article (Playwright) |

---

## 11. Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams, auth flow, state management
- [DATABASE.md](./DATABASE.md) — schema, RLS policies, migrations
- [ROADMAP.md](./ROADMAP.md) — phased delivery timeline
