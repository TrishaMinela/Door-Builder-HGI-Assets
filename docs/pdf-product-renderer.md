# Deterministic PDF product rendering

## Previous pipeline and root cause

`App.captureExactExteriorPreview` captured a hidden exterior `DoorPreview`
through `captureFinalDoorPreview`/html2canvas. That required React effects,
image readiness, responsive DOM dimensions, CSS masks and blend materialization
to settle correctly. The live preview's multiply blends are not reliably
reproduced by html2canvas without capture-time fixes.

PDF export now bypasses that entire capture path. The hidden PDF preview host
has been removed. The capture helper and html2canvas dependency remain for
existing non-PDF consumers, including Manual Visualizer; their behavior is unchanged.

## New pipeline

The current `DoorConfiguration` plus the builder's resolved asset selections
are copied into an immutable generation snapshot. Those resolved selections
include the actual grid PNG chosen by the existing builder, avoiding a second
guess based on human-readable grid labels. They contain no DOM references.

`renderPdfProduct` resolves the existing authored slab candidates and exact
exterior hardware, loads/decodes every required original image, prepares the
shared masks/fitted glass, composites the complete entrance and encodes PNG.
The PDF embeds that PNG in its unchanged aspect-contained image area.

The canonical output is **1200 × 1600**, transparent, with fixed product-space
geometry and three-pixel-density material layers. No CSS viewport, DPR,
computed style, React capture readiness or AI output is used.

## Layers and finish rules

1. Independent jamb finish, using the existing exterior face gradient colors.
2. Sidelite surfaces, already completed with the same finish helper as slabs.
3. Equal-sized slab surfaces, already completed with finish/material detail.
4. Clear glass underlayers and selected decorative glass/grid artwork.
5. Selected glass-frame trim and HRT light-lite trim, where configured.
6. Exact selected exterior hardware in the existing handing/leaf positions.
7. Structural mullions, meeting stile and threshold.

Paint starts with an opaque selected hex color. The neutral authored relief is
grayscale/contrast-treated and multiplied at the live preview's 0.25 strength;
white detail therefore cannot fade black into gray. Stain retains the selected
surface family's authored grain and uses the live preview's saturation 1.18,
contrast 1.35 and multiply-detail strength 0.52. Inactive legacy tint algorithms
are not substituted for the active preview rules. Slab/sidelite share this path.

Glass masking, padding cropping and fitting reuse pure existing helpers.
SAT retains its actual-glass-derived contour and 1.1×/10px transformation;
HRT retains its authored overlay and independent light-lite coloring. SDL
uses the selected grid alpha as geometry and inherits slab finish. Authored
Prairie colors are preserved; other Prairie muntins use the existing neutral
pixel recoloring thresholds. Coatings are represented by the same selected
artwork as Preview, not invented optical effects.

Sidelites retain the existing semantic left/right mapping and 0.35 structural
width ratio. PNG padding cannot change their width. French/Savannah use the
shared leaf/hardware rules, separate meeting stile and existing lock-prep crops.
Readable hardware is shifted, not text-mirrored, as in Preview.

Asset failures name the source URL; missing mappings and mismatched masks
abort export instead of generating incomplete products. Failed image loads are
evicted from the decode cache so retries can succeed. A configuration-key
check prevents a completed old render being accepted after selection changes.
PDF product results are reused only for the same complete visual key.

## Verification

Run `npm run test:pdf-renderer`. Headless Chrome/Vite tests cover 24 fixtures:
the 12 requested representative cases, Savannah, dark and light stains,
SAT/HRT colored trim, F48/F482/S glass and alternative French lock preparations.
Tests verify fixed dimensions, PNG alpha, byte-identical repeated exports,
desktop/mobile/tablet-DPR-2 independence, semantic placement, original asset resolution,
hardware/grid changes, named asset failure, waiting on delayed loading and
snapshot stability when the caller's finish changes during that wait.
Black solid samples are opaque: slab RGBA (36,36,36,255), sidelite (33,33,33,255).
The script creates a verification PDF and PNGs under `/private/tmp` for visual QA.

Production build and existing desktop/mobile Manual/AI UI tests pass.
The unrelated submission test reaches an existing assertion that expects
`vercel.json.routes`; current vercel.json contains only function configuration.
No routing/submission files were changed to address that unrelated failure.

## Remaining limitations

Native product artwork (often 242 × 549) limits real detail; higher-resolution
Canvas output does not invent missing source detail. Textures naturally cause
small per-pixel differences between different authored surfaces. Representative
configurations are tested, not every catalog permutation or every browser.
PDF template/font/layout were preserved; Poppler emits an existing
Adobe-Identity-H font warning while rendering the branded template.
