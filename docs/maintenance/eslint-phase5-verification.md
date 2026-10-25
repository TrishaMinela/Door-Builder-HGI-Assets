# Phase 5 verification reliability — October 25, 2026

## Isolation and baseline

Production branch `hgi/visualizer`, committed baseline `df349d1`: 16 ESLint
errors, zero warnings; no unrelated unpublished commits. Tests run from a
clean archive, not the dirty application/catalog tree. The 357 original
pending files are fingerprinted separately and excluded from the initial batch;
the explicitly approved binding follow-up below includes only its named file.

No application, product, rendering, prompt, PDF layout, compatibility,
credential, Supabase or inventory publication behavior changes.

## Confirmed verification corrections

### Lifecycle harness

The deployed application uses accessible label `Save completed home
visualization image`. The harness still expected `Download completed home
visualization photo`. Only that expectation changes, not the customer button.

Once unblocked, the harness exposed obsolete missing-image and API-error
expectations from before customer-safe messaging. Those now assert the
existing `CUSTOMER_AI_MESSAGES.AI_GENERATION_FAILED` message. An additional
negative assertion verifies raw `Mock API failure` provider text is not shown.
All slider, cancellation, request-count, replacement, retry, configuration,
image-loading and recovery assertions remain intact. All 69 scenarios pass
at 1280, 768 and 390 pixels, entirely mocked.

### Finish verifier

Baseline fails at `Stain texture missing: stain-auburn`. The assertion treats
`finish.image` (the card thumbnail) as a PDF surface dependency. In fact,
`prepareSurface` colors the authored grained slab selected by
`resolveDoorPreviewCandidates`. The renderer does not read the card thumbnail.

The corrected verifier checks the actual resolved slab, with URL pathname
normalization for `HTMLImageElement.src`, and verifies each stain renders
identically with an unavailable thumbnail URL. Existing thumbnail existence,
name/color, count, paint-regression and reference-pixel assertions remain.
A fresh browser page blocks required assets and confirms missing slab art
still rejects instead of silently rendering without grain. It uses the
existing browser-evaluation `__name` shim, not application changes.

Result: 26 paints, 21 stains, all 21 thumbnails, missing-slab rejection and
four exact reference-capture pairs pass; zero legacy paint-image requests.

### Inventory VM binding — approved follow-up

Committed `scripts/inventory/source.ts` omits `doorStyleDisplayName` from
the isolated VM even though selected App declarations call it. The exact
two-line import/context correction already exists in the original pending
tree. It was excluded from initial Phase 5 commit `4464c53`. The user then
explicitly approved including those exact two lines in a follow-up; no other
pending inventory changes are included.

Baseline and proposed exports, both supplied the same test-process-only VM
binding, are byte-identical: 4,565,054 bytes, SHA-256
`0f6b77b7fbd86d10d291ca9f37a7a405dbf65bea5a181bd291d0384b0e7f3706`,
using fixed source commit `df349d1`. This is export parity, not proof that
unassisted export succeeded before the follow-up. No catalog data/normalization
changed.

With the approved binding, export completes without a VM monkey patch. Using
fixed source commit `4464c53`, its output exactly matches the baseline with
the former test shim: 4,565,054 bytes, SHA-256
`ef39fe15b4f1267d3a458195f71241b74229334571dc3fdc544a1d1395b93663`.
Strict TypeScript for the extractor and the production build pass; lint
remains 16 errors. Of the original 357 pending files, only this explicitly
approved file is committed; the other 356 retain their original bytes.

### Intermittent S/9 paint-clay mismatch — not fixed

Untouched baseline and proposed full suites each pass 14 comparisons / 42
exact preview, PDF and AI-reference pixel checks, including S/9 paint-clay.
This does not disprove the previously observed intermittent mismatch.
Browser rasterization/capture timing remains a hypothesis, not a confirmed
rendering defect. No renderer, assets, fitting, tolerance or equality changes.

Previously the assertion aborted before retaining the mismatched images.
The verifier now writes both original PNGs and a JSON delta/asset report
before the same strict assertion. A synthetic one-pixel/channel-delta-1 unit
exercise verifies both originals and exact metrics are retained. This improves
future diagnosis; it does not make a mismatched comparison pass.

## Remaining lint audit — unchanged, 16 errors

All findings retain the risk assessment in `eslint-phase4-audit.md`:

| File (baseline line) | Rule / count | Decision |
| --- | --- | --- |
| `scripts/exportInventoryCatalog.ts:43` | explicit-any, 1 | Heterogeneous row boundary; defer schema-wide typing. |
| `scripts/inventory/normalizeCleanup.ts:5,20,23` | explicit-any, 3 | Mutable dynamic normalization; defer transformation/schema changes. |
| `scripts/inventory/source.ts:35,46,46` | explicit-any, 3 | Cross-realm values/JSON conversion; overlaps pending work; defer. |
| `src/features/home-visualizer/brushCleanup.ts:220,282` | explicit-any, 2 | Native image-processing resource ownership; defer. |
| `src/features/home-visualizer/computerVision.ts:347,377` | explicit-any, 2 | Native resources/contours; defer image-processing changes. |
| `src/features/home-visualizer/opencvLoader.ts:1,8` | explicit-any, 2 | Emscripten initialization/import shapes; defer runtime changes. |
| `src/features/hero/HeroDoorGenerator.tsx:41` | preserve-caught-error, 1 | Observable error propagation; defer. |
| `src/utils/staleChunkRecovery.ts:39` | preserve-caught-error, 1 | Recovery/error contract; defer. |
| `src/utils/pdf.ts:158` | unused legacy function, 1 | Preserve PDF functionality; defer. |

No lint suppression or runtime typing rewrite is introduced. Targeted lint
passes; clean full lint remains 16 errors / zero warnings, not a passing lint
suite. Unrelated pending work contributes eight additional errors.

## Verification boundaries

- Production strict TypeScript and build pass (existing chunk-size advisory).
- Additional standalone strict compilation of the three browser scripts
  reports the same 19 Window-cast diagnostics before and after, normalized
  for shifted line numbers. These pre-existing script diagnostics are not
  fixed or reported as passing; scripts are outside the application tsconfig.
- Configuration integrity and all 86 PDF renderer cases pass.
- Mocked API/image/security, safe customer errors and AI workflow/analysis/
  generation correlation pass; no paid requests or Supabase writes.
- Responsive homepage, configuration-edit and mocked Visualizer UI regressions
  are verified separately from the 69-scenario lifecycle test.
- `git diff --check` and original pending-file fingerprints are checked before
  committing only this maintenance batch.
