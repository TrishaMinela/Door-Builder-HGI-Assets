import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readDevShadowCatalog } from '../server/inventoryShadowReader'
import { normalizeCleanupTables, cleanupDigest, cleanupColumns, coatingMembers, CLEANUP_VERSION } from './inventory/normalizeCleanup'
import { EXPECTED_REVISION, EXPECTED_DIGEST } from '../src/inventory-shadow/types'

// GET-only. Prints SQL for the user's verified DEV SQL Editor; never applies it.
const catalog = await readDevShadowCatalog(30000)
if(catalog.revision.published_at || catalog.revision.published_by)throw new Error('Refusing published revision')
const before = catalog.tables
const after = normalizeCleanupTables(before, EXPECTED_REVISION)
const digest = cleanupDigest(after), beforeDigest=cleanupDigest(before)
const q = (value:string) => `'${value.replaceAll("'","''")}'`
const rev=q(EXPECTED_REVISION)+'::uuid'
const countChecks=Object.entries(after).filter(([table])=>table!=='catalog_revisions').map(([table,rows])=>`if (select count(*) from public.${table} where catalog_revision_id=${rev})<>${rows.length} then raise exception 'Unexpected count: ${table}'; end if;`).join('\n ')
const snapshotSql=`jsonb_build_object(${Object.entries(cleanupColumns).map(([table,keys])=>`${q(table)},(select coalesce(jsonb_agg(jsonb_build_object(${keys.map(k=>`${q(k)},${k==='notes'?"coalesce((to_jsonb(r)->>'notes')::jsonb,'{}'::jsonb)":`to_jsonb(r)->${q(k)}`}`).join(',')}) order by id),'[]'::jsonb) from public.${table} r where catalog_revision_id=${rev})`).join(',')})`
const schema=readFileSync('supabase/migrations/20261012000000_inventory_grid_explicit_semantics.sql','utf8')
const body=`
select pg_advisory_xact_lock(hashtext('hgi-pre-phase5-dev-cleanup'));
set local lock_timeout='10s';
${schema}

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
 select encode(sha256(convert_to(pg_temp.hgi_canonical(${snapshotSql}),'UTF8')),'hex');
$$;
do $$ declare actual text; begin
 if not exists(select 1 from public.catalog_revisions where id=${rev} and status='draft' and notes::jsonb->>'catalogChecksum'=${q(EXPECTED_DIGEST)} and (notes::jsonb->>'cleanupChecksum' is null or notes::jsonb->>'cleanupChecksum'=${q(digest)})) then raise exception 'Draft provenance mismatch'; end if;
 actual:=pg_temp.hgi_digest();
 if actual not in (${q(beforeDigest)},${q(digest)}) then raise exception 'Catalog changed since plan; checksum %',actual; end if;
end $$;

-- Scope every mutation to this one unpublished revision. Keep all legacy IDs.
create temporary table hgi_paint_assets on commit drop as
 select distinct a.asset_id from public.finish_assets a join public.finishes f on f.id=a.finish_id where f.catalog_revision_id=${rev} and f.finish_type='paint';
delete from public.finish_assets a using public.finishes f where a.finish_id=f.id and f.catalog_revision_id=${rev} and f.finish_type='paint';
delete from public.assets a using hgi_paint_assets p where a.id=p.asset_id and a.catalog_revision_id=${rev}
 and not exists(select 1 from public.door_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.glass_option_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.sidelite_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.hardware_variant_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.finish_assets b where b.asset_id=a.id)
 and not exists(select 1 from public.grid_combination_assets b where b.asset_id=a.id);
update public.finishes set notes=jsonb_set(notes::jsonb,'{source,image}','""'::jsonb)::text where catalog_revision_id=${rev} and finish_type='paint';

insert into public.grid_locations(id,catalog_revision_id,legacy_id,display_name,display_order) values
 ${after.grid_locations.map(r=>`(${q(r.id)}::uuid,${rev},${q(r.legacy_id)},${q(r.display_name)},${r.display_order})`).join(',\n ')} on conflict(id) do nothing;
insert into public.grid_combination_locations(id,catalog_revision_id,grid_combination_id,grid_location_id)
 select md5(${q(EXPECTED_REVISION+':grid_combination_locations:')}||c.id::text||':'||(context->>'location'))::uuid,${rev},c.id,l.id
 from public.allowed_grid_combinations c cross join lateral jsonb_array_elements(coalesce(c.notes::jsonb->'contexts','[]'::jsonb)) context
 join public.grid_locations l on l.catalog_revision_id=c.catalog_revision_id and l.legacy_id=context->>'location'
 where c.catalog_revision_id=${rev} on conflict(id) do nothing;

update public.glass_coatings set coating_kind=case legacy_id when 'Standard / No Low-E' then 'standard' when 'Low-E' then 'low_e' when 'Low-E Plus' then 'low_e_plus' when 'ODL Clear' then 'odl_clear' else null end where catalog_revision_id=${rev};
insert into public.grid_combination_coatings(id,catalog_revision_id,grid_combination_id,glass_coating_id)
 select md5(${q(EXPECTED_REVISION+':grid_combination_coatings:')}||c.id::text||':'||member.name)::uuid,${rev},c.id,atomic.id
 from public.allowed_grid_combinations c join public.glass_coatings old on old.id=c.glass_coating_id
 cross join lateral jsonb_array_elements_text(${q(JSON.stringify(coatingMembers))}::jsonb->old.legacy_id) member(name)
 join public.glass_coatings atomic on atomic.catalog_revision_id=c.catalog_revision_id and atomic.legacy_id=member.name
 where c.catalog_revision_id=${rev} on conflict(id) do nothing;

update public.grid_patterns set lite_count=substring(legacy_id from '^([0-9]+) Lite')::integer,orientation=case when legacy_id like '% Horizontal' then 'horizontal' else null end,status=case when legacy_id='__no_pattern_selection__' then 'legacy_only' else status end where catalog_revision_id=${rev};
update public.grid_colors set primary_hex_color=case when legacy_id='Bronze/White' then '#6f4b32' else hex_color end,secondary_hex_color=case when legacy_id='Bronze/White' then '#f4f4ef' else null end where catalog_revision_id=${rev};
update public.allowed_grid_combinations c set pattern_selection_mode=case when c.grid_pattern_id is null or (select legacy_id from public.grid_patterns where id=c.grid_pattern_id)='__no_pattern_selection__' then 'none' when profile.legacy_id='Prairie' and g.scope='sidelite' then 'implicit' else 'selectable' end,grid_pattern_id=case when (select legacy_id from public.grid_patterns where id=c.grid_pattern_id)='__no_pattern_selection__' then null else c.grid_pattern_id end,notes=(c.notes::jsonb-'contexts')::text
 from public.glass_options g,public.grid_profiles profile where g.id=c.glass_option_id and profile.id=c.grid_profile_id and c.catalog_revision_id=${rev};
-- The nullable pattern needs a LEFT JOIN in a separate UPDATE for pre-cleanup rows.
update public.allowed_grid_combinations c set pattern_selection_mode='none',grid_pattern_id=null from public.grid_patterns p where p.id=c.grid_pattern_id and p.legacy_id='__no_pattern_selection__' and c.catalog_revision_id=${rev};
update public.grid_combination_assets a set grid_location_id=l.id from public.grid_locations l where l.catalog_revision_id=a.catalog_revision_id and l.legacy_id=a.view_key and a.catalog_revision_id=${rev};

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
 ${countChecks}
 if exists(select 1 from public.allowed_grid_combinations c where c.catalog_revision_id=${rev} and (not exists(select 1 from public.grid_combination_locations l where l.grid_combination_id=c.id) or not exists(select 1 from public.grid_combination_coatings l where l.grid_combination_id=c.id))) then raise exception 'Missing explicit eligibility'; end if;
 actual:=pg_temp.hgi_digest();
 if actual<>${q(digest)} then raise exception 'Post-cleanup semantic fingerprint mismatch: %',actual; end if;
end $$;
update public.catalog_revisions set notes=(notes::jsonb||jsonb_build_object('cleanupVersion',${q(CLEANUP_VERSION)},'cleanupChecksum',${q(digest)}))::text where id=${rev} and status='draft';
insert into public.catalog_change_log(id,catalog_revision_id,entity_table,entity_id,action,change_summary,before_data,after_data) values(${q(createHash('md5').update(EXPECTED_REVISION+':'+CLEANUP_VERSION).digest('hex'))}::uuid,${rev},'catalog_revisions',${rev},'update','DEV-only pre-Phase-5 typed-grid and paint-binding cleanup',jsonb_build_object('catalogChecksum',${q(EXPECTED_DIGEST)}),jsonb_build_object('cleanupChecksum',${q(digest)},'cleanupVersion',${q(CLEANUP_VERSION)})) on conflict(id) do nothing;
notify pgrst,'reload schema';
select 'udbcnpjtwhmjzpjjhoph' as reviewed_dev_target,'draft' as revision_status,pg_temp.hgi_digest() as cleanup_checksum;
`
const header='-- HGI PORTAL DEV ONLY: udbcnpjtwhmjzpjjhoph. Verify SQL Editor project before running.\n-- No publication. On ANY failure, the transaction rolls back schema and data.\n'
const summary={target:'udbcnpjtwhmjzpjjhoph',authenticatedRead:true,productionTarget:false,revision:EXPECTED_REVISION,digest,beforeDigest,counts:Object.fromEntries(Object.entries(after).map(([name,rows])=>[name,rows.length])),paintPathsRemoved:before.assets.filter(r=>!after.assets.some(a=>a.id===r.id)).map(r=>r.current_path),applyPerformed:false}
if(process.argv.includes('--summary'))console.log(JSON.stringify(summary,null,2))
else console.log(JSON.stringify({summary,dryRunSql:header+'BEGIN;\n'+body+'\nROLLBACK;\n',applySql:header+'BEGIN;\n'+body+'\nCOMMIT;\n'},null,2))
