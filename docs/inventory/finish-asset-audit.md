# Finish/color asset audit — before Phase 5

> Historical audit snapshot below. Follow-up completed October 13, 2026: the 25 unused paint WebPs were deleted after actual DEV parity and rendering verification. The 21 required stain textures remain byte-for-byte unchanged. See `paint-asset-cleanup.md` and `grid-prairie-cleanup.md` for the final checkpoint and exact deletion list.

Reviewed October 12, 2026 against commit `4dd335eefd7e6811d2ac5d1ab8a6801f4715db2c`.

**Audit only. No file deleted, no runtime code changed, no Supabase write or publication, no Production access, no commit.**

## Conclusion

**Paint can use the existing hex-first finish rendering without its paint WebP files. Stain cannot universally become hex-only without changing current output and export behavior.**

Slab and sidelite surfaces use the selected hex plus the actual door/sidelite artwork's material detail and masks. Jamb/frame uses selected color and procedural relief. However, **stain WebPs are used as glass-frame/bezel textures**, as well as stain picker thumbnails. The same textured glass-frame layers enter AI configured-reference capture, and the PDF renderer explicitly preloads and composites them.

**Wineberry does not need a WebP for today's runtime.** Its missing declared image is non-blocking. This deeper rendering audit supersedes the previous Phase 4.5 suggestion to supply a Wineberry swatch merely for a uniform image-backed contract. Do not add an image just to satisfy an unused paint declaration.

## 1. Counts and classification

Scope: `public/assets/finishes/paint/*.webp` and `public/assets/finishes/stain/*.webp`, and the matching finish declarations in `src/data/options.ts`. Hardware finish artwork/swatches, slab material/grain artwork, glass, masks, ProMatch branding and the Timber/Clad card illustrations are separate assets and **are not deletion candidates under this audit**.

| Group | Existing files | Declared finish paths | Bytes on disk | Meaning |
| --- | --- | --- | --- | --- |
| A. REQUIRED | 21 | 21 | 117802 | All stain WebPs: picker and glass-frame texture dependencies |
| B. OPTIONAL SWATCH ONLY | 0 | 0 | 0 | None: stains are also render textures; paints are not loaded as swatches |
| C. FALLBACK ONLY | 0 | 0 | 0 | None: finish hex is primary paint rendering, not a fallback image |
| D. SAFE TO DELETE — customer-rendering candidates | 25 | 25 | 18808 | Existing paint WebPs unused by the inspected customer render paths |
| Missing, not required | 0 files | 1 path | 0 | Wineberry paint WebP; no file exists to delete |
| TOTAL | 46 | 47 | 136610 | 26 paint finish declarations; 21 stain declarations |

There are no unlisted/unmapped files in those two finish directories. Paint files are 82×82; stain files are 256×256. Existing paint files total **18,808 B (~18.4 KiB)**; stains total **117,802 B (~115.0 KiB)**. Total finish files: **136,610 B (~133.4 KiB)**. Removing paints would save little deployment space, not eliminate a large payload.

**“Safe to delete” here means no identified customer-visible image dependency, not permission to remove files today.** The paint paths remain declared in Finish.image, serialized/cached metadata, the DEV manifest and shadow comparisons. A later authorized cleanup must reconcile these contracts and verify parity first. None was deleted.

If counting *declared paths* instead of existing files: A=21, B=0, C=0, D=26 unused/nonrequired paint declarations, of which one is already missing. The physical safe-to-delete file count is **25**, not 26.

## 2. Trace through every consumer

| Consumer | Paint WebP | Stain WebP | Evidence / responsibility |
| --- | --- | --- | --- |
| Raw palette | No image here | No image here | src/data/finishes.ts: paintColors/stainColors contain id/name/hex/ProMatch |
| Finish object factory | Path declared | Path declared | src/data/options.ts:toFinish produces finish ID, image path, color, accent and kind |
| Main finish picker | Not loaded; hex background | Loaded in img; hex background remains if load fails | src/App.tsx:2112; CSS finish-tile-flat vs finish-tile-stain |
| Jamb color picker (currently hidden) | Not loaded; hex background | Loaded for stain Timber if selector enabled | src/App.tsx:2117; clad paint uses hex; controls retained behind builderUx |
| Glass-frame picker (currently hidden) | Not loaded; hex background | Loaded for matched/custom stain choices if enabled | src/App.tsx:2124–2125 |
| Main slab live rendering | No finish WebP | No finish WebP | DoorPreview.tsx:82–100, 881–884, 1046–1048: color fill plus slab-derived detail image/mask |
| Sidelite surface live rendering | No finish WebP | No finish WebP | DoorPreview canonicalSurfaceFinishStyle/canonicalSurfaceDetailStyle passed to DoorFrame |
| Jamb/mullion live rendering | No finish WebP | No finish WebP | DoorPreview passes finishColor/finishType to DoorFrame; procedural material shading, no Finish.image |
| Main/sidelite glass-frame live rendering | Hex tint only | Actual backgroundImage texture | DoorPreview.tsx:894 and 914 use glassFrameFinish.image when stain |
| PDF slab/sidelite rendering | No finish WebP | No finish WebP | pdfProductRenderer.ts:55–80 fills finish.color and multiplies source slab detail |
| PDF jamb/mullion rendering | No finish WebP | No finish WebP | pdfProductRenderer.ts:180–193 uses color-derived gradient |
| PDF glass-frame rendering | Hex tint only | Loads WebP and multiplies texture | pdfProductRenderer.ts:162 preloads stain image; 195–208 drawGlassFrame |
| Final PDF | Already-rendered PNG plus text/color data | Already-rendered PNG including textured frames | App.tsx:1573–1574 renders PDF product; pdf.ts:377 requires previewDataUrl, line 447 embeds it; does not directly read finish.image |
| AI configured entrance reference | No paint WebP | Stained frame CSS texture rasterized | ConfiguredDoorSource.tsx:66 calls captureFinalDoorPreview on live DoorPreview; captureDoorPreview.ts:materializeMaskedLayers explicitly loads backgroundSource |
| AI image preparation / server | Not a separate finish reference image | Not a separate finish reference image; texture embedded upstream | aiVisualization.ts prepares completed capture; server/aiDoorVisualization.ts:224–228 records name/type/hex |
| Cache/config data | Path string retained | Path string retained | App.tsx:937 finishImage and :964 jambFinishImage contribute to configuration key; not network loads |
| Supabase exporter/bindings | Declared finish_swatch binding | Declared finish_swatch binding, actually multipurpose texture | exportInventoryCatalog.ts:86–87 imports all Finish.image declarations unconditionally |
| DEV shadow comparisons | Path compared, not rendered | Path compared, not rendered | inventoryShadowSemantics.ts:65 and :117 resolve bindings for every visible finish |

### Primary finish appearance

Main slab and sidelite color is primarily **hex plus material artwork**, not a finish swatch bitmap. The base slab/sidelite image supplies panel relief, grain and geometry; grayscale/multiply contrast and stain saturation complete the surface. A hex alone cannot reproduce a door without those material assets. Do not remove slab grain/detail images or masks along with swatches.

The jamb uses the configured hex with procedural shadows/highlights/material styling; it does not sample its finish WebP. Glass frames are the exception: the stain WebP is an actual mapped texture, not just a convenience thumbnail.

Hidden glass-frame questions do not disable frame rendering. `builderUx.showGlassFrameColorSelection=false` resolves a matching finish through `matchedGlassFrameFinish / resolvedGlassFrameFinish / appliedGlassFrameFinish` in App. A stain door can therefore receive a stain glass-frame texture without visiting a color selector. Retained custom/restored frame selections also matter. Do not classify these images unused merely because the selector is hidden.

The PDF renderer currently includes a stain glass-frame image in its preload list whenever a stain glassFrameFinish is supplied, even if the current glass mask eventually provides no frame to draw. A missing texture can fail that request before drawing. Changing this preload behavior is out of scope and was not attempted.

### Fallbacks

- Stain picker images have an onError handler that hides a failed image, leaving the configured hex tile. This is a degraded appearance, not proof that deletion preserves output.
- CSS stained frame backgrounds can fall back visually to their color fill, losing the texture.
- AI capture materializes masked backgrounds with an explicit image load; failure rejects the capture rather than silently retaining hex.
- PDF `loadPdfImage` rejects load/decode failures; the stain texture preload is required under that path.
- Paint finish tiles intentionally use hex first. There is no paint WebP image fallback or alternate Wineberry image used.
- A local variable named `finishImage` inside `resolveSurfaceMaterialBlends` is the capture-only rasterized finish/mask bitmap, often a data URL—not proof that every finish swatch WebP is loaded.

## 3. Per-finish asset register

Every finish declared by options.ts is below. This includes the one missing file.

Reference legend for **every row**:

- **R0**: `src/data/finishes.ts` palette + `src/data/options.ts:toFinish` declared path.
- **R1**: `src/App.tsx:2112,2117,2124–2125` picker branches (only stains load images).
- **R2**: `src/components/DoorPreview.tsx:894,914` stained glass-frame texture; slab/sidelite/jamb surface uses hex/detail instead.
- **R3**: `src/utils/pdfProductRenderer.ts:162,195–208` stain glass-frame preload/render.
- **R4**: `ConfiguredDoorSource.tsx` → `captureDoorPreview.ts:materializeMaskedLayers` captures R2.
- **R5**: `src/App.tsx:937,964` cache keys/config; `scripts/exportInventoryCatalog.ts:86–87` + `server/inventoryShadowSemantics.ts:65,117`; DEV finish_swatch binding.
- No row is “fallback-only.” Paint rows have only declaration/metadata/binding references (R0/R5), not image loads in R1–R4. Stain rows have both real visual loads and R0/R5 references.
- Removing a required image refers to a configuration that uses that finish as a glass-frame stain; not every plain-door configuration necessarily consumes it.

| Finish ID | Name | Hex | Declared path | Disk / dimensions / bytes | Picker image | Door image use | PDF image use | AI reference image use | Classification / visible effect if removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paint-terratone | Terratone | #3E3013 | /assets/finishes/paint/terratone.webp | 82×82; 1820 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-black | Black | #242424 | /assets/finishes/paint/black.webp | 82×82; 1572 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-brown | Brown | #3A1B0C | /assets/finishes/paint/brown.webp | 82×82; 1870 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-coastal-plain | Coastal Plain | #9FA694 | /assets/finishes/paint/coastal-plain.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-cozy-cottage | Cozy Cottage | #FBEDD3 | /assets/finishes/paint/cozy-cottage.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-clay | Clay | #8E8063 | /assets/finishes/paint/clay.webp | 82×82; 1760 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-daffodil | Daffodil | #FAD97A | /assets/finishes/paint/daffodil.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-desert-tan | Desert Tan | #C6B89E | /assets/finishes/paint/desert-tan.webp | 82×82; 1784 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-eldridge-gray | Eldridge Gray | #696A62 | /assets/finishes/paint/eldridge-gray.webp | 82×82; 1812 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-eggshell | Eggshell | #F8F1DF | /assets/finishes/paint/eggshell.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-forest | Forest | #152415 | /assets/finishes/paint/forest.webp | 82×82; 1934 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-iron-ore | Iron Ore | #434341 | /assets/finishes/paint/iron-ore.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-mocha | Mocha | #2A2416 | /assets/finishes/paint/mocha.webp | 82×82; 1826 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-musket | Musket | #372813 | /assets/finishes/paint/musket.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-navy | Navy | #10355A | /assets/finishes/paint/navy.webp | 82×82; 1954 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-pacific-blue | Pacific Blue | #5E6C74 | /assets/finishes/paint/pacific-blue.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-pewter | Pewter | #A8A19B | /assets/finishes/paint/pewter.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-positive-red | Positive Red | #AD2C34 | /assets/finishes/paint/positive-red.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-wineberry | Wineberry | #3F0D04 | /assets/finishes/paint/wineberry.webp | MISSING; 0 B | No — hex tile | None | None | None | No file to delete — non-blocking missing declaration |
| paint-white | White | #EBEEE8 | /assets/finishes/paint/white.webp | 82×82; 1818 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-wicker | Wicker | #C1B396 | /assets/finishes/paint/wicker.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-crabapple | Crabapple | #660000 | /assets/finishes/paint/crabapple.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-orange-krate | Orange Krate | #C96F25 | /assets/finishes/paint/orange-krate.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-blue-bayou | Blue Bayou | #0078A6 | /assets/finishes/paint/blue-bayou.webp | 82×82; 42 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-sour-grape | Sour Grape | #7A6B9A | /assets/finishes/paint/sour-grape.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| paint-lime | Lime | #B3BF62 | /assets/finishes/paint/lime.webp | 82×82; 44 B | No — hex tile | None | None | None | D deletion candidate — no visible-output change; reconcile declared/bound path first |
| stain-auburn | Auburn | #492519 | /assets/finishes/stain/auburn.webp | 256×256; 4470 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-autumn-moss | Autumn Moss | #8C9890 | /assets/finishes/stain/autumn-moss.webp | 256×256; 5524 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-black-cherry | Black Cherry | #3A1718 | /assets/finishes/stain/black-cherry.webp | 256×256; 5420 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-cinnamon | Cinnamon | #3D1A14 | /assets/finishes/stain/cinnamon.webp | 256×256; 4496 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-dusty-shale | Dusty Shale | #CDBDAF | /assets/finishes/stain/dusty-shale.webp | 256×256; 6316 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-driftwood | Driftwood | #8C8272 | /assets/finishes/stain/driftwood.webp | 256×256; 4820 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-french-roast | French Roast | #412417 | /assets/finishes/stain/french-roast.webp | 256×256; 5776 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-frosty-white | Frosty White | #F7FBFB | /assets/finishes/stain/frosty-white.webp | 256×256; 4460 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-glacier-bay | Glacier Bay | #98A8B5 | /assets/finishes/stain/glacier-bay.webp | 256×256; 6938 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-grey-ghost | Grey Ghost | #DFE4E6 | /assets/finishes/stain/grey-ghost.webp | 256×256; 6056 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-graphite | Graphite | #45454A | /assets/finishes/stain/graphite.webp | 256×256; 5854 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-harvest-wheat | Harvest Wheat | #BC8550 | /assets/finishes/stain/harvest-wheat.webp | 256×256; 5776 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-midnight-blue | Midnight Blue | #292627 | /assets/finishes/stain/midnight-blue.webp | 256×256; 5082 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-natural-gold | Natural Gold | #F0BA7C | /assets/finishes/stain/natural-gold.webp | 256×256; 7250 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-nutmeg | Nutmeg | #8F5A33 | /assets/finishes/stain/nutmeg.webp | 256×256; 5760 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-oyster-white | Oyster White | #F1F1E9 | /assets/finishes/stain/oyster-white.webp | 256×256; 5844 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-sage | Sage | #9FA283 | /assets/finishes/stain/sage.webp | 256×256; 5712 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-stonewashed | Stonewashed | #696E67 | /assets/finishes/stain/stonewashed.webp | 256×256; 5540 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-tobacco-road | Tobacco Road | #3B2012 | /assets/finishes/stain/tobacco-road.webp | 256×256; 4434 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-toasted-caramel | Toasted Caramel | #855631 | /assets/finishes/stain/toasted-caramel.webp | 256×256; 5732 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |
| stain-winter-halo | Winter Halo | #CFC7C5 | /assets/finishes/stain/winter-halo.webp | 256×256; 6542 B | Yes — stain tile | Glass-frame texture only; not slab/sidelite/jamb surface | Stained glass-frame texture / required preload | Captured stained glass-frame texture | A REQUIRED — swatch/frame texture changes; PDF/capture can fail |

## 4. Wineberry — specifically verified

- Palette ID `wineberry`; configured ID `paint-wineberry`; label **Wineberry**; hex **#3F0D04**; accent **#1c0000**; type paint, ProMatch true.
- Declared path: `/assets/finishes/paint/wineberry.webp`; repository path `public/assets/finishes/paint/wineberry.webp` does not exist.
- DEV finish UUID `e709ae94-24b0-52a0-a373-a9787838fb8c`.
- DEV asset UUID `8d2b3d7e-0a65-568b-aca5-e5348c107ffe`; missing-file note and NULL size/dimensions/checksum.
- Existing finish_swatch binding `f1f26321-f5b2-5e23-abbf-1d4743c2c752`; it is not a missing binding.
- The picker displays the selected hex; slab, sidelite, jamb and paint glass-frame rendering do not request this image.
- Isolated PDF test succeeded at **1200×1600** and was byte-identical with the declared missing image URL replaced by a different nonexistent image URL.
- Isolated AI configured-reference capture succeeded with matching jamb and glass-frame Wineberry; captured PNG digest was identical with the same image-path substitution.
- No Wineberry WebP request was seen in these isolated render/capture cases.

**Recommendation: Wineberry does not need a WebP. Treat the missing path as a non-blocking, unused paint declaration.** In a later authorized inventory-contract cleanup, remove or explicitly mark the unused binding/declaration, rather than fabricate an asset to satisfy it. Do not modify the existing draft now. This is not a claim of calibrated physical paint accuracy: display color, material shading and AI lighting still affect perceived color.

## 5. DEV Supabase bindings and schema recommendation

GET-only read of HGI Portal Dev `udbcnpjtwhmjzpjjhoph`, pinned DRAFT `1af5506c-c723-5d6d-a341-93815d0205e2`, confirmed **47 finish_asset bindings**—one for every declared finish path—and exact path agreement with the source. Wineberry's path is retained despite the missing file. All use role **finish_swatch**, which understates the stain image's glass-frame texture use.

**Yes, finish facts can be driven by display_name, hex_color, finish_type/kind and metadata without requiring an image binding for every finish.** Preserve stable IDs, active/legacy/discontinued status, selectability, order, timestamps, ProMatch traits and compatibility memberships as well. Do not reduce the schema so far that those facts/history disappear.

The current database already separates finishes from optional finish_assets rows. The exporter unconditionally creates bindings; that is a manifest convention, not a rendering requirement or a mandatory per-finish FK.

Recommended future contract (not implemented):

1. Paint: `hex-first` rendering; image binding optional. Do not require or preload a paint swatch file.
2. Stain: retain image-based texture bindings **where the renderer requires them**. Today's 21 stain files all satisfy that path. Distinguish `surface_texture` from optional `picker_swatch` roles; the same file may serve both.
3. Optional explicit metadata such as `rendering_mode`/texture usage can describe capabilities, but leave masks, geometry, blending, capture and tint algorithms in application code.
4. Do not discard finish_assets generally: it is still needed for genuine textures and future optional swatches.
5. Coordinate source Finish.image typing/declarations, exporter/checksum/import manifest, draft legacy interpretation and shadow asset expectations before removing paint paths. Keep the current DRAFT unchanged during this phase.
6. Preserve historical revision assets/bindings or an approved transition policy; do not delete production files solely because a newly imported revision omits them.
7. Re-run finish picker/live preview/PDF/capture parity plus catalog shadow comparisons after any approved cleanup. A broad image-existence requirement should apply only to genuinely used bindings.
8. A universal hex-only stain migration would require a separately authorized glass-frame texture/rendering change and visual acceptance. It is **not safe as an asset deletion alone**.

Thus paint can be hex-only **for finish-specific images**, while both paint/stain still need the base material artwork. Hex-only for all finish-specific stain uses is **not safe today**.

## 6. Scripts/tests and tooling dependencies

- `scripts/exportInventoryCatalog.ts` imports every declared image and reads file metadata with sharp. Missing files are recorded with NULL metadata and an issue; export does not establish runtime use.
- `server/inventoryShadowSemantics.ts` compares every visible finish path. Deleting paint files but leaving paths keeps path equality while not resolving asset quality; changing paths/omitting bindings requires coordinated parity-contract updates.
- `scripts/verifyInventoryCatalog.ts` checks deterministic manifest/counts and pinned import semantics. It was pre-existing and was not edited/run in apply mode here.
- `scripts/auditProductionAssets.ts` identifies broad dynamic URL prefixes; `/assets/finishes/` declarations make files look referenced regardless of conditional rendering. A generic reference audit cannot alone prove render necessity.
- `scripts/optimizeProductionAssets.ts` scans/rewrites dynamic asset factories; it is a mutating optimization tool and **was not run**.
- `scripts/verifyConfigurationIntegrity.ts` enumerates slab/glass/grid/hardware product resolution, but does not prove every declared finish image is necessary or exercise all stained glass-frame textures. Its prior green result does not justify deleting stains.
- `scripts/verifyPdfRenderer.ts` covers 24 configurations; current harness glass-frame examples are paint. Stained slab cases alone do not demonstrate that stain frame textures are optional. This audit added isolated temporary browser cases without changing any repository test/runtime file.
- Existing AI test normalization/generation behavior was not changed; no paid model request was sent. An AI generation result cannot establish pixel-identical color/texture behavior, and was not requested for this audit.

## 7. Verification evidence

Temporary read-only audit tooling ran outside the repository in `/private/tmp`. Browser tests used the unchanged current renderer/capture with isolated fixture objects and substituted nonexistent URLs—no file removal, customer session alteration or Supabase writes.

| Check | Result |
| --- | --- |
| Source/file enumeration | 47 declared paths; 46 files; no additional/unmapped finish files |
| DEV bindings | 47 matching finish_swatch bindings; pinned DRAFT; GET only |
| PDF paint Black / White / Wineberry | 1200×1600; nonexistent finish image substitution produced identical PNGs; no finish image loaded |
| PDF Nutmeg slab, no glass-frame finish | Missing finish image substitution produced identical output |
| PDF Nutmeg stained glass frame | Texture loaded; nonexistent texture rejected with PDF asset could not be loaded |
| AI-reference capture Black / Wineberry | Capture ready and succeeded; original/substituted finish image paths produced identical PNG SHA-256 digests |
| AI-reference capture Nutmeg stained frame | Normal capture succeeded; missing texture failed masked-background loading despite readiness=true |
| Existing PDF renderer suite | Passed all 24 configurations, determinism, mobile/tablet/DPR checks, missing/pending assets and download checks |
| Repository whitespace | git diff --check plus new-report whitespace check passed |
| Production / runtime / DB writes | None; no asset deletion or publication |

The isolated successful captures sent no AI request. Captured reference checks are upstream fidelity evidence; **no claim that Sunburst's generated pixels are guaranteed**. All paint/stain branch conclusions combine static tracing with representative runtime verification, not 47 exhaustive end-to-end paid generations.

### Capture digest evidence

| Finish | Declared/substituted path | Outcome | PNG SHA-256 |
| --- | --- | --- | --- |
| paint-black | Original Finish.image | Captured successfully | 3cb640408f34b8d7bc983c1b0e53f410917a0083745c39c08b43fa2daff74dae |
| paint-black | Nonexistent test image | Captured successfully | 3cb640408f34b8d7bc983c1b0e53f410917a0083745c39c08b43fa2daff74dae |
| paint-wineberry | Original Finish.image | Captured successfully | 1bb294bd8e72ddf2ebfeceb5881640a040e127b43d16279f9943aec6ea5e491b |
| paint-wineberry | Nonexistent test image | Captured successfully | 1bb294bd8e72ddf2ebfeceb5881640a040e127b43d16279f9943aec6ea5e491b |
| stain-nutmeg | Original Finish.image | Captured successfully | d1de5b26b396b5a43b82b37234b0f72a1e74be6c7f9317ce0e94cfcbbe93f8d4 |
| stain-nutmeg | Nonexistent test image | A masked preview asset could not be loaded: http://127.0.0.1:5196/assets/finish-audit-missing-stain-nutmeg.webp | No output |

## 8. Final recommendation

Retain all **21 stain WebPs**. The **25 existing paint WebPs** are customer-rendering deletion candidates after an explicitly approved manifest/binding/type cleanup. Leave everything untouched now. Wineberry is **non-blocking** and does **not** need a replacement WebP.

Counts: **46 existing files; A required 21; B optional-swatch-only 0; C fallback-only 0; D safe-to-delete candidates 25.** Separately: **47 declared finish paths**, including Wineberry's already-missing unused paint path.

**Hex-only finish-specific rendering is safe for paint, not universally safe for stain under the current glass-frame/PDF/capture implementation.**
