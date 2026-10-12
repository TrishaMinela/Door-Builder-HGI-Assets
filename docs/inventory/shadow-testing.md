# Phase 4 - DEV inventory shadow testing

Implemented and verified October 12, 2026. **Hardcoded inventory remains the only customer authority. No catalog was published and no database records were written by Phase 4.**

## How it works

```text
Builder selections -> existing hardcoded filtering, defaults, UI and state
                   -> separate opt-in diagnostic hook (debounced)
                   -> local Vite DEV middleware
                   -> GET-only reader of the pinned DEV draft
                   -> independent semantic resolvers and comparison reports
                   -> developer console only; no state setters or UI feedback
```

The Supabase reader is server-only. The browser receives comparison reports, never the service-role key or full database catalog. No public `/api` endpoint, Production API, customer-safe inventory API, runtime adapter, migration or inventory-admin feature was added.

### Files

- `src/inventory-shadow/types.ts`: configuration whitelist, typed catalog/snapshot/report contracts and pinned provenance.
- `src/inventory-shadow/compare.ts`: stable identifier, metadata and significant-default comparisons.
- `src/inventory-shadow/report.ts`: centralized development reporting.
- `src/inventory-shadow/useInventoryShadow.ts`: nonblocking diagnostic effect; no setters or result-derived inventory.
- `server/inventoryShadowReader.ts`: authenticated, bounded, paginated GET-only DEV reader.
- `server/inventoryShadowSemantics.ts`: hardcoded API/rule resolution versus database joins and binding resolution.
- `vite.config.ts`: opt-in local middleware, absent from production build and preview server.
- `scripts/verifyInventoryShadow.ts`: broad live DEV semantic suite plus failure/comparison tests.
- `scripts/verifyInventoryShadowRuntime.ts`: opt-in/off browser integration and outage/mismatch isolation.
- `src/App.tsx`: one hook invocation and import; existing option/default/state/navigation/render/submission code remains unchanged.

The untracked `scripts/verifyInventoryCatalog.ts` existed before this task and was not changed by Phase 4.

## Enable and disable

Default: **disabled**.

Keep the server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the repository's ignored `.env.local`. Never prefix the service-role key with `VITE_`, print it, or add it to browser code.

Enable only for a local development server:

```bash
VITE_INVENTORY_SHADOW=true npm run dev
```

Alternatively set `VITE_INVENTORY_SHADOW=true` in `.env.local` and restart the development server. The flag itself is not a secret. To disable, remove/set it to false and restart. The middleware is installed only for `serve`, non-production mode, and the explicit flag; the browser also requires `import.meta.env.DEV` and non-production mode. Production build and `vite preview` never install it.

The browser uses only the local `/__dev/inventory-shadow/compare` route. The reader refuses every origin except `https://udbcnpjtwhmjzpjjhoph.supabase.co`, checks service-role/project claims before any Supabase query, and refuses redirects. A configuration/credential/pinned-revision error disables server comparisons until restart and logs a development warning. No alternate project or revision is selected.

## Pinned draft, not "latest"

- Project: HGI Portal Dev, `udbcnpjtwhmjzpjjhoph`.
- Revision: `1af5506c-c723-5d6d-a341-93815d0205e2`.
- Expected source commit: `e06efe7ea936e20a38fa85c674c2e73697f67dc7`.
- Expected format: `hgi-inventory-phase3b-v1`.
- Expected catalog digest: `70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c`.
- Required status: **draft**.

A missing, ambiguous, published, retired or differently sourced expected revision is unavailable, not a fallback. The reader fetches only this revision's rows; unrelated catalog revisions, leads, dealers, Auth users, telemetry and change logs are not read.

The runtime caches one successful read for up to 60 seconds and deduplicates in-flight reads. Changes may therefore take up to a minute and another configuration interaction to appear; restart to force a fresh read. The harness always fetches fresh data. A cached diagnostic snapshot is never used as customer inventory.

## Semantic comparisons

The database resolver joins revisioned product facts and compatibility tables. It does **not** compare a fresh hardcoded export against the same exported rows, return Supabase choices to the UI, or use source-note arrays as the primary availability list. Some metadata necessarily comes from preserved Phase 3 notes where the schema has no dedicated column.

Seventeen comparison areas:

1. Door-line/group choices for the selected style, group memberships and traits.
2. Styles compatible with selected line/material and grain.
3. Supported finish types, including default type.
4. Available finishes/colors, metadata and first/default finish.
5. Main glass availability and family IDs.
6. Available main glass-family labels and default family, including Retro grouping.
7. Allowed sidelite styles and art-family aliases.
8. Sidelite glass within the selected slab scope.
9. Hardware brands.
10. Hardware style/brand groupings and default hardware variant per group.
11. Sellable hardware style/finish variants, colors, functional kind and crop metadata.
12. Retained Timber/Clad frame materials and customer visibility.
13. Timber/Clad finish memberships.
14. Historical selected main glass, renderability, selectability and source duplicate multiplicity.
15. Allowed grid tuples, coating, location, pattern, width semantics and template paths.
16. Actual per-tuple grid asset bindings, not merely the path duplicated in rule notes.
17. Relevant door/finish/glass/sidelite/hardware resolved asset bindings and candidate priority, including authored and preview views/handing.

Comparisons use legacy IDs/codes/scoped identities. Duplicate records with the same intentional source ID are normalized, not counted as extra customer products. Choice ordering is ignored unless it controls a default or asset fallback. Significant finish/family/hardware defaults and candidate priority are compared explicitly.

The configuration context contains only style, line, grain, finish type, main glass, sidelite slab and hardware IDs. It contains no customer contact data, house photo, generated image, AI prompt or secret. Supabase reads occur only on the DEV server. The existing UI renders immediately from hardcoded results; diagnostics run later and cannot substitute values.

### Known special-case mappings

- Linen is excluded from selectable glass and retained for historical/renderable comparisons.
- Main Paris duplicates preserve source multiplicity; scoped Paris/CR14SL and repeated labels do not merge into unrelated products.
- Smooth Steel SSL is included; Brushed fiberglass keeps the `20-gauge` artwork alias rather than becoming a steel material.
- Timber remains distinct from Clad, with the existing restricted six-color Clad palette.
- Valid empty width lists become NULL-width grid tuples. Missing keys are unavailable, not widthless.
- Main Prairie's internal `__no_pattern_selection__` marker normalizes to no numeric pattern; it is not exposed as a customer option.
- Grid locations/artwork contexts stored in notes are interpreted explicitly because Phase 2 has no location column.
- Hardware artwork views remain bindings for 34 sellable variants, not extra products.

## Reports and failure isolation

`[inventory-shadow]` summarizes comparison counts. Mismatches emit `[inventory-shadow:mismatch]` records with area, whitelisted context, both normalized result counts, missing/extra IDs, changed metadata IDs and field names, significant default mismatch, revision and timestamp. Reports do not contain raw inventory notes, image data or credentials.

`[inventory-shadow:unavailable]` reports guarded/failed/timed-out reads. No customer error UI, selection update, auto-fix or fallback inventory is created. Requests are debounced 350ms; stale/unmounted requests are cancelled and ignored. Browser timeout is 15 seconds; shared server read timeout is 12 seconds. A cached/in-flight read never blocks normal navigation. Middleware rejects oversized context bodies and cross-origin requests.

Transient unfinished selection contexts are diagnostics, not eligibility decisions. The debounce/cancellation avoids reporting most intermediate states. No false-positive mismatch was observed in the representative or broad valid-context suites; this does not guarantee every transient state has been exercised.

## Automated coverage and commands

```bash
# Fresh read-only live DEV comparisons
node --import tsx scripts/verifyInventoryShadow.ts

# Local browser integration: disabled, enabled, simulated outage/mismatch
node --import tsx scripts/verifyInventoryShadowRuntime.ts

npm run test:configuration-integrity
npm run test:door-builder-draft
node --import tsx scripts/verifySideliteHanding.ts
npm run test:pdf-renderer
npm run test:ai-visualizer
npm run build
git diff --check
```

The semantic harness deterministically covers every style and all 127 line/style variants, each finish kind, every applicable main glass option/family, applicable sidelite slabs and their glass/grid data, and all 34 hardware variants. It compares full scoped availability sets rather than precomputing trillions of complete configurations.

Local assertions cover harmless reordering, injected metadata drift, PII exclusion, GET-only outage handling, timeouts, missing expected revision and refusal of a published expected revision. Browser checks confirm no requests when disabled, real matching reports when enabled, unchanged saved configuration, and normal navigation during simulated outages/mismatches.

## Results

- **2,440 configuration contexts; 41,480 comparisons; 41,480 matches; 0 mismatches**.
- No known false positives in the tested valid contexts.
- Runtime opt-in/off browser checks passed; no Supabase-derived state changes.
- Configuration integrity passed: 4,688 material/finish selections, 786 asset paths, 50,381 prepared AI product configurations, no missing checked render assets.
- Draft persistence passed.
- Sidelite/handing passed: 32 mappings plus view/capture/PDF/AI/submission/legacy checks.
- PDF product renderer passed: 24 configurations and repeat/mobile-independent checks.
- App TypeScript/production build and explicit tooling TypeScript check passed; existing large-chunk warning remains.
- Production build also passed with the shadow flag forced true and an invalid server URL supplied. Production JS contains neither the shadow endpoint string nor the service-role variable identifier.
- `git diff --check` and separate new-file whitespace checks passed.
- **Existing AI test failure:** `scripts/verifyAiVisualizer.ts:200` expects `/transom was detected/` from the current empty structural-instruction block. The assertion, generation module and Visualizer files are unchanged by this task. Earlier normalization/mock input cases ran; the stale assertion stops the remaining suite. It was not rewritten or fixed as part of inventory diagnostics.

No live/paid AI generation or lead submission was performed. Phase 4 made GET-only inventory requests to DEV and did not publish or mutate the draft.

## Not yet proven / switching-category gates

This layer proves option/membership/default/declared binding semantics for the covered catalog. It does not certify supplier stock/manufacturing availability, pixel-identical rendered imagery, photo/AI geometry, arbitrary newly added product shapes, or every full workflow's default/reselection sequence. Procedural glass-frame masks, jamb card artwork without a typed binding table, and layout/handing execution remain application behavior, not new Supabase-controlled categories. The known missing declared Wineberry paint-image path remains a Phase 3 review item; equal declared paths are not proof of file usability.

Before switching any category:

1. HGI reviews Phase 3 statuses, duplicate ownership, missing assets and context/sentinel schema conventions.
2. Run shadow checks on real representative configurations with no unexplained missing/extra/metadata/default differences, including disabled/history cases and source changes.
3. Add independent browser-visible option/default/capture/PDF/submission parity for that category and its dependencies; do not infer it solely from matching exporters.
4. Design customer-safe published reads/RLS, atomic publication, coherent revision pinning, outage fallback and rollback before enabling a runtime adapter.
5. Obtain explicit approval for a category-specific opt-in staging change. Keep hardcoded authority until that approval and validation; do not publish this draft automatically.

**DEV shadow testing is ready for review. Production is unaffected and customer inventory remains hardcoded. No commit/push was made.**
