-- DEV ONLY. Generated wrappers apply schema AND backfill in a single transaction.
-- Do not apply this schema fragment alone, or run either wrapper in Production.
do $$ begin
  if (select count(*) from public.catalog_revisions) <> 1 or not exists (
    select 1 from public.catalog_revisions where id = '1af5506c-c723-5d6d-a341-93815d0205e2'
      and status = 'draft' and published_at is null and published_by is null
      and source_commit = 'e06efe7ea936e20a38fa85c674c2e73697f67dc7'
  ) then raise exception 'Expected single unpublished HGI DEV draft unavailable'; end if;
end $$;

alter table public.grid_patterns add column if not exists lite_count integer;
alter table public.grid_patterns add column if not exists orientation text;
alter table public.grid_colors add column if not exists primary_hex_color text;
alter table public.grid_colors add column if not exists secondary_hex_color text;
alter table public.glass_coatings add column if not exists coating_kind text;
alter table public.allowed_grid_combinations add column if not exists pattern_selection_mode text;
alter table public.allowed_grid_combinations alter column grid_pattern_id drop not null;

create table if not exists public.grid_locations (
  id uuid primary key,
  catalog_revision_id uuid not null references public.catalog_revisions(id) on delete restrict,
  legacy_id text not null check (legacy_id in ('external', 'internal', 'sdl')),
  display_name text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  unique (catalog_revision_id, legacy_id)
);
create table if not exists public.grid_combination_locations (
  id uuid primary key,
  catalog_revision_id uuid not null references public.catalog_revisions(id) on delete restrict,
  grid_combination_id uuid not null references public.allowed_grid_combinations(id) on delete restrict,
  grid_location_id uuid not null references public.grid_locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (grid_combination_id, grid_location_id)
);
create table if not exists public.grid_combination_coatings (
  id uuid primary key,
  catalog_revision_id uuid not null references public.catalog_revisions(id) on delete restrict,
  grid_combination_id uuid not null references public.allowed_grid_combinations(id) on delete restrict,
  glass_coating_id uuid not null references public.glass_coatings(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (grid_combination_id, glass_coating_id)
);
alter table public.grid_combination_assets add column if not exists grid_location_id uuid references public.grid_locations(id) on delete restrict;

-- Preserve the Phase 2 revision boundary and admin-only RLS foundation.
do $$ declare t text; begin
  foreach t in array array['grid_locations', 'grid_combination_locations', 'grid_combination_coatings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists "Home Guard admins can read" on public.%I', t);
    execute format('create policy "Home Guard admins can read" on public.%I for select to authenticated using (exists (select 1 from public.home_guard_admins where user_id = (select auth.uid())))', t);
    execute format('drop policy if exists "Home Guard admins can insert" on public.%I', t);
    execute format('create policy "Home Guard admins can insert" on public.%I for insert to authenticated with check (exists (select 1 from public.home_guard_admins where user_id = (select auth.uid())))', t);
    execute format('drop policy if exists "Home Guard admins can update" on public.%I', t);
    execute format('create policy "Home Guard admins can update" on public.%I for update to authenticated using (exists (select 1 from public.home_guard_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.home_guard_admins where user_id = (select auth.uid())))', t);
  end loop;
end $$;

drop trigger if exists grid_location_parent_revision on public.grid_combination_locations;
create trigger grid_location_parent_revision before insert or update on public.grid_combination_locations for each row execute function public.enforce_catalog_revision_fk('allowed_grid_combinations', 'grid_combination_id');
drop trigger if exists grid_location_dimension_revision on public.grid_combination_locations;
create trigger grid_location_dimension_revision before insert or update on public.grid_combination_locations for each row execute function public.enforce_catalog_revision_fk('grid_locations', 'grid_location_id');
drop trigger if exists grid_coating_parent_revision on public.grid_combination_coatings;
create trigger grid_coating_parent_revision before insert or update on public.grid_combination_coatings for each row execute function public.enforce_catalog_revision_fk('allowed_grid_combinations', 'grid_combination_id');
drop trigger if exists grid_coating_dimension_revision on public.grid_combination_coatings;
create trigger grid_coating_dimension_revision before insert or update on public.grid_combination_coatings for each row execute function public.enforce_catalog_revision_fk('glass_coatings', 'glass_coating_id');
drop trigger if exists grid_asset_location_revision on public.grid_combination_assets;
create trigger grid_asset_location_revision before insert or update on public.grid_combination_assets for each row execute function public.enforce_catalog_revision_fk('grid_locations', 'grid_location_id');

-- Final constraints are installed after the deterministic data backfill.
-- Keep UI evaluation/defaults and rendering algorithms in application code.
comment on table public.grid_combination_locations is 'Explicit eligibility locations; independent of notes and artwork existence.';
comment on table public.grid_combination_coatings is 'Atomic coating eligibility; no runtime parsing of label disjunctions.';
