-- Shared brand-mark library. Logos are public marks, cached so Crest does not
-- re-hit Simple Icons / DuckDuckGo / Google / Wikimedia for the same domain.
-- Multiple rows per domain (one per source) so "try another" can cycle locally.

create table if not exists logo_assets (
  id           text primary key,
  domain       text not null,
  source       text not null,
  brand_name   text,
  content_type text not null,
  data_b64     text not null,
  byte_len     integer not null,
  asset_kind   text not null default 'icon',
  score        integer not null default 0,
  created_at   timestamptz not null default now(),
  last_hit_at  timestamptz not null default now(),
  hit_count    integer not null default 0
);

create unique index if not exists logo_assets_domain_source_uidx
  on logo_assets (domain, source);

create index if not exists logo_assets_domain_score_idx
  on logo_assets (domain, score desc);

-- Sources that already failed for a domain — skip them until the row ages out.
create table if not exists logo_misses (
  domain   text not null,
  source   text not null,
  tried_at timestamptz not null default now(),
  primary key (domain, source)
);
