alter table logo_assets
  add column if not exists has_alpha boolean not null default false;
