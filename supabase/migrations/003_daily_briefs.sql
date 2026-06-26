-- MX Intelligence: daily intelligence briefings

create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  executive_summary text not null default '',
  risk_level text not null default 'Low',
  importance_score integer not null default 0 check (importance_score >= 0 and importance_score <= 100),
  article_count integer not null default 0,
  cluster_count integer not null default 0,
  entity_count integer not null default 0,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  brief_data jsonb not null default '{}'::jsonb
);

alter table public.daily_briefs add column if not exists summary text not null default '';
alter table public.daily_briefs add column if not exists executive_summary text not null default '';
alter table public.daily_briefs add column if not exists risk_level text not null default 'Low';
alter table public.daily_briefs add column if not exists importance_score integer not null default 0;
alter table public.daily_briefs add column if not exists article_count integer not null default 0;
alter table public.daily_briefs add column if not exists cluster_count integer not null default 0;
alter table public.daily_briefs add column if not exists entity_count integer not null default 0;
alter table public.daily_briefs add column if not exists generated_at timestamptz not null default now();
alter table public.daily_briefs add column if not exists brief_data jsonb not null default '{}'::jsonb;

create index if not exists daily_briefs_generated_at_idx
  on public.daily_briefs (generated_at desc);

alter table public.daily_briefs enable row level security;

create policy "Authenticated users can read daily briefs"
  on public.daily_briefs
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert daily briefs"
  on public.daily_briefs
  for insert
  to authenticated
  with check (true);
