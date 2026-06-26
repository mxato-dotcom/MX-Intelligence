-- MX Intelligence: in-app intelligence alerts

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null default 'info',
  category text,
  related_brief_id uuid,
  related_article_id uuid,
  related_entity text,
  status text not null default 'unread',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.alerts add column if not exists user_id uuid references public.profiles (id) on delete cascade;
alter table public.alerts add column if not exists severity text not null default 'info';
alter table public.alerts add column if not exists category text;
alter table public.alerts add column if not exists related_brief_id uuid;
alter table public.alerts add column if not exists related_article_id uuid;
alter table public.alerts add column if not exists related_entity text;
alter table public.alerts add column if not exists status text not null default 'unread';
alter table public.alerts add column if not exists read_at timestamptz;

alter table public.alerts drop constraint if exists alerts_severity_check;
alter table public.alerts
  add constraint alerts_severity_check
  check (severity in ('info', 'low', 'medium', 'high', 'critical'));

alter table public.alerts drop constraint if exists alerts_status_check;
alter table public.alerts
  add constraint alerts_status_check
  check (status in ('unread', 'read', 'archived'));

create index if not exists alerts_user_created_at_idx
  on public.alerts (user_id, created_at desc);

create index if not exists alerts_user_status_idx
  on public.alerts (user_id, status);

alter table public.alerts enable row level security;

drop policy if exists "Users can select own alerts" on public.alerts;
create policy "Users can select own alerts"
  on public.alerts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own alerts" on public.alerts;
create policy "Users can insert own alerts"
  on public.alerts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own alerts" on public.alerts;
create policy "Users can update own alerts"
  on public.alerts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own alerts" on public.alerts;
create policy "Users can delete own alerts"
  on public.alerts
  for delete
  to authenticated
  using (auth.uid() = user_id);
