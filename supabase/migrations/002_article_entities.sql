-- MX Intelligence: article entity extraction storage

create table if not exists public.article_entities (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  entity_type text not null,
  entity_text text not null,
  normalized_text text not null,
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  created_at timestamptz not null default now()
);

create index if not exists article_entities_article_id_idx
  on public.article_entities (article_id);

create index if not exists article_entities_normalized_text_idx
  on public.article_entities (normalized_text);

create index if not exists article_entities_entity_type_idx
  on public.article_entities (entity_type);

alter table public.article_entities enable row level security;

create policy "Authenticated users can read article entities"
  on public.article_entities
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert article entities"
  on public.article_entities
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete article entities"
  on public.article_entities
  for delete
  to authenticated
  using (true);
