# Pre-Phase-5 paint asset cleanup

Status: **DEV cleanup verified; exactly 25 paint WebPs deleted on October 13, 2026. All 21 stain texture files remain unchanged.** No Production database access/deployment or catalog publication. This checkpoint is being committed/pushed at the user's explicit request.

## Changes

- `src/data/options.ts:toFinish` supplies an empty image string for paint and keeps the exact existing stain texture path for stain. All 47 IDs, names, hex values, ordering, compatibility and ProMatch values remain unchanged.
- No picker, preview, PDF or Visualizer algorithms were changed. Empty paint image strings remove a declared dependency that no paint render branch used.
- The exporter binds only the 21 stains. Its normalized v2 manifest has 919 assets instead of 945; 26 obsolete paint declarations are absent, including already-missing Wineberry. Source arrays and memberships are not removed.
- The proposed DEV transition removes 26 paint finish bindings and their 26 unshared asset metadata rows, changes only paint `notes.source.image`, and keeps all 21 stain bindings. Shared asset dependencies are checked before metadata deletion.
- The native shadow snapshot skips empty image strings. The database resolver still compares actual bindings; it does not silently ignore stale DEV paint bindings.

## Deleted files — exact audited list

**Deleted files: exactly the 25 paths below (18,808 bytes).** The actual DEV catalog has zero paint finish bindings/paint asset rows, the cleaned export omits them, and post-apply checks passed before removal. After removal, the asset audit reports zero missing references, zero unused paint/stain files, and only the unrelated older auto-fit example as unused. No other raster was removed. Deleted paint files remain recoverable from Git history.

- `public/assets/finishes/paint/black.webp`
- `public/assets/finishes/paint/blue-bayou.webp`
- `public/assets/finishes/paint/brown.webp`
- `public/assets/finishes/paint/clay.webp`
- `public/assets/finishes/paint/coastal-plain.webp`
- `public/assets/finishes/paint/cozy-cottage.webp`
- `public/assets/finishes/paint/crabapple.webp`
- `public/assets/finishes/paint/daffodil.webp`
- `public/assets/finishes/paint/desert-tan.webp`
- `public/assets/finishes/paint/eggshell.webp`
- `public/assets/finishes/paint/eldridge-gray.webp`
- `public/assets/finishes/paint/forest.webp`
- `public/assets/finishes/paint/iron-ore.webp`
- `public/assets/finishes/paint/lime.webp`
- `public/assets/finishes/paint/mocha.webp`
- `public/assets/finishes/paint/musket.webp`
- `public/assets/finishes/paint/navy.webp`
- `public/assets/finishes/paint/orange-krate.webp`
- `public/assets/finishes/paint/pacific-blue.webp`
- `public/assets/finishes/paint/pewter.webp`
- `public/assets/finishes/paint/positive-red.webp`
- `public/assets/finishes/paint/sour-grape.webp`
- `public/assets/finishes/paint/terratone.webp`
- `public/assets/finishes/paint/white.webp`
- `public/assets/finishes/paint/wicker.webp`

Wineberry has no file to delete and needs no replacement. Its hex #3F0D04 remains valid.

## Post-deletion verification

- Dedicated `node --import tsx scripts/verifyFinishAssets.ts`: all 26 paints produce identical PDF pixels using current empty-image vs legacy-image fixtures; all 21 stain textures are loaded for stained glass frames; missing stain texture is rejected; four AI configured-reference capture pairs are identical; zero paint image requests and zero paid AI requests.
- Existing configuration integrity: 4,688 finish/material choices, 786 paths, 50,381 prepared AI configurations; zero missing/broken assets.
- Existing PDF renderer: all 24 cases pass, including desktop/mobile/tablet/DPR-independent output and download checks.
- TypeScript app/tooling and production build pass (existing large-chunk warning).
- Asset audit pass: missing references []; zero paint files remaining; all stain texture dependencies retained. Total raster/image assets: 1,547, down from 1,572; total bytes reduced by exactly 18,808.
- Product render suite: 304 configurations / 235 coverage dimensions; zero failed image loads, blank outputs or runtime exceptions.
- Actual committed DEV shadow suite: 41,480/41,480 matches across 2,440 contexts, zero mismatches; not an in-memory plan.
- Full actual DEV catalog parity: 13,625 inventory records across 41 product/data tables match the current cleaned source manifest after explicit UUID/parent remapping. No missing, extra or changed exported facts. Original asset provenance and revision lineage are intentionally retained.
- Actual schema/cleanup fingerprint verified, DRAFT and unpublished; zero paint bindings, all 21 stain bindings intact. Verification used only authenticated GET requests to HGI Portal Dev.
- All 21 local stain SHA-256 checksums match the pre-deletion snapshot exactly. No stain file was staged for modification/deletion.
- Remaining paint-path strings occur only in historical documentation and explicit test fixtures/assertions checking that legacy URLs are never loaded; no dead runtime paint-image references remain.

## Completed stopping point

1. Rollback-only dry run and real DEV application both succeeded with the expected fingerprint.
2. Re-read actual DEV catalog and live shadow comparisons passed; schema and catalog status verified.
3. These 25 files have no active runtime/export/DEV dependencies. Historical documentation/revision provenance is not a live asset load.
4. User explicitly authorized removal, commit and push; exactly the audited files above were removed.
5. Asset/integrity/PDF/finish capture/304-product-render/live-shadow/TypeScript/build/whitespace checks were rerun after removal. Original physical texture/material assets were retained.

No stain, material/grain art, masks, hardware swatches or unrelated auto-fit image was deleted. Phase 5 was not started; no catalog was published; runtime inventory authority remains hardcoded. Git checkpoint message: `refactor: clean inventory schema and finish assets`.
