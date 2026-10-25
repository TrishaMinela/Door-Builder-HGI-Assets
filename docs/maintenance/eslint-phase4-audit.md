# Phase 4 ESLint audit — October 25, 2026

## Scope and baseline

Read-only audit of clean committed `c13e3b868806061251ac002f5cd8a0eb93b113e8`
on production branch `hgi/visualizer`: **20 errors, zero warnings**. Refreshed
remote has no unpublished commits. All 357 pre-existing dirty/untracked files
were fingerprinted before edits; none belongs in this batch.

Line numbers below refer to that committed baseline, not the dirty tree.
`any` means `@typescript-eslint/no-explicit-any`; `assignment` means
`no-useless-assignment`; `caught` means `preserve-caught-error`; `unused` means
`@typescript-eslint/no-unused-vars`. Overlap is direct file overlap with the
357 pending files, not merely sharing dependencies.

| # | Exact file and line | Rule | Application impact | Risk / decision | Dirty overlap |
| --- | --- | --- | --- | --- | --- |
| 1 | `scripts/exportInventoryCatalog.ts:43` | any | Shared heterogeneous export/database row boundary | Defer: schema-wide typing affects many readers and mutation planners; not a safe blind `unknown` replacement. | No |
| 2 | `scripts/inventory/normalizeCleanup.ts:5` | any | Mutable normalization row shape | Defer: requires explicit per-table schema modeling and transformation tests. | No |
| 3 | `scripts/inventory/normalizeCleanup.ts:20` | any | Normalizer input dictionaries | Defer: changing accepted shapes may change cleanup assumptions. | No |
| 4 | `scripts/inventory/normalizeCleanup.ts:23` | any | Generated normalization fields | Defer with rows/input; no normalization rewrite. | No |
| 5 | `scripts/inventory/source.ts:35` | any | Values extracted from App in an isolated VM | Defer: dynamic cross-realm values and pending VM-binding work. | **Yes** |
| 6 | `scripts/inventory/source.ts:46:34` | any | Recursive JSON conversion input | Defer: Set/function/undefined and cross-realm behavior need dedicated modeling. | **Yes** |
| 7 | `scripts/inventory/source.ts:46:40` | any | Recursive JSON conversion output | Defer with input; avoid changing export serialization. | **Yes** |
| 8 | `scripts/prepareDevInventoryCleanup.ts:10` | any | GET-only DEV SQL-plan generator | Fix: remove redundant assertion; use the reader's existing `DevCatalog.tables` / `CatalogRow` types. Emitted JS must remain identical. Never run generated SQL. | No |
| 9 | `src/features/home-visualizer/brushCleanup.ts:220` | any | OpenCV smoothing-resource disposal | Defer: requires image-processing/lifetime validation; no automatic resource rewrite. | No |
| 10 | `src/features/home-visualizer/brushCleanup.ts:282` | any | OpenCV inpainting-resource disposal | Defer with smoothing resources. | No |
| 11 | `src/features/home-visualizer/computerVision.ts:347` | any | Auto-clean OpenCV resource list | Defer: native Mat/MatVector ownership needs a focused follow-up. | No |
| 12 | `src/features/home-visualizer/computerVision.ts:377` | any | Selected hardware contour | Defer: Mat ownership, deletion and confidence branches need focused coverage. | No |
| 13 | `src/features/home-visualizer/opencvLoader.ts:1` | any | Shared OpenCV runtime shape | Defer: Emscripten runtime lifecycle differs from static declarations. | No |
| 14 | `src/features/home-visualizer/opencvLoader.ts:8` | any | Module/default/promise interop | Defer: don't assume import shape or alter initialization timing. | No |
| 15 | `src/features/home-visualizer/HomeVisualizer.tsx:372` | assignment | Uploaded-photo format metadata | Fix initial `'unknown'` dead store only. Successful detection assigns before normalization/use; every caught failure returns. Preserve normalization, photo state, catch and telemetry. | No |
| 16 | `src/features/home-visualizer/aiVisualization.ts:142` | assignment | Generation-response JSON parsing | Fix initial `null` dead store only. Both try and catch assign before any read. Preserve invalid-JSON handling, image validation and workflow correlation. | No |
| 17 | `src/features/home-visualizer/entranceDetection.ts:20` | assignment | Analysis-response JSON parsing | Fix initial `null` dead store only. Both try and catch assign before any read. Preserve analysis and workflow-token behavior. | No |
| 18 | `src/features/hero/HeroDoorGenerator.tsx:41` | caught | Capture error forwarded to generation tooling | Defer: adding `cause` changes observable error propagation/diagnostics. | No |
| 19 | `src/utils/staleChunkRecovery.ts:39` | caught | Customer-safe stale-chunk recovery error | Defer: preserve recovery/error contract pending separate review. | No |
| 20 | `src/utils/pdf.ts:158` | unused | Legacy PDF implementation outside active export path | Defer: do not delete, export or otherwise alter legacy functionality solely to satisfy lint. | No |

## Implemented scope and remaining debt

Only #8 and #15–17 are implemented: one explicit-any assertion and three
provably unused initial values. No operations, branches, calls, catches,
normalization, algorithms, prompts or ordering rules are changed. The change
to the DEV planner is compile-time only; no planner SQL or live reads are
needed to verify it.

Verified clean-source result: **16 errors, zero warnings**: 13 explicit-any
findings, two caught-error findings and one unused legacy PDF function.
The eight unrelated dirty-tree errors remain separate and unchanged.

## Verification evidence

- Targeted ESLint: zero errors; complete isolated lint: 20 → 16 errors,
  zero warnings. Strict targeted TypeScript and production `tsc -b` / Vite
  build pass (existing large-chunk advisory remains).
- DEV planner transpiles to byte-identical JavaScript. The exporter and
  normalization source are unchanged. With fixed source commit `c13e3b8`,
  untouched-baseline and proposed exports are byte-identical: 4,565,054 bytes, SHA-256
  `99c26f21d3a15cb10ec35b3d1e5300bd2a2e9c2a3f222e4dfc3214631530daff`.
  These comparison runs supply the same test-only VM binding; unassisted
  export still reproduces the known missing-binding error. No live inventory
  reads, SQL execution or Supabase writes were needed.
- Configuration integrity passes: 54,723 prepared AI configurations, 807
  unique asset paths, zero missing/broken paths. All 86 PDF renderer cases,
  repeat determinism and mobile independence pass.
- Mocked API/image-preparation/security (47 checks), safe customer errors,
  workflow/entrance/generation usage correlation and stale-chunk recovery
  pass. The stale-chunk browser server required an elevated local rerun after
  sandbox startup was blocked; no application fix was needed.
- Homepage regression passes at 1440×1000, 820×1180, 1180×820, 390×844 and
  320×740, including all 22 images, lazy loading, failed/slow images, fades
  and reduced motion. Configuration-edit and mocked Visualizer UI pass on
  desktop and phone, including replacement, retries, errors and correlation.
- The additional lifecycle harness has a pre-existing stale accessible-name
  expectation: `Download completed home visualization photo`, versus the
  app's `Save completed home visualization image`. Its completed-result
  assertion fails identically in untouched `c13e3b8` and proposed fixtures;
  no test, label or behavior is changed to
  conceal that limitation. Stage cancellation/timeout safeguards pass.
- All 357 pre-existing pending files retain their original SHA-256 hashes.
  No paid AI calls, Supabase changes or unrelated source edits were made.

## Separate known issues — unchanged

1. The finish verifier's `Stain texture missing: stain-auburn` assertion already
   fails in the committed baseline. It is not a passing test or fixed here.
2. Unassisted export tooling lacks `doorStyleDisplayName` in its isolated VM.
   The pending `scripts/inventory/source.ts` binding fix is excluded. Export
   parity comparisons must disclose the same test-only binding supplied to
   both sides; they do not prove an unassisted export passes.
3. S/9 paint-clay CLiC strict pixel equality is intermittent. Phase 3 reproduced
   it once, then found identical assets/layers and focused pixels; full-sequence
   diagnostics found maximum channel-delta-1 differences elsewhere. Capture /
   rasterization nondeterminism is a hypothesis, not an established S/9 cause.
   No rendering, capture, catalog or tolerance changes belong in this batch.
