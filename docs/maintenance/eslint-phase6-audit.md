# Phase 6 ESLint audit — October 26, 2026

## Baseline and isolation

Clean committed `e84c48c` on `hgi/visualizer`: **16 errors / zero warnings**,
including 13 explicit-any findings, two preserve-caught-error findings and one
unused legacy PDF function. Refreshed remote has no unpublished commits.
All 356 original pending files were fingerprinted before edits. None of the
16 finding locations directly overlaps those pending files. Tests use a clean
archive rather than pending App, catalog, capture, styling or font changes.

Only two dictionary boundary annotations change, in the pure inventory
normalizer. Internal row modeling, operations, conditions, ordering, IDs,
normalization rules, serialization, errors and outputs are unchanged. This
does not modify inventory data or execute a DEV/database cleanup.

## Finding-by-finding review

Locations refer to the committed baseline. `any` below means
`@typescript-eslint/no-explicit-any`; `caught` means `preserve-caught-error`;
`unused` means `@typescript-eslint/no-unused-vars`.

| Exact file:line:column | Rule | Current purpose / correct type or behavior | Decision and risk | Pending overlap | Verification capable of supporting a change |
| --- | --- | --- | --- | --- | --- |
| `scripts/exportInventoryCatalog.ts:43:34` | any | Heterogeneous catalog row dictionary; a complete correction needs per-table field/relationship types rather than pretending every property is known. | Defer schema-wide typing; many export and planner consumers. | No | Strict tooling compilation, full export byte parity, table/relationship and negative-fixture checks. |
| `scripts/inventory/normalizeCleanup.ts:5:41` | any | Internal mutable row model with known `id` but table-specific fields and notes. A complete type needs discriminated table rows. | Defer; don't rewrite internal normalization assumptions or add guards in this batch. | No | Pure full-table normalization parity, idempotence, invalid width/context/coating/artwork fixtures and digest checks. |
| `scripts/inventory/normalizeCleanup.ts:20:77` | any | Input dictionary before the existing clone/row assertion. Individual external fields are genuinely unknown. | **Fix:** `Record<string, Record<string, unknown>[]>`; no changed reads, clone, guards or assertions. Low runtime risk: emitted JS identical. | No | Strict exporter/planner/normalizer TypeScript; emitted-JS identity; full export and normalization parity. |
| `scripts/inventory/normalizeCleanup.ts:23:67` | any | Generated row's heterogeneous field payload, only spread into the existing row model. | **Fix:** `Record<string, unknown>`; no changed spread or generated IDs. Low runtime risk: emitted JS identical. | No | Same strict typing, emitted JS, full export/normalization parity and negative fixtures. |
| `scripts/inventory/source.ts:36:43` | any | Cross-realm App constants/functions/Sets extracted by an AST-selected VM. Correct type requires modeling all extracted keys and callers. | Defer dynamic VM boundary; don't replace it with unchecked narrow assumptions. Deployed name binding remains intact. | No | VM extraction, cross-realm Set/function fixtures, all exporter consumer compilation and byte parity. |
| `scripts/inventory/source.ts:47:34` | any | Recursive conversion input; may contain primitives, functions, arrays, cross-realm Sets and arbitrary objects. Correct boundary starts at `unknown` with preserved narrowing/iterability semantics. | Defer; changing guards or Set detection could change exceptions or accepted values. | No | Cross-realm Set, spoofed constructor, primitive/undefined/function/object fixtures, unchanged failures and export bytes. |
| `scripts/inventory/source.ts:47:40` | any | Recursive conversion output; not simply strict JSON because undefined and other primitive values can pass through before serialization. | Defer alongside input; model output without changing conversion/serialization. | No | Same recursive conversion fixtures and exact serialization/export parity. |
| `src/features/home-visualizer/brushCleanup.ts:220:29` | any | Smoothing resource disposal list. Likely native Mat/MatVector union, but producer currently comes from dynamic OpenCV loader. | Defer runtime-module typing pending focused native binding/ownership coverage; no image-processing or cleanup edits. | No | Real OpenCV smoothing fixtures, allocations/disposal and failure paths, strict compilation and emitted-JS comparison. |
| `src/features/home-visualizer/brushCleanup.ts:282:20` | any | Inpainting resources; Mat allocations across Telea/non-Telea paths. | Defer with smoothing; preserve resource lifetime and optional destructor calls. | No | Native small-spot/patch/no-op/error fixtures, allocation/disposal checks and unchanged image bytes. |
| `src/features/home-visualizer/computerVision.ts:347:20` | any | Hardware cleanup resource list; native Mat/MatVector resources. | Defer native lifecycle typing; ordinary mocked generation tests do not exercise all cleanup branches. | No | Real OpenCV hardware fixtures, low-confidence/failure paths and ownership checks. |
| `src/features/home-visualizer/computerVision.ts:377:26` | any | Best contour retained from MatVector.get; prospective type is the verified native Mat binding. | Defer until producer/ownership branches are verified; no contour algorithm edits. | No | Selected/replaced/rejected contour disposal, scoring fixtures and emitted-JS comparison. |
| `src/features/home-visualizer/opencvLoader.ts:1:30` | any | Emscripten runtime dictionary; needs verified runtime API shape, not a blanket static module assertion. | Defer loader/initialization changes. | No | Module/default/promise initialization fixtures and real browser OpenCV availability. |
| `src/features/home-visualizer/opencvLoader.ts:8:36` | any | Default/module/promise interop before Mat/runtime-ready checks. Correct union must reflect actual package loading modes. | Defer; preserve promise identity, event timing and failure handling. | No | All import shapes, runtime-ready timing, single-load cache and initialization errors. |
| `src/features/hero/HeroDoorGenerator.tsx:41:9` | caught | UI records a capture error message, then throws a new Error with that message. Adding cause changes observable error metadata. | Defer propagation change; no automatic cause injection. | No | Capture failure/consumer contracts and safe diagnostic tests before approving cause propagation. |
| `src/utils/staleChunkRecovery.ts:39:7` | caught | Stale import recovery wraps raw chunk failure in customer-safe text. Preserve current message/reload behavior. | Defer cause/propagation change. | No | Stale chunk/storage/reload regression plus explicit cause and customer-message contract tests. |
| `src/utils/pdf.ts:158:16` | unused | Unused legacy PDF implementation, separate from active export. No deletion/export/activation is needed for current behavior. | Defer functionality removal or activation to a separate decision. | No | Legacy consumer inventory and dedicated legacy tests; 86 active renderer cases alone cannot prove legacy removal safe. |

## New lint count

**14 errors / zero warnings:** 11 explicit-any findings, two caught-error
findings, one unused legacy PDF function. Targeted normalizer lint is reduced
from three findings to one (the explicitly deferred internal Row index); it
is not reported as fully passing. No new findings or weakened rules.

## Runtime invariance evidence

The normalizer's emitted JavaScript is byte-identical to `e84c48c`, SHA-256
`781d6aeef700fe4a9b52ca64b12d9784e28b94a7fe05cd1446c2974c00649621`.
Strict TypeScript for the normalizer, exporter and DEV planner passes.

With fixed source commit `e84c48c`, complete exports before/after and repeated
proposed exports are byte-identical: 4,565,054 bytes, SHA-256
`d7fa83d08b0c5b7baeb06f5c19c35067609e07fec01efe3362031771106941f5`.
No VM shim or database calls are needed. The deployed VM binding is unchanged.

The original baseline function was also loaded directly from its committed
source and compared with the proposed function on all exported tables.
Outputs match exactly; inputs remain unmodified; a second normalization has
the same digest. Four invalid width, coating, context and artwork-location
fixtures throw the same messages before/after. These checks run entirely
in memory without DEV SQL or Supabase access.

## Regression results

- Strict normalizer/exporter/DEV-planner TypeScript and production TypeScript /
  Vite build pass; the existing large-chunk advisory remains.
- Clean full lint: 16 → 14 errors, zero warnings. Targeted normalizer:
  3 → 1 error, with only the unchanged internal Row finding remaining.
- Configuration integrity passes: 54,723 AI configurations prepared, 807 unique
  asset paths, zero missing/broken/deleted references.
- All 86 PDF renderer cases pass, including repeated determinism and mobile
  independence. No PDF code is changed.
- All 69 mocked lifecycle scenarios and desktop/mobile Visualizer UI pass.
  The 47 mocked API/image/security checks, customer-safe messages and workflow,
  analysis and generation correlation tests pass. No paid calls or records.
- Homepage desktop, tablet portrait/landscape and phone checks pass, including
  all 22 assets, lazy preloading, timing/fades, failure recovery and reduced
  motion. Configuration-edit passes at desktop and phone widths.
- Finish verification passes for all 26 paints, 21 stains, 21 thumbnail files,
  missing-slab rejection and four exact reference-capture pairs.
- Unchanged CLiC suite fails at `F/8/paint-clay/preview` strict pixel equality.
  This is the previously established browser paint/capture instability, not
  a new normalizer behavior change. It is **not** reported as passing. No
  renderer, artwork, browser options, thresholds or capture code was changed.

CLiC rendering, artwork, capture implementation and thresholds remain out of
scope. Its known browser paint/capture nondeterminism is recorded separately,
not counted as a new type-only regression or silently reported as passing.
