# CLiC — verified path and artwork mapping

Implementation guide: user-supplied **FeneVision CLiC — Expanded Verified Findings**, updated 19 October 2026. The report contains 34 additional observations, not an exhaustive crawl. Selected states and menu observations are different evidence levels. No Supabase records or published catalog were changed.

## Ordinary paths

Main IDs and existing artwork are retained. Names now identify CLiC in summaries/PDFs; `orderingCodes` retain the distinct ordering identity in the configuration snapshot. Submission text includes the verified code sequence and non-stock marker. Reusing pixels does not grant ordinary clear availability or codes.

All paths below are relative to `public/assets/` and exist. Existing opening masks, proportional overlay fitting, clear-base rendering and shared PDF/AI capture renderer are reused. **20 October correction:** CLiC EXTG now uses the same white grid artwork resolver as ordinary clear external grids, rather than the old SDL/*XX files. The matching clear artwork remains underneath in preview and PDF. This is pixel reuse only, not reuse of clear product availability or ordering codes.

| Verified FeneVision path | Builder ID | Reused artwork/rendering |
| --- | --- | --- |
| F: CLIC → NOGRID | f-clic-nogrid | hgi-assets/Glass/F/CLEAR STOCK/FF10.webp |
| F: CLIC → EXTG → 8L | f-clic-ext-8l | hgi-assets/Glass/F/INTERNAL GRIDS/FINT8LWH.webp |
| F: CLIC → EXTG → 10L | f-clic-ext-10l | hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LWH.webp |
| F: CLIC → EXTG → 15L | f-clic-ext-15l | hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LWH.webp |
| F48/F482: CLIC → NOGRID | f48-clic-nogrid | hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp; existing shared F482 overlay mapping |
| F48/F482: CLIC → EXTG → 12L | f48-clic-ext-12l | hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp; customer-confirmed detailed/contoured artwork, shared F482 mapping |
| S: CLIC → NOGRID | s-clic-nogrid | hgi-assets/Glass/S/DECO/SF5.webp; existing plain-clear artwork despite legacy DECO directory |
| S: CLIC → EXTG → 4L | s-clic-ext-4l | hgi-assets/Glass/S/INTERNAL GRIDS/SINT4LWH.webp |
| S: CLIC → EXTG → 9L | s-clic-ext-9l | hgi-assets/Glass/S/INTERNAL GRIDS/SINT9LWH.webp |
| FSL: CLICS → NOGRID | scoped clic-nogrid | Existing FSL slab + masks/Sidelites/FSL.png + rendered clear base; no decorative overlay |
| F48SL: CLICS → NOGRID | scoped clic-nogrid | Existing F48SL slab + masks/Sidelites/F48SL.png + rendered clear base |
| SSL: CLICS → NOGRID | scoped clic-nogrid | Existing SSL slab + masks/Sidelites/SSL.png + rendered clear base |

Main sequences additionally record NONSTOCKGL; sidelite sequences record NONSTOCKSLGL. These flags make no pricing/delivery promise. Existing ordinary clear catalogs and grid rules are not reused as CLiC availability. No internal/external sidelite grid choice is added to ordinary CLiC. S2SL and CR14SL receive no CLiC declaration.

FSLENTL.webp and FSLENTR.webp remain on disk, but are no longer selectable as CLiC or included in the generated fallback manifest. Their decorative identity remains unresolved. Saved entl/entr selections are cleared before mounting; direct submissions naming CLiC Left/Right are rejected rather than reinterpreted.

## Coverage and existing contradictions

`src/data/clicGlass.ts` owns the conservative coverage guard, shared by builder filtering and submission validation. Existing slab/material/sidelite compatibility still applies first; this guard does not add products to a material family.

| Material/grain | Single main | French main | Savannah main |
| --- | --- | --- | --- |
| Paintable/Stainable Steel | F, F48, S | F | F |
| Smooth Steel | F, F48, F482, S | F, F48, F482, S | F |
| Signature Cherry | F, F482, S | F, F482, S | Not enabled |
| Signature Fir | F | Unverified; not enabled | Not enabled |
| Signature Mahogany | F, F48, S | Selected F48 summary insufficient to verify dependencies; not enabled | Not enabled |
| Signature Oak | F, S | Unverified; not enabled | Not enabled |
| Brushed Smooth Fiberglass | F, F482, S | Unverified; not enabled | Not enabled |
| Textured Fiberglass | F, F48, S | Unverified; not enabled | Not enabled |

Single CLICS/no-grid is allowed on existing compatible FSL/F48SL/SSL options within these verified opening branches; Fir is FSL only. French sidelite coverage is limited to PSNC/FSL and Cherry/FSL/F48SL/SSL. Smooth Steel French sidelite branches and all Savannah sidelites remain unverified, so CLiC is not enabled there.

The report observes Single 36 × 80 and 12 × 80 hinge-side sidelites and earlier 72 × 80 double-unit paths. The builder has no manufacturing size selector/dimension model; this change does not establish any additional size coverage or add sizes. Side/frame/swing cross-products remain unverified. The guard describes observed material/opening branches, not an independently verified cross-product of every choice.

Contradictions preserved for separate review:

- Brushed Smooth Fiberglass resolves to asset family `20-gauge`, which lacks SSL; the report offers SSL. Expected slab/mask resolver returns no binding; existing alternative FSL/F48SL is **not** substituted for SSL. Blocked pending compatible SSL slab binding/confirmation.
- Signature Oak has no FSL in `SIDELITE_SLABS.oak`, although the report offers it. No verified Oak/FSL slab path exists in that mapping. Existing F48SL/SSL are alternatives for the customer, not substitutes. Blocked pending Oak/FSL artwork/binding review.

## Separate Signature Fir SDL panel branch — blocked, not approximated

Verified configuration: Single / FGSSNC / FIRG / F / FSL, 36 × 80 main and 12 × 80 hinge-side sidelite.

| Verified option | Evidence | Required artwork mapping | Available alternatives |
| --- | --- | --- | --- |
| SDL + SDL2PNL + CLIC + NOGRID | Individually selected | No verified panel-to-artwork path found | Existing F8LXX/F10LXX/F15LXX are lite-count overlays, **not** verified SDL2PNL artwork |
| SDL3PNL–SDL7PNL | Menu observed only | No verified paths found for any of these panel codes | Generic SDL/internal grid art must not be inferred as panel art |
| SDLSL + SDL3PNLSL + CLICS + NOGRID | Individually selected | No verified panel-to-artwork path found | FSLINT3L*.webp represents 3-lite grids, **not** verified SDL3PNLSL artwork |
| SDL2PNLSL, SDL4PNLSL–SDL7PNLSL | Menu observed only | No verified paths found | Existing FSL 2–5-lite geometry does not establish panel mappings |

Repository filenames, declarations and available Git history contain no SDL2PNL–SDL7PNL / SDL2PNLSL–SDL7PNLSL mapping. An expected filename cannot honestly be supplied: the missing item is the approved **panel code → artwork/geometry binding**, not a proven missing file at a known path. No replacement art was generated and no panel choice is exposed with invented geometry. Ordinary Fir CLiC remains available. The separate SDL controls are deferred until these bindings are verified; their absence must not be interpreted as FeneVision incompatibility. When implemented, SDL must be separate from ordinary grid options and suppress EXTG as the report describes.

## Verification

Run `node --import tsx scripts/verifyClicGlass.ts` for ordinary codes, coverage guards, saved legacy rejection, desktop/tablet/phone flows and 33 CLiC PDF canvas renders. No paid AI requests or production writes are made. Full regression/build results and known pre-existing test limitations are reported with the completion summary.

Completed checks:

- CLiC suite: 9 UI flows at 1280/768/390px and 33 glazed PDF renders passed, including required clear-base and exact overlay-path checks.
- Existing PDF suite: 86 configurations passed, including template checks, determinism, mobile independence and missing-asset handling.
- Configuration integrity: 812 unique asset paths checked; zero missing assets, broken dynamic paths or deleted-raster references.
- Draft persistence, customer glass visibility and Signature-only compatibility regressions passed.
- Mocked AI generation/detection regressions passed; no real AI generation was attempted.
- `tsc -b`, production build and `git diff --check` passed. Existing large-chunk build warnings remain.
- Official current Vercel schema validation passed, including rejection of the previously invalid includeFiles array and overlong string.
- Regenerated manifest verified: 625 assets, 581 reference groups, 79,520 resolver cases. Local Vercel Node-builder packages contained all 625 generation assets and zero detection product assets. These are local package checks, not a deployed-size claim. The local Node builder still prints pre-existing ErrorOptions/Error.cause and ImportMeta.env diagnostics in unchanged files; it completes packaging and the package assertions pass. Normal project TypeScript/build checks pass.
- Broader `test:submission` remains blocked by its existing Savannah expectation of “Locks on Both Doors.” The untouched HEAD implementation was separately loaded and returns “Lock on Main Door Only,” reproducing the baseline mismatch. Neither that expectation nor Savannah behavior was changed for this task. CLiC-specific submission assertions passed in the new suite.

Supabase and the published catalog were not modified. Pending font changes were excluded from the CLiC commit. Original ENTL/ENTR files were retained.

## 20 October external-grid artwork follow-up

- Shared `externalGridArtwork(opening, pattern)` extracts ordinary clear's existing white-template resolution. Both ordinary clear external previews and canonical CLiC catalog records use it. The directory name INTERNAL GRIDS is historical; this is the existing external-preview artwork, not new internal-grid availability. SDL resolution is left alone.
- The six required files exist. Unknown opening/pattern pairs return no mapping; CLiC catalog construction fails explicitly rather than silently choosing another grid. No source artwork was changed or deleted.
- Capture readiness now matches rendering: F/F48/S render the authored clear base directly; only F482 requires a fitted base. Waiting for a fitted base on every opening prevented configured AI references from becoming ready. Actual image decoding/loading remains required.
- `scripts/verifyClicExternalGrids.ts` compares ordinary clear and CLiC using paint Clay and stain Nutmeg, all six patterns, and both F48/F482 openings. All 14 comparisons / 42 pixel-equality checks passed across live preview screenshots, PDF canvas images and real `ConfiguredDoorSource` captures. All side-by-side screenshots were visually inspected; outputs are in `/private/tmp/hgi-clic-external-grids`.
- Existing CLiC checks passed (9 responsive flows, 33 PDF renders), as did the 86-case PDF suite. Configuration integrity checked 806 distinct paths with zero missing assets or broken dynamic paths. TypeScript, production build and diff checks passed. Existing large-chunk warnings remain.
- Regenerated AI manifest: 623 assets / 579 reference groups / 79,520 resolver cases. Actual local Vercel packages were verified: all 623 generation assets present, zero detection assets. Existing local Node-builder diagnostics described above remain; package assertions pass. No deployed-size or real paid AI-generation claim is made.
- CLiC rules/codes, no-grid selections, sidelite CLiC, Fir SDL deferrals and frame/grid finish behavior remain unchanged. Ordinary clear availability is not expanded (including its current F48 external-location visibility restriction); the F48/F482 comparison uses the existing resolver/template at the rendering boundary, not newly exposed clear options.

## Customer-confirmed three-quarter 12-lite correction

The customer explicitly confirmed `F48F1248WH.webp` as the intended detailed/contoured artwork for **F48/F482 CLiC 12 Lite only**. It is historically cataloged as “12 Lite External”; the correction does not rename ordinary products or infer another ordering category.

Only the canonical `f48-clic-ext-12l` overlay mappings for F48/F482 now use `/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp`. The option label and `CLIC / EXTG / 12L / NONSTOCKGL` codes remain unchanged. The ordinary-clear external/contoured resolver still returns `F48INT12LWH.webp`, and other CLiC patterns, no-grid, sidelites, Fir SDL, grid tint flags and frame finish logic are untouched. The previous follow-up's F48/F482 identical-to-ordinary-clear comparison is superseded for this intentional artwork difference.

Verification: `verifyClicExternalGrids.ts --three-quarter-only` passed four paint-Clay/stain-Nutmeg comparisons and 12 pixel-equality checks against the explicitly approved artwork reference across live preview, PDF and real configured-door AI-reference capture. It also asserts the intended visual difference from unchanged ordinary clear. The four side-by-side outputs were visually inspected. The broader visual run was terminated before completion; focused verification was rerun successfully with reduced image memory use. Existing CLiC regression checks passed nine responsive flows and 33 PDF renders. Integrity checked 807 distinct paths with zero missing/broken references; TypeScript, production build and diff checks passed (existing chunk-size warnings remain).

The asset was already included in the AI reference manifest, so no manifest update was required. The generator consistency check and reference loading suite passed with 623 assets, 579 groups and 79,520 resolver cases. No paid AI generation or Supabase/published-catalog writes occurred. Pending font changes remain excluded.
