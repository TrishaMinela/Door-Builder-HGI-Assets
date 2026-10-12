# Phase 3B - DEV inventory import

Completed October 12, 2026. **DEV only; unpublished; no runtime switch.**

## Target and verification before writes

- Project: HGI Portal Dev, ref `udbcnpjtwhmjzpjjhoph`.
- Allowlisted origin: `https://udbcnpjtwhmjzpjjhoph.supabase.co`.
- Server-only URL/key loaded from this repository's ignored `.env.local`; no key is included in this document, exporter, manifest, browser code or logs.
- JWT project/role claims checked locally; authenticated HTTPS inventory reads succeeded against that project, validating the credential remotely. No Production request was made.
- Exact authenticated counts confirmed **all 40 inventory tables were empty** before the first import, including revisions and change log.
- Intended counts were printed by a read-only dry-run and reported before inserts.
- Existing DEV schema was inspected through PostgREST metadata and the Portal foundation migration `20261008000000_create_inventory_catalog_foundation.sql`. No migration, policy, table or Storage configuration was changed.

## Imported draft

| Field | Value |
| --- | --- |
| Revision | `1af5506c-c723-5d6d-a341-93815d0205e2` |
| Status | `draft` |
| Published at / by | Both NULL |
| Door Builder source commit | `e06efe7ea936e20a38fa85c674c2e73697f67dc7` |
| Source checksum | `3b8bfe69cc1df41157f8f736ffacb1e826a01d98295080694f49512c963ad43e` |
| Catalog checksum | `70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c` |
| Format | `hgi-inventory-phase3b-v1` |
| Total rows | **12,712**, including revision and one import log |

The full table counts and comparisons are in [inventory-parity-report.md](inventory-parity-report.md).

## Tooling

- `scripts/exportInventoryCatalog.ts`: deterministic, read-only export from current committed catalog modules and existing resolvers. `--full` prints the complete manifest; default prints counts, provenance and review findings. It does not load credentials or call Supabase.
- `scripts/inventory/source.ts`: reads private App inventory constants with the TypeScript AST and evaluates only their selected declaration/dependency closure in an isolated context. This avoids importing/mounting App or modifying runtime exports. It retains additive whitelist updates and reads type-union domains from `src/types.ts`.
- `scripts/importInventoryCatalog.ts`: DEV-only preflight, insert-only importer, safe resume and full row parity checker. Default is a dry-run; `--verify` reads only.
- `scripts/verifyInventoryCatalog.ts`: deterministic export, UUID/FK checks, normalization cases, modified-record detection and DEV credential/target guards.

Commands, from the Door Builder repository:

```bash
# Read-only export / plan
node --import tsx scripts/exportInventoryCatalog.ts
node --import tsx scripts/exportInventoryCatalog.ts --full
node --import tsx scripts/importInventoryCatalog.ts

# Insert only the reviewed manifest into the allowlisted DEV project
node --import tsx scripts/importInventoryCatalog.ts --apply --expect-digest=70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c

# Read-only database parity
node --import tsx scripts/importInventoryCatalog.ts --verify

# Local exporter/guard regression
node --import tsx scripts/verifyInventoryCatalog.ts
```

The completed draft automatically anchors reruns to its original source commit. A later tooling-only commit does not create another revision. Runtime catalog files and asset trees must still match that original commit; source changes or an unrelated/modified draft are refused. For a local export of the original snapshot after a tooling-only commit:

```bash
node --import tsx scripts/exportInventoryCatalog.ts --source-commit=e06efe7ea936e20a38fa85c674c2e73697f67dc7
```

## Idempotence and safety

- SHA-256-derived UUIDs use revision identity, table and scoped natural key, never mutable global display-name equality as the database key.
- One unpublished managed draft only. Another revision, foreign records, changed records, a published revision, wrong project/role, dirty runtime source/assets, schema mismatch or digest mismatch stops the operation.
- Primary IDs and all declared manifest foreign keys are checked; remote FK targets are also checked against schema metadata before writes.
- Requests are limited to the 40 inventory tables, the one explicit DEV origin, no redirects, finite timeouts and paginated reads. Other tables, Auth users, leads, dealers and telemetry are not queried or written by the importer.
- Batches contain at most 150 rows and identical column shapes. Insert uses primary-key conflict-ignore, not overwrite. Existing rows are compared before any insert; edited records are refused rather than replaced.
- Revision status/digest is checked before each non-revision insert batch and again at the end. Import never publishes, updates existing catalog rows, deletes records or moves files.
- API batches are individually transactional, **not one transaction spanning all tables**. A network failure can leave a partial draft. A safe rerun resumes missing rows only after checking existing rows match exactly. The unchanged runtime cannot consume this draft.
- Actual rerun after completion inserted **0 rows** and returned the same draft with zero parity differences. It did not add a second revision or change-log entry.
- No rollback/delete utility was added. Removing an imported draft would require separately authorized, FK-aware cleanup; keep it unpublished for review instead.

## Normalization decisions

### Paris and repeated glass labels

Main glass has 127 source rows / 126 IDs. The two identical `paris` records are consolidated only after verifying their entire source objects agree. Original source positions are retained in scoped option notes. Non-identical duplicate IDs abort export.

The duplicated Paris also propagates into CR14SL's derived catalog. Its two positions are retained while that scoped row is consolidated. Thus 92 exported sidelite glass source rows become 91 unique scoped identities. Repeated Grace, Nouveau, Clear and other labels are **not** merged across IDs or door/sidelite scopes.

The 217 `glass_designs` rows are conservative scoped source-option identities (126 main + 91 sidelite), not a claim of 217 distinct marketed base designs. Glass options are split by opening: 343 main-opening/placeholder rows + 91 sidelite rows = 434. Scope, original legacy ID, label, original overlay map and source array order remain available.

### Lifecycle / Linen

Current effective main-glass filtering yields 88 selectable IDs. The other 38 retained IDs are marked `legacy_only` and not customer-selectable, not declared manufacturer-discontinued. Every retained source glass reference remains renderable/resolvable through its source artwork/fallback metadata. Linen remains `renderable=true`, `customer_selectable=false` in every scope. Approval-hidden raw designs absent from exported runtime catalogs are not invented as active products.

### Timber / Clad

Both internal frame materials are retained separately and their customer selector visibility stays false. Timber has 47 potential finish memberships, further filtered by selected door line/finish kind in App; Clad has only the existing six paints. The renderer/defaulting algorithms remain in code. The door/frame relation has 254 rows (127 variants x 2 retained internal materials), not a new customer step.

### Sidelite aliases

Five styles become 25 line/material/grain variants; the seven original asset-family aliases remain on those variants. The shared `22-gauge` art alias does not turn fiberglass into steel. Smooth Steel SSL retains its existing shared Oak SSL asset. Existing semantic hinge-side/lock-side and handing mappings remain source metadata/application behavior.

### Hardware

34 finish-specific hardware products remain 34 sellable variants. 97 source artwork records and current preview/card/handing/view resolutions become asset bindings, not additional products. Crop/type and original IDs remain in notes; functional rendering does not move into the database.

### Grid representation

384 actual allowed tuples are exported from current main/sidelite rule maps and external/SDL lists, not an unrestricted cross-product. Standard/Low-E overlap resolves to the same combined coating labels the builder uses. Valid empty width lists become `width_selection_mode=none` / NULL width; absent rule keys produce no rows.

The existing schema lacks a grid-location column. `notes.contexts` preserves each valid internal/external/SDL context and its exact existing artwork path; one tuple can carry multiple contexts. This is necessary catalog data, not executable UI code. Shadow comparisons must include contexts.

Main-door Prairie does not select a numeric lite pattern, but the Phase 2 FK is non-null. One internal `__no_pattern_selection__` pattern row (`customer_selectable=false`) represents NULL selection. It is not a new selectable product. Sidelite Prairie retains its existing implicit slab-specific patterns. These two schema representations need HGI/admin review before any public adapter or publication.

## Assets and review items

945 exact source/resolved path records are retained at their existing application URLs, including query cache versions and fallback ordering. Existing files have checksums, dimensions, MIME, byte counts and transparency metadata. Shared paths stay shared; equal bytes do not merge distinct product identities.

One source-declared path is absent locally: `/assets/finishes/paint/wineberry.webp`. It remains recorded with NULL file metadata and an explicit missing-file note. The current paint picker renders the actual hex color, not this declared image; no replacement asset or color was fabricated. HGI should decide whether to supply the image or retire that unused declaration later. All other imported asset-path records resolved locally.

Review also covers Paris ownership, retained legacy/placeholder glass, scoped design grouping, exact supplier availability (not stock quantities), shared sidelite aliases, and grid location / no-pattern representation. None was silently repaired in runtime code.

## Preserved boundaries

No runtime source, product asset, Visualizer, PDF, submission, compatibility rule, customer UX, Production project or Storage object changed. No FeneVision API. No customer-safe API, runtime Supabase adapter, publication or production rollout added. No commit or push made.

## Verification

- Deterministic exporter and safety regressions passed.
- Explicit tooling TypeScript check passed with `--types vite/client,node`.
- Live DEV preflight, complete import and all-field manifest parity passed.
- Live idempotent rerun: zero inserts; same single draft; zero differences.
- `npm run test:configuration-integrity`: passed, 4,688 material/finish selections, 786 resolved asset checks and 50,381 prepared AI configurations; zero missing checked render assets.
- `npm run test:door-builder-draft`: passed.
- `npm run build`: passed; existing large-bundle warning remains.
- `git diff --check`: passed, including separate whitespace checks of the new files.

Suitable for **DEV read-only shadow testing with the documented context/sentinel mappings**, not ready for publishing or switching customer runtime.
