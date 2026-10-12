# Pre-Phase-5 Grid/Prairie cleanup

Status: **DEV SQL dry run and committed application succeeded; full actual DEV verification passed before and after the 25 paint-file deletions.** Production database untouched; hardcoded inventory remains the only customer authority. No publication; Phase 5 not started. Commit/push explicitly requested for this checkpoint.

## Target and provenance

- Authenticated GET-only preflight verifies HGI Portal Dev URL/credential claims: `udbcnpjtwhmjzpjjhoph`.
- Exactly pinned draft `1af5506c-c723-5d6d-a341-93815d0205e2`; original source commit `e06efe7ea936e20a38fa85c674c2e73697f67dc7`, original import checksum retained as provenance.
- Original structured fingerprint: `5e0fade4472b15f9aeb25470d4480975adca8556cadd9b98d14a5f30af6ecd26`.
- Reviewed normalized fingerprint: `4fcb0b564ced2437f8a38e4e6f722b0fb856c189ae0eb5a53c0e9e8cbc8925ac`.
- SQL cannot infer its selected project from a server-only service JWT. The human must verify DEV project in SQL Editor before executing. No agent SQL/admin connection is configured; user chose SQL Editor application.

## Explicit representation

| Concept | New representation | Preserved behavior |
| --- | --- | --- |
| Location | grid_locations + grid_combination_locations | 386 memberships for 384 combinations; multi-location tuples stay valid |
| Main Prairie | NULL pattern FK + pattern_selection_mode=none | 28 combinations; no numeric question |
| Sidelite Prairie | actual numeric FK + mode=implicit | 18 combinations: FSL 5 Lite, F48SL 4 Lite, SSL 3 Lite |
| Other patterns | numeric lite_count and optional horizontal orientation; selectable mode | No new customer options or pattern defaults |
| Legacy sentinel | retained nonselectable legacy_only record, zero combination references | Historical ID retained; never exposed |
| No width | existing NULL width + width_selection_mode=none | 22 valid no-width tuples; absent eligibility row still means unavailable |
| Coating | coating_kind for atomic values + grid_combination_coatings | 578 atomic memberships; original composite FK kept for historical identity only |
| Profile | existing grid_profiles FK | No new profile/UI rules |
| Color | primary_hex_color + secondary_hex_color | Bronze/White explicitly retains both colors; old hex/provenance unchanged |
| Artwork | asset_id + explicit grid_location_id FK to eligibility | All 386 bindings preserved; path resolved from assets, not notes |
| Provenance | notes only for historical/descriptive information | Runtime adapter no longer needs notes.contexts or sentinel for structured grids |

UI evaluation, defaulting, sorting, tinting, geometry and capture remain in application code. Legacy fallback is retained only for the pre-migration DEV draft until the verified cleanup marker exists. It does not select another revision or affect the customer builder.

## SQL files and completed procedure

1. User ran the whole [dry-run SQL](pre-phase5-dev-dry-run.sql) in HGI Portal Dev and confirmed final ROLLBACK with the expected fingerprint.
2. Apply SQL was verified identical except its final COMMIT. User ran the whole [apply SQL](pre-phase5-dev-apply.sql) in the same DEV project and confirmed COMMIT with the expected fingerprint.
3. Agent independently re-read the actual DEV schema/data, verified the fingerprint and unpublished status, and ran all post-apply checks below. No publication or additional database writes.

The schema fragment is `supabase/migrations/20261012000000_inventory_grid_explicit_semantics.sql`. **Do not run it alone:** it is coupled to the transactional backfill and final constraints in the wrappers. Read-only `scripts/prepareDevInventoryCleanup.ts` regenerates both wrappers from a verified snapshot; it cannot apply or mutate Supabase.

Safety: advisory transaction lock; single draft/source guard; unpublished fields required; initial semantic fingerprint must match reviewed before OR after state; MD5-derived deterministic relation IDs; insert conflict handling; final exact counts and SHA-256 semantic fingerprint; checked NULL-aware unique index; width constraint retained; same-revision triggers; admin-only RLS; artwork-to-eligible-location FK; atomic-coating trigger. Any failure aborts the transaction. Re-running the same successful transaction is designed to be idempotent. No leads, dealer/auth data, telemetry or Storage changes.

SQL uses PostgreSQL's documented [SHA-256 bytea function](https://www.postgresql.org/docs/current/functions-binarystring.html) with compact canonical JSON and C key ordering. Its fingerprint computation passed the real DEV dry run and application. Independent JS recomputation over the actual committed DEV data matched exactly.

## Planned counts

- finishes 47; finish_assets 21 (was 47), assets 919 (was 945).
- allowed_grid_combinations 384 unchanged.
- grid_locations 3; grid_combination_locations 386; grid_combination_coatings 578.
- grid_combination_assets 386 unchanged.
- 28 no-pattern main Prairie + 18 implicit sidelites; 22 no-width tuples unchanged.
- No product memberships, labels, IDs, color values, availability, artwork paths or ordering are changed. Exactly one cleanup change-log event is appended; original import audit remains.

## Tooling

- `scripts/inventory/normalizeCleanup.ts`: pure deterministic normalization + structured digest.
- `scripts/exportInventoryCatalog.ts`: v2 schema-aware export and stain-only bindings. Default committed-source safeguards remain. Explicit --working-tree is for inspection/testing only, records workingTree in provenance, and is NOT accepted by ordinary import tooling.
- `scripts/importInventoryCatalog.ts`: typed location/coating/pattern and asset eligibility checks, forbids paint bindings. Safe fresh v2 import remains strict; it does not replace an existing legacy draft. Use the guarded SQL transition for the existing imported draft, not a destructive full re-import.
- `server/inventoryShadowReader.ts`: original revision pinned plus reviewed cleanup-version/fingerprint pin; typed tables read only once the cleanup marker exists; validates actual data digest.
- `server/inventoryShadowSemantics.ts`: typed location/artwork and atomic coating resolution; no structured notes dependency after transition. Expected coating text is formatted in code solely for semantic comparison with existing hardcoded UX.
- `src/inventory-shadow/cleanupPin.ts`: exact reviewed fingerprint, no dynamic latest selection.
- `scripts/verifyInventoryShadow.ts --planned-cleanup`: read-only normalized plan; no write and explicitly labelled planned.
- `scripts/verifyInventoryCleanup.ts`: idempotency, counts, invalid-width rejection, working-tree export/import validations.
- `scripts/verifyFinishAssets.ts`: all paint/stain PDF cases and four AI-reference capture comparisons.

## Actual post-apply verification

All requested checks passed against the actual committed DEV catalog and unchanged customer render paths:

- PostgREST schema metadata confirms all typed grid tables/columns, required pattern-selection mode and artwork location, and nullable pattern/width FKs.
- Revision remains DRAFT, published_at/published_by NULL, exact pinned ID and source lineage retained; exactly one cleanup update audit event.
- Full parity script reconciles 13,625 inventory records across 41 product/data tables with the cleaned source export, using full exported fields and remapped parent UUIDs—not label-only matching. Missing/extra/changed exported facts: zero. Server timestamps and explicitly retained original asset provenance are not mistaken for inventory differences.
- Zero paint bindings/paint asset records; all 21 stain bindings intact; 919 actual assets.
- Live shadow suite (no --planned-cleanup flag): 41,480 matches across 2,440 contexts, zero mismatches.
- All 26 paints pixel-identical to legacy-image fixtures; all 21 stain textures render; four configured AI-reference capture pairs identical; zero paint image requests and zero paid AI calls.
- Existing PDF suite: 24 cases, repeat determinism, mobile/tablet/DPR output, pending/missing assets and downloads passed.
- Configuration integrity: 4,688 material/finish choices, 786 asset paths, 50,381 prepared AI configurations; zero missing/broken paths.
- Product rendering: all 304 configurations / 235 coverage dimensions; zero failed image loads, blank outputs or runtime exceptions.
- Cleanup idempotency, typed export/import validation and invalid-width/location rejection tests passed.
- TypeScript app and explicit verification tooling checks, production build, asset audit and tracked/new-file whitespace checks passed. Existing large-chunk build warning remains.

**Completed October 13, 2026:** exactly 25 audited paint files deleted, all 21 stain hashes unchanged, all verification suites rerun. Asset audit has zero missing runtime references. Exact deleted paths are documented in `paint-asset-cleanup.md`. This is the final pre-Phase-5 checkpoint, with commit/push authorized by the user. No Phase 5 work, publication or runtime authority switch.

`scripts/verifyInventoryPostApply.ts` logs the exact network target and methods. Only `https://udbcnpjtwhmjzpjjhoph.supabase.co` and GET were used for database verification. No Production access/modification or database writes by the agent; browser renderer tests accessed local fixture/assets and did not invoke AI or submissions.

Commands after DEV application:

```bash
node --import tsx scripts/verifyInventoryPostApply.ts
node --import tsx scripts/verifyInventoryCleanup.ts
node --import tsx scripts/verifyInventoryShadow.ts
node --import tsx scripts/verifyFinishAssets.ts
npm run audit:assets
npm run test:configuration-integrity
npm run test:pdf-renderer
npm run test:configuration-renders
npm run build
git diff --check
```

No customer runtime authority switch. No Production database changes. No catalog publication. Commit/push only at the user's explicit checkpoint request; no deployment command was run.
