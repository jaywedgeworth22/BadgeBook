-- Cache company identity lookups (name / phone → domain) so Crest does not
-- re-query Wikipedia, Wikidata, or name search for the same card.

create table if not exists identity_resolves (
  cache_key  text primary key,
  domain     text,
  source     text not null,
  label      text,
  created_at timestamptz not null default now()
);

create index if not exists identity_resolves_domain_idx
  on identity_resolves (domain);
