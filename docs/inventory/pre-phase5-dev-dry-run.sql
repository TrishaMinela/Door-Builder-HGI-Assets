-- HGI PORTAL DEV ONLY: udbcnpjtwhmjzpjjhoph. Verify SQL Editor project before running.
-- No publication. On ANY failure, the transaction rolls back schema and data.
BEGIN;

select pg_advisory_xact_lock(hashtext('hgi-pre-phase5-dev-cleanup'));
set local lock_timeout='10s';
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


-- Canonical JSON matches the JS plan: ASCII key ordering, compact recursive JSON.
create or replace function pg_temp.hgi_canonical(v jsonb) returns text language plpgsql as $$
declare result text; begin
 case jsonb_typeof(v)
 when 'object' then select '{'||coalesce(string_agg(to_jsonb(key)::text||':'||pg_temp.hgi_canonical(value),',' order by key collate "C"),'')||'}' into result from jsonb_each(v);
 when 'array' then select '['||coalesce(string_agg(pg_temp.hgi_canonical(value),',' order by ord),'')||']' into result from jsonb_array_elements(v) with ordinality x(value,ord);
 else result:=coalesce(v::text,'null'); end case;
 return result;
end $$;
create or replace function pg_temp.hgi_digest() returns text language sql as $$
 select encode(sha256(convert_to(pg_temp.hgi_canonical(jsonb_build_object('finishes',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','legacy_id',to_jsonb(r)->'legacy_id','display_name',to_jsonb(r)->'display_name','finish_type',to_jsonb(r)->'finish_type','hex_color',to_jsonb(r)->'hex_color','status',to_jsonb(r)->'status','customer_selectable',to_jsonb(r)->'customer_selectable','display_order',to_jsonb(r)->'display_order','notes',coalesce((to_jsonb(r)->>'notes')::jsonb,'{}'::jsonb)) order by id),'[]'::jsonb) from public.finishes r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'finish_assets',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','finish_id',to_jsonb(r)->'finish_id','asset_id',to_jsonb(r)->'asset_id','role',to_jsonb(r)->'role','display_order',to_jsonb(r)->'display_order') order by id),'[]'::jsonb) from public.finish_assets r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_patterns',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','legacy_id',to_jsonb(r)->'legacy_id','lite_count',to_jsonb(r)->'lite_count','orientation',to_jsonb(r)->'orientation','status',to_jsonb(r)->'status','customer_selectable',to_jsonb(r)->'customer_selectable') order by id),'[]'::jsonb) from public.grid_patterns r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_colors',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','legacy_id',to_jsonb(r)->'legacy_id','primary_hex_color',to_jsonb(r)->'primary_hex_color','secondary_hex_color',to_jsonb(r)->'secondary_hex_color') order by id),'[]'::jsonb) from public.grid_colors r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'glass_coatings',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','legacy_id',to_jsonb(r)->'legacy_id','coating_kind',to_jsonb(r)->'coating_kind') order by id),'[]'::jsonb) from public.glass_coatings r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'allowed_grid_combinations',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','glass_option_id',to_jsonb(r)->'glass_option_id','grid_profile_id',to_jsonb(r)->'grid_profile_id','grid_pattern_id',to_jsonb(r)->'grid_pattern_id','pattern_selection_mode',to_jsonb(r)->'pattern_selection_mode','grid_color_id',to_jsonb(r)->'grid_color_id','grid_width_id',to_jsonb(r)->'grid_width_id','width_selection_mode',to_jsonb(r)->'width_selection_mode','glass_coating_id',to_jsonb(r)->'glass_coating_id','customer_selectable',to_jsonb(r)->'customer_selectable','display_order',to_jsonb(r)->'display_order','notes',coalesce((to_jsonb(r)->>'notes')::jsonb,'{}'::jsonb)) order by id),'[]'::jsonb) from public.allowed_grid_combinations r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_locations',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','legacy_id',to_jsonb(r)->'legacy_id','display_name',to_jsonb(r)->'display_name','display_order',to_jsonb(r)->'display_order') order by id),'[]'::jsonb) from public.grid_locations r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_combination_locations',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','grid_combination_id',to_jsonb(r)->'grid_combination_id','grid_location_id',to_jsonb(r)->'grid_location_id') order by id),'[]'::jsonb) from public.grid_combination_locations r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_combination_coatings',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','grid_combination_id',to_jsonb(r)->'grid_combination_id','glass_coating_id',to_jsonb(r)->'glass_coating_id') order by id),'[]'::jsonb) from public.grid_combination_coatings r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid),'grid_combination_assets',(select coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(r)->'id','grid_combination_id',to_jsonb(r)->'grid_combination_id','asset_id',to_jsonb(r)->'asset_id','grid_location_id',to_jsonb(r)->'grid_location_id','role',to_jsonb(r)->'role','view_key',to_jsonb(r)->'view_key','display_order',to_jsonb(r)->'display_order') order by id),'[]'::jsonb) from public.grid_combination_assets r where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid))),'UTF8')),'hex');
$$;
do $$ declare actual text; begin
 if not exists(select 1 from public.catalog_revisions where id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and status='draft' and notes::jsonb->>'catalogChecksum'='70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c' and (notes::jsonb->>'cleanupChecksum' is null or notes::jsonb->>'cleanupChecksum'='4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac')) then raise exception 'Draft provenance mismatch'; end if;
 actual:=pg_temp.hgi_digest();
 if actual not in ('5e0fade4472b15f9aeb25470d4480975adca8556cadd9b98d14a5f30af6ecd26','4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac') then raise exception 'Catalog changed since plan; checksum %',actual; end if;
end $$;

-- Scope every mutation to this one unpublished revision. Keep all legacy IDs.
create temporary table hgi_paint_assets on commit drop as
 select distinct a.asset_id from public.finish_assets a join public.finishes f on f.id=a.finish_id where f.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and f.finish_type='paint';
delete from public.finish_assets a using public.finishes f where a.finish_id=f.id and f.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and f.finish_type='paint';
delete from public.assets a using hgi_paint_assets p where a.id=p.asset_id and a.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid
 and not exists(select 1 from public.door_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.glass_option_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.sidelite_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.hardware_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.finish_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.grid_combination_assets b where b.asset_id=a.id);
update public.finishes set notes=jsonb_set(notes::jsonb,'{source,image}','""'::jsonb)::text where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and finish_type='paint';

insert into public.grid_locations(id,catalog_revision_id,legacy_id,display_name,display_order) values
 ('31720c64-7688-818e-360e-b3f3b56b73c5'::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,'internal','Internal Grids',1),
 ('45edbf79-f87e-ce98-bae1-5d0ef6fceb27'::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,'external','External Grids',0),
 ('90c66c26-887e-4753-7c5d-ac03aab4ac39'::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,'sdl','SDL Grids',2) on conflict(id) do nothing;
insert into public.grid_combination_locations(id,catalog_revision_id,grid_combination_id,grid_location_id)
 select md5('1af5506c-c723-5d6d-a341-93815d0205e2:grid_combination_locations:'||c.id::text||':'||(context->>'location'))::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,c.id,l.id
 from public.allowed_grid_combinations c cross join lateral jsonb_array_elements(coalesce(c.notes::jsonb->'contexts','[]'::jsonb)) context
 join public.grid_locations l on l.catalog_revision_id=c.catalog_revision_id and l.legacy_id=context->>'location'
 where c.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid on conflict(id) do nothing;

update public.glass_coatings set coating_kind=case legacy_id when 'Standard / No Low-E' then 'standard' when 'Low-E' then 'low_e' when 'Low-E Plus' then 'low_e_plus' when 'ODL Clear' then 'odl_clear' else null end where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;
insert into public.grid_combination_coatings(id,catalog_revision_id,grid_combination_id,glass_coating_id)
 select md5('1af5506c-c723-5d6d-a341-93815d0205e2:grid_combination_coatings:'||c.id::text||':'||member.name)::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,c.id,atomic.id
 from public.allowed_grid_combinations c join public.glass_coatings old on old.id=c.glass_coating_id
 cross join lateral jsonb_array_elements_text('{"Standard / No Low-E":["Standard / No Low-E"],"Low-E":["Low-E"],"Low-E Plus":["Low-E Plus"],"ODL Clear":["ODL Clear"],"Standard / No Low-E or Low-E":["Standard / No Low-E","Low-E"],"Low-E or Low-E Plus":["Low-E","Low-E Plus"],"Standard / No Low-E, Low-E or Low-E Plus":["Standard / No Low-E","Low-E","Low-E Plus"]}'::jsonb->old.legacy_id) member(name)
 join public.glass_coatings atomic on atomic.catalog_revision_id=c.catalog_revision_id and atomic.legacy_id=member.name
 where c.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid on conflict(id) do nothing;

update public.grid_patterns set lite_count=substring(legacy_id from '^([0-9]+) Lite')::integer,orientation=case when legacy_id like '% Horizontal' then 'horizontal' else null end,status=case when legacy_id='__no_pattern_selection__' then 'legacy_only' else status end where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;
update public.grid_colors set primary_hex_color=case when legacy_id='Bronze/White' then '#6f4b32' else hex_color end,secondary_hex_color=case when legacy_id='Bronze/White' then '#f4f4ef' else null end where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;
update public.allowed_grid_combinations c set pattern_selection_mode=case when c.grid_pattern_id is null or (select legacy_id from public.grid_patterns where id=c.grid_pattern_id)='__no_pattern_selection__' then 'none' when profile.legacy_id='Prairie' and g.scope='sidelite' then 'implicit' else 'selectable' end,grid_pattern_id=case when (select legacy_id from public.grid_patterns where id=c.grid_pattern_id)='__no_pattern_selection__' then null else c.grid_pattern_id end,notes=(c.notes::jsonb-'contexts')::text
 from public.glass_options g,public.grid_profiles profile where g.id=c.glass_option_id and profile.id=c.grid_profile_id and c.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;
-- The nullable pattern needs a LEFT JOIN in a separate UPDATE for pre-cleanup rows.
update public.allowed_grid_combinations c set pattern_selection_mode='none',grid_pattern_id=null from public.grid_patterns p where p.id=c.grid_pattern_id and p.legacy_id='__no_pattern_selection__' and c.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;
update public.grid_combination_assets a set grid_location_id=l.id from public.grid_locations l where l.catalog_revision_id=a.catalog_revision_id and l.legacy_id=a.view_key and a.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid;

alter table public.allowed_grid_combinations alter column pattern_selection_mode set not null;
alter table public.allowed_grid_combinations drop constraint if exists grid_pattern_selection_semantics;
alter table public.allowed_grid_combinations add constraint grid_pattern_selection_semantics check(pattern_selection_mode in ('none','implicit','selectable') and ((pattern_selection_mode='none')=(grid_pattern_id is null)));
drop index if exists public.allowed_grid_combinations_unique_idx;
create unique index allowed_grid_combinations_unique_idx on public.allowed_grid_combinations(catalog_revision_id,glass_option_id,grid_profile_id,coalesce(grid_pattern_id,'00000000-0000-0000-0000-000000000000'::uuid),grid_color_id,coalesce(grid_width_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(glass_coating_id,'00000000-0000-0000-0000-000000000000'::uuid));
alter table public.grid_patterns drop constraint if exists grid_numeric_pattern_semantics;
alter table public.grid_patterns add constraint grid_numeric_pattern_semantics check((lite_count is null or lite_count>0) and (orientation is null or orientation='horizontal'));
alter table public.grid_colors drop constraint if exists grid_color_components;
alter table public.grid_colors add constraint grid_color_components check((primary_hex_color is null or primary_hex_color ~ '^#[0-9a-fA-F]{6}$') and (secondary_hex_color is null or secondary_hex_color ~ '^#[0-9a-fA-F]{6}$') and (secondary_hex_color is null or primary_hex_color is not null));
alter table public.glass_coatings drop constraint if exists grid_coating_kind;
alter table public.glass_coatings add constraint grid_coating_kind check(coating_kind is null or coating_kind in ('standard','low_e','low_e_plus','odl_clear'));
alter table public.grid_combination_assets alter column grid_location_id set not null;
alter table public.grid_combination_assets drop constraint if exists grid_asset_eligible_location;
alter table public.grid_combination_assets add constraint grid_asset_eligible_location foreign key(grid_combination_id,grid_location_id) references public.grid_combination_locations(grid_combination_id,grid_location_id);
create or replace function public.enforce_atomic_grid_coating() returns trigger language plpgsql set search_path='' as $$ begin
 if not exists(select 1 from public.glass_coatings where id=new.glass_coating_id and coating_kind is not null) then raise exception 'Grid coating must be atomic'; end if; return new;
end $$;
revoke all on function public.enforce_atomic_grid_coating() from public;
drop trigger if exists grid_coating_atomic on public.grid_combination_coatings;
create trigger grid_coating_atomic before insert or update on public.grid_combination_coatings for each row execute function public.enforce_atomic_grid_coating();
do $$ declare actual text; begin
 if (select count(*) from public.series where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>5 then raise exception 'Unexpected count: series'; end if;
 if (select count(*) from public.materials where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>2 then raise exception 'Unexpected count: materials'; end if;
 if (select count(*) from public.door_line_group_members where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>8 then raise exception 'Unexpected count: door_line_group_members'; end if;
 if (select count(*) from public.door_line_groups where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>5 then raise exception 'Unexpected count: door_line_groups'; end if;
 if (select count(*) from public.door_lines where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>8 then raise exception 'Unexpected count: door_lines'; end if;
 if (select count(*) from public.grains where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>4 then raise exception 'Unexpected count: grains'; end if;
 if (select count(*) from public.door_styles where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>42 then raise exception 'Unexpected count: door_styles'; end if;
 if (select count(*) from public.frame_material_finishes where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>53 then raise exception 'Unexpected count: frame_material_finishes'; end if;
 if (select count(*) from public.frame_materials where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>2 then raise exception 'Unexpected count: frame_materials'; end if;
 if (select count(*) from public.door_variants where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>127 then raise exception 'Unexpected count: door_variants'; end if;
 if (select count(*) from public.finishes where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>47 then raise exception 'Unexpected count: finishes'; end if;
 if (select count(*) from public.door_variant_finishes where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>4688 then raise exception 'Unexpected count: door_variant_finishes'; end if;
 if (select count(*) from public.sidelite_styles where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>5 then raise exception 'Unexpected count: sidelite_styles'; end if;
 if (select count(*) from public.glass_families where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>6 then raise exception 'Unexpected count: glass_families'; end if;
 if (select count(*) from public.door_variant_frame_materials where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>254 then raise exception 'Unexpected count: door_variant_frame_materials'; end if;
 if (select count(*) from public.glass_options where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>434 then raise exception 'Unexpected count: glass_options'; end if;
 if (select count(*) from public.glass_designs where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>217 then raise exception 'Unexpected count: glass_designs'; end if;
 if (select count(*) from public.door_variant_glass_options where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>1490 then raise exception 'Unexpected count: door_variant_glass_options'; end if;
 if (select count(*) from public.sidelite_variants where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>25 then raise exception 'Unexpected count: sidelite_variants'; end if;
 if (select count(*) from public.hardware_brands where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>2 then raise exception 'Unexpected count: hardware_brands'; end if;
 if (select count(*) from public.door_variant_sidelites where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>460 then raise exception 'Unexpected count: door_variant_sidelites'; end if;
 if (select count(*) from public.hardware_finishes where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>5 then raise exception 'Unexpected count: hardware_finishes'; end if;
 if (select count(*) from public.hardware_styles where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>15 then raise exception 'Unexpected count: hardware_styles'; end if;
 if (select count(*) from public.sidelite_variant_glass_options where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>551 then raise exception 'Unexpected count: sidelite_variant_glass_options'; end if;
 if (select count(*) from public.glass_coatings where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>7 then raise exception 'Unexpected count: glass_coatings'; end if;
 if (select count(*) from public.grid_profiles where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>4 then raise exception 'Unexpected count: grid_profiles'; end if;
 if (select count(*) from public.hardware_variants where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>34 then raise exception 'Unexpected count: hardware_variants'; end if;
 if (select count(*) from public.grid_widths where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>3 then raise exception 'Unexpected count: grid_widths'; end if;
 if (select count(*) from public.grid_patterns where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>12 then raise exception 'Unexpected count: grid_patterns'; end if;
 if (select count(*) from public.grid_colors where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>7 then raise exception 'Unexpected count: grid_colors'; end if;
 if (select count(*) from public.sidelite_variant_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>50 then raise exception 'Unexpected count: sidelite_variant_assets'; end if;
 if (select count(*) from public.hardware_variant_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>403 then raise exception 'Unexpected count: hardware_variant_assets'; end if;
 if (select count(*) from public.allowed_grid_combinations where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>384 then raise exception 'Unexpected count: allowed_grid_combinations'; end if;
 if (select count(*) from public.door_variant_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>874 then raise exception 'Unexpected count: door_variant_assets'; end if;
 if (select count(*) from public.assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>919 then raise exception 'Unexpected count: assets'; end if;
 if (select count(*) from public.glass_option_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>1099 then raise exception 'Unexpected count: glass_option_assets'; end if;
 if (select count(*) from public.finish_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>21 then raise exception 'Unexpected count: finish_assets'; end if;
 if (select count(*) from public.grid_combination_assets where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>386 then raise exception 'Unexpected count: grid_combination_assets'; end if;
 if (select count(*) from public.grid_locations where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>3 then raise exception 'Unexpected count: grid_locations'; end if;
 if (select count(*) from public.grid_combination_locations where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>386 then raise exception 'Unexpected count: grid_combination_locations'; end if;
 if (select count(*) from public.grid_combination_coatings where catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid)<>578 then raise exception 'Unexpected count: grid_combination_coatings'; end if;
 if exists(select 1 from public.allowed_grid_combinations c where c.catalog_revision_id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and (not exists(select 1 from public.grid_combination_locations l where l.grid_combination_id=c.id) or not exists(select 1 from public.grid_combination_coatings l where l.grid_combination_id=c.id))) then raise exception 'Missing explicit eligibility'; end if;
 actual:=pg_temp.hgi_digest();
 if actual<>'4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac' then raise exception 'Post-cleanup semantic fingerprint mismatch: %',actual; end if;
end $$;
update public.catalog_revisions set notes=(notes::jsonb||jsonb_build_object('cleanupVersion','pre-phase5-v1','cleanupChecksum','4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac'))::text where id='1af5506c-c723-5d6d-a341-93815d0205e2'::uuid and status='draft';
insert into public.catalog_change_log(id,catalog_revision_id,entity_table,entity_id,action,change_summary,before_data,after_data) values('97117430bdbcf4218514fe83bebfb299'::uuid,'1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,'catalog_revisions','1af5506c-c723-5d6d-a341-93815d0205e2'::uuid,'update','DEV-only pre-Phase-5 typed-grid and paint-binding cleanup',jsonb_build_object('catalogChecksum','70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c'),jsonb_build_object('cleanupChecksum','4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac','cleanupVersion','pre-phase5-v1')) on conflict(id) do nothing;
notify pgrst,'reload schema';
select 'udbcnpjtwhmjzpjjhoph' as reviewed_dev_target,'draft' as revision_status,pg_temp.hgi_digest() as cleanup_checksum;

ROLLBACK;
