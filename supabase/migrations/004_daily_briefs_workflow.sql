-- MX Intelligence: brief review & publishing workflow

alter table public.daily_briefs add column if not exists status text not null default 'draft';
alter table public.daily_briefs add column if not exists reviewed_at timestamptz;
alter table public.daily_briefs add column if not exists published_at timestamptz;
alter table public.daily_briefs add column if not exists archived_at timestamptz;

alter table public.daily_briefs drop constraint if exists daily_briefs_status_check;
alter table public.daily_briefs
  add constraint daily_briefs_status_check
  check (status in ('draft', 'reviewed', 'published', 'archived'));

create index if not exists daily_briefs_status_generated_at_idx
  on public.daily_briefs (status, generated_at desc);

drop policy if exists "Authenticated users can update daily briefs" on public.daily_briefs;
create policy "Authenticated users can update daily briefs"
  on public.daily_briefs
  for update
  to authenticated
  using (true)
  with check (true);
