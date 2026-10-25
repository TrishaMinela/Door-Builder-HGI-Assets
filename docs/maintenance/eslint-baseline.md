# ESLint baseline

## Phase 3 — October 25, 2026

Reassessed production branch `hgi/visualizer` at `ff6a21e`, including the
deployed AI workflow-correlation fix `1a87c57`. There were no unpublished
commits. A clean committed-source fixture reports **41 errors / 0 warnings**,
not the historical 75 below. The unrelated dirty/untracked work contributes
eight additional errors and is excluded from this batch.

This batch resolves **21 explicit-any findings**: 17 in the inventory exporter
and four in the finish verifier. The proposed clean source reports **20 errors /
0 warnings** (14 explicit-any findings and the six deferred findings). No rule
is disabled. The dynamic database-row/VM boundaries and all production
Visualizer utilities are deliberately unchanged.

Remaining findings:

- 14 explicit-any findings: exporter row boundary (1), inventory normalization
  (3), private-source extraction (3), DEV cleanup preparation (1), and production
  brush/computer-vision/OpenCV utilities (6).
- Three potentially meaningful unused assignments in Visualizer utilities.
- Two caught-error preservation findings.
- One unused legacy PDF function.

### Behavior and verification boundaries

- The exporter's emitted JavaScript is identical before/after typing. With a
  fixed source commit and identical inputs, complete inventory export bytes
  are identical: 4,565,054 bytes, SHA-256
  `14c1d268ff63471ec25cb6ed672959d68a2c3d66256ecf6d9cf37bf3e47137ea`.
- The committed private-source VM lacks the existing `doorStyleDisplayName`
  binding and cannot complete an unassisted export. Both comparison runs use
  that same binding injected only into the isolated comparison process. The
  already-pending `scripts/inventory/source.ts` fix is not included or edited.
  This is an existing export-tool limitation, not a passing unassisted export.
- `verifyFinishAssets.ts` fails at `Stain texture missing: stain-auburn` in both
  the untouched committed script and the typed script. Its older assertion
  expects a finish-thumbnail path in the PDF's resolved assets. That assertion
  and the renderer remain unchanged; the test is not reported as passing.
- Strict targeted TypeScript and the production TypeScript/build pass. All 86
  PDF cases, configuration integrity, configuration-edit (desktop/mobile),
  mocked AI API/security/UI and usage/workflow-correlation checks pass.
- Homepage checks pass at desktop, tablet portrait/landscape and phone widths,
  including all 22 images, 5-second rotation, 700ms fades, failure recovery,
  lazy preloading and reduced motion.

The separate read-only S/9 paint-clay CLiC assessment is not a rendering fix
and does not change catalog rules, rendering files, or pending capture work.

### Separate S/9 paint-clay assessment

The original dirty-tree `verifyClicExternalGrids.ts` run reproduced the exact
`S/9/paint-clay/preview` pixel-equality failure. It is intermittent: two focused
clear/CLiC pairs in each of the dirty and clean fixtures, plus repeat captures,
were pixel-identical in preview, settled preview, PDF, and AI reference output.

Both options resolve the same `Half Lite - Smooth.webp` slab, `masks/S.png`,
`Glass/S/DECO/SF5.webp` clear base, and
`Glass/S/INTERNAL GRIDS/SINT9LWH.webp` overlay. Their fitted-overlay bitmap
hashes, layer counts and fractional screen bounds also match. No verified
catalog/availability or duplicated-overlay difference was found.

A full-sequence clean diagnostic completed S/9 successfully but found
one-channel-level differences elsewhere (F48/12 paint-clay: 9,250 preview
pixels and 47,605 AI-reference pixels, maximum channel delta 1; PDF identical).
This supports browser rasterization/capture nondeterminism at fractional
geometry as the likely source of strict pixel-equality flakiness, rather than
a confirmed S/9 artwork mapping defect. The exact failed S/9 pixel delta was
not retained by the original aborting test, so that causal link is not proven.
No tolerance, readiness logic, rendering, catalog, or capture code was changed.

## Historical tooling-restoration baseline

ESLint tooling was restored on October 24, 2026. A clean checkout of the
pre-maintenance `HEAD` reports 75 existing lint errors and zero warnings. The
maintenance changes introduce no additional lint errors. The active working
tree also contains eight errors from unrelated dirty or untracked work, for a
current total of 83 errors.

Repository-wide lint is therefore functional but not yet passing. Existing
findings remain visible and no correctness rules are globally suppressed.

Recommended cleanup: resolve the baseline incrementally by rule and subsystem,
starting with unused imports/variables and empty blocks, followed by replacing
explicit `any` types and addressing ESLint 10 correctness findings. Keep each
cleanup batch behavior-preserving and covered by its relevant regression tests.
