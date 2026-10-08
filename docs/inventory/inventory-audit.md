# HGI Door Builder inventory architecture audit

Date: October 8, 2026. Repository baseline: `40abeeb924355dd78d3679a2d10a1496084a6ba0`.

## 1. Scope and current architecture

This is an inspection and architecture report only. No runtime code, inventory, product rules, assets, configuration UX, Visualizer, PDF, lead integration, or production data flow was changed. No database schema or migration was implemented. FeneVision is not part of this proposal.

The application currently has a **build-time product-choice catalog**, not a live inventory service. TypeScript arrays, maps, allowlists, filename conventions, and functions determine the selectable products. There is no inventory API/database read in the customer configuration path. Existing Supabase integrations serve dealers, leads, and AI usage, not product inventory.

The effective catalog is assembled in layers:

```text
Hardcoded line/style, finish, glass, hardware, and sidelite records
  → derived catalog records and scoped asset maps
  → material/style/finish/glass/grid availability filtering
  → customer visibility and grouping
  → display sorting and normal configuration state
  → DoorPreview, complete entrance capture, PDF, submission, AI resolution
```

`src/App.tsx` is both the configuration orchestrator and a substantial source of inline catalog policy. Moving only `src/data` into Supabase would therefore NOT reproduce current availability.

### Four responsibilities to keep separate

| Responsibility | Current examples | Future location |
| --- | --- | --- |
| Product data | Names, codes, colors, materials, grains, glass designs, hardware styles | Supabase catalog tables |
| Commercial compatibility/availability | Style–material membership, glass allowed for an opening, sidelite family membership, allowed grid combinations | Explicit catalog relationships; application evaluates them |
| Asset mapping | Slab artwork, overlays, masks, thumbnails, handing/view hardware images | Asset records and typed bindings; renderer remains in code |
| UI and rendering behavior | Steps, sorting, selected state, default/fallback selection, geometry, handing transforms, glass/frame alignment | Application code, NOT database UI scripts |

There is no discovered authoritative source for on-hand quantities, warehouse locations, prices, lead times, manufacturer discontinuation dates, or customer-selectable manufacturing width/height. “Available” currently means allowed by the builder's tables/rules and represented by its assets; it does not prove commercial stock or manufacturer availability. HGI must define whether the later inventory project also needs stock management.

## 2. Inventory sources and files

Paths below are repository-relative. H = authored/hardcoded; D = derived. Flags describe the module's role, not an assertion that every field has that property. This registry covers the product data modules and the inline/consumer rules that affect the effective catalog.

| File | Objects/functions and format | H/D | Assets | Rules | Labels / IDs or codes | Derivation and consumers |
| --- | --- | --- | --- | --- | --- | --- |
| `src/data/productCatalog.ts` | `signatureStyles`, `steel20`, `steel22`, `brushed`, `textured`: `code\|name` string arrays parsed by `parseStyles`; `productCatalog`: `DoorLine[]`; `doorTypeOptions`, `doorLineChoices`; `glassDoorCodes`: Set | H + D | Line images and style thumbnail lookup | Grain/color/paint-only policy and style membership | Both | Builds `styleRecords`, `catalogDoorStyles`, variants; exports `doorLineChoicesForStyle`, `stylesForDoorType`, `doorStyleSupportsGlass`, `autoGrainForDoorLine`, `finishTypesForDoorLine`, `finishesForStyle`, `resolveDoorProduct`; consumed by App, draft validation, AI/server and renderers |
| `src/data/options.ts` | `doorStyles` alias; `toFinish`, `finishes: Finish[]`; hardware re-export | D from catalog and palettes | Constructed finish swatch paths | Finish type metadata, not a separate availability catalog | Both | Shared entry point for App, renderers, draft and server |
| `src/data/finishes.ts` | `paintColors`, `stainColors`: ID/name/hex/ProMatch arrays; `cladColors`: restricted paint subset | H + D | Indirect through `options.ts` | Clad palette restriction | Both | Supplies slab, jamb, glass-frame colors and finish swatches |
| `src/data/glassOptions.ts` | `glassPreviewAssets`, `glassThumbnailOptions`, `variantThumbnailOptions`; opening-specific `*Overlays` maps; `glassOverlayAssetUrl`; `glassOptions: GlassOption[]` | H + D | Thumbnails + per-opening overlays | Approval filtering and opening membership encoded through overlay presence | Both | Main glass catalog; reused by CR14SL, App, draft and server/renderers |
| `src/data/decorativeGlass.ts` | `approvedDecorativeGlassNames`, `approvedDecorativeGlassIds`, `knownDecorativeGlassIds` and approval helpers | H | Indirect | Decorative allowlists | Both | Filters main and sidelite glass source tables |
| `src/data/privacyGlass.ts` | `approvedPrivacyGlassNames`, `approvedPrivacyGlassIds`, `knownPrivacyGlassIds` and approval helpers | H | Indirect | Privacy allowlists | Both | Filters glass and helps App infer main glass family |
| `src/data/customerGlassAvailability.ts` | `isCustomerSelectableGlass` | H predicate | No | Hides Linen by ID/name while retaining records | ID + label matching | Applied to visible main/sidelite choices; not deletion of legacy records |
| `src/data/fslGlass.ts` | `allFslGlassOptions` → `fslGlassOptions`; `fslGlassCategories`; `fslStandardFlatRules`, `fslLowEFlatRules`, `fslStandardStyleRules`, `fslLowEStyleRules`, `fslExternalPatterns`, `fslSdlPatterns` | H + D | Generated FSL glass/grid paths; Prairie/Arts & Crafts maps | Category approvals, coating/style/pattern/color/width combinations | Both | App's `sideliteGlassCatalogs`, draft validation, server and rendering |
| `src/data/f48slGlass.ts` | `allF48slGlassOptions` → `f48slGlassOptions`; `f48slGlassCategories`, `f48slStandardStyleRules`, `f48slLowEStyleRules`, grid/Prairie/Arts & Crafts resolvers | H + D | F48SL-specific paths and shared grid art | Scoped glass and grid availability | Both | Same consumers as FSL |
| `src/data/sslGlass.ts` | `allSslGlassOptions` → `sslGlassOptions`; `sslGlassCategories`, `sslStandardStyleRules`, `sslLowEStyleRules`, grid/Prairie/Arts & Crafts resolvers | H + D | SSL paths and shared grid art | Scoped glass and grid availability | Both | Same consumers as FSL |
| `src/data/s2slGlass.ts` | `s2slGlassOptions`, `s2slGlassCategories`, `s2slStyleRules` | H | Clear glass asset | Only one glass row; grid rule map empty | Both | Scoped S2SL catalog |
| `src/data/cr14slGlass.ts` | `cr14slGlassOptions`, `cr14slGlassCategories`, `cr14slStyleRules`, `cr14slGridAsset` | D from main CR14 overlays and approvals | Reuses main CR14 glass art | Category filters; empty grid behavior reused from S2SL | Both | Scoped CR14SL catalog; no populated grid catalog |
| `src/data/sideliteAssets.ts` | `SIDELITE_SLABS`, `SIDELITE_GLASS_MASKS`; `sideliteAssetFamilyForSlab`, `sideliteStylesForFamily`, `sideliteSlabAsset`, `sideliteGlassMask` | H | Family/style → slab/mask paths | Material/grain → allowed sidelite styles | IDs/codes; UI labels elsewhere | App uses available asset-map keys as selectable membership; preview/PDF/AI reuse resolver |
| `src/data/sideliteConfigurations.ts` | `sideliteProductOptions`, `singleDoorBuilderOptions`, `doubleDoorBuilderOptions`; `codeByInput`, `normalizeLegacySidelite`, `resolveSidelitePosition`, `sideliteBuilderOptions`, `sideliteProductCode/Label` | H + D | No product raster mapping | Semantic hinge/lock relationship ↔ physical placement | Both | Shared preview, saved draft, AI and submission translation |
| `src/data/hardwareAssets.ts` | `hardwareAssets: HardwareAsset[]`, `resolveHardwareAsset` | H | Baldwin source artwork | Handing/view lookup | Manufacturer/style/finish labels | Expanded/filtered by `hardware.ts` |
| `src/data/schlageHardware.ts` | `schlageHardware`, `resolveSchlageHardware` | H | Card, exterior and interior art | Style/finish lookup | Both through derived IDs | Expanded for handing/view in `hardware.ts` |
| `src/data/hardware.ts` | `finishColors`, `schlageAssets`, `allHardwareAssets`, `hardwareOptions`, `resolveHardwareOption`, `hardwareDisplayName`; `finishSwatchAssets`, `hardwarePreviewAssets`, asset URL resolvers | H + D | Multiple product/card/view/finish art layers | Preferred picker handing; asset fallback; knob-only crop metadata | Both | App hardware groups; DoorPreview, PDF, draft, AI; IDs slug manufacturer/style/finish/handing |
| `src/data/doorConfigurationRules.ts` | `doorConfigurationRules`, `doubleDoorLockPrepOptions`, `savannahRequiredProductOption`; leaf count and `doorHardwarePlacements` functions | H | Entry/lock-prep artwork indirectly/directly | Single/French/Savannah structure, active leaf, DDLLBO/DDLLAC/DDLLKP, HINGEOJ | Both | Configuration, preview, capture, PDF, AI/submission consumers |
| `src/data/doorHanding.ts` | `doorHandingSides` and handing-side mapping | H algorithm | No | Exterior/interior hinge and lock orientation | Swing codes; UI labels in App | Shared hardware/sidelite placement |
| `src/data/doorPreviewAssets.ts` | `smoothPaintDoorPreviewAssets`, `exactDoorLinePreviewAssets`, `texturedPaintDoorPreviewAssets`, four `signature*PaintDoorPreviewAssets`; `doorPreviewAssets`, `resolveDoorPreviewCandidates`, `resolveDoorPreviewAsset`, `finishTypesForPreviewAssets` | H + D | Slab artwork and fallback candidates | Asset availability; smooth-vs-grained safeguards | Style/line codes | Preview, server, tests and PDF; map presence can gate finish availability |
| `src/data/doorStyleThumbnailAssets.ts` | Thumbnail map and fallback; `getDoorStyleThumbnailAsset`, `hasMappedDoorStyleThumbnailAsset` | H | Door-style card art | Code-based resolution | Codes | Imported while derived style records are built |
| `src/data/glassMaskAssets.ts` | Opening-code mask map and resolver | H | Main glass masks | Code → opening mask | Codes | Preview/PDF/reference rendering |
| `src/data/glassFrameMasks.ts` | Shape maps, `separateOpeningCodes`, frame-mask creation helpers | H + D algorithm | Derived masks | Oval/round/eyebrow/diamond vs rectangle; separate-lite geometry | Codes, not picker labels | Renderer geometry, not stock data |
| `src/data/heroPresets.ts` | Curated `HERO_PRESETS`/`HeroPreset` configurations; `heroDoorFilename` | H | Generated hero art | Marketing presets, not commercial availability | Preset/product keys | App hero and `scripts/generateHeroDoorImages.ts` |
| `src/App.tsx` | `doorConfigurationOptions`, `sideliteStyleOptions`, `signatureGrainChoices`, `grainThumbnails`, `doorSwingOptions`, `glassCategoryChoices`, `retroGlassCategory`, `hardwareStyleGroups`; `clearGlassIds`, three `legacy*GlassIds`, `f48GlassOptionIds`, `glassCategory` | H + D | Option images and group cards | Main glass filtering, family classification, defaults, visible controls | Both | Actual customer-visible effective catalog; source module arrays alone are insufficient |
| `src/App.tsx` | `gridLocations`, `gridStyles`, `lowEGridStyles`, `flatGridPatterns`, `allGridPatterns`, `internalGridPatternCodes`, three color-code maps, `*GridAsset`, `*GridRules`, `*PrairieRules`, `gridRuleWidths`; `sideliteGlassCatalogs` | H + D | Static + constructed grid paths | F/F48/S and sidelite coating/location/style/pattern/color/width availability | Both | Builds `compatibleGridPatterns/Colors/Widths`, previews and `GridConfiguration` |
| `src/App.tsx` | `availableFinishes`, `effectiveFinishTypes`, `jambFinishOptions`, `glassFrameFinishOptions`, `matchedGlassFrameFinish`, `visibleSideliteStyleOptions`, `availableGlass`, derived `pages` and selection effects | D | Calls catalog resolvers | Cross-selection exclusions and clearing invalid downstream selections | Derived labels + IDs | UI orchestration; retain algorithms rather than storing navigation in SQL |
| `src/config/builderUx.ts` | `builderUx` feature flags | H | No | Visibility, NOT product removal | Feature keys | Jamb material/color and glass-frame color controls currently hidden; underlying data remains |
| `src/utils/matchingFrameFinish.ts` | `matchingJambFinish` | H algorithm | No | Shared finish-ID match; first available clad fallback | IDs | Matching hidden jamb finish when door color changes |
| `src/types.ts` | `DoorStyle`, `DoorStyleVariant`, `DoorLine`, `Finish`, `GlassOption`, hardware types, `DoorConfiguration`, grid/sidelite/coating/swing unions | H contracts | Asset URL fields | Supported value domains, not live inventory | Both | Boundary contracts throughout app/server; do not remove historic fields |

### Consumer and secondary-rule sources

| File | Role and inventory relevance |
| --- | --- |
| `src/components/DoorPreview.tsx` | Applies resolved slab, glass/frame, sidelite, finish and hardware data. `FINISH_RENDERING` and layered masks/tinting are material rendering behavior, not alternate color inventory. |
| `src/features/home-visualizer/entranceGeometry.ts` | `ENTRANCE_GEOMETRY`, `STANDARD_SIDELITE_TO_SLAB_RATIO`, `createCanonicalEntranceGeometry`: fixed render coordinates and proportions shared by preview/PDF/Visualizer. |
| `src/features/home-visualizer/captureDoorPreview.ts` | Captures the configured entrance; consumes resolved product visuals, does not supply inventory. |
| `src/features/home-visualizer/entranceFitStrategy.ts` | `getDetectedVisualizerOpeningFamily`, `getSelectedVisualizerOpeningFamily`, `evaluateEntranceCompatibility`: photo-family guidance/blocking, NOT manufacturer product compatibility. |
| `server/aiDoorVisualization.ts` | `sideliteCatalogs`, `resolveAiProduct`, asset/reference resolution: imports product data but repeats some classification/fallback logic and resolves sidelite glass by name. Server/browser must use the same catalog revision later. |
| `src/utils/doorBuilderDraft.ts` | Version-1 draft sanitization/restoration validates IDs against current catalogs. Disabling a product later must distinguish new selection eligibility from historic renderability. |
| `src/utils/pdfProductRenderer.ts` | Consumes shared assets/colors/hardware in the deterministic PDF preview. PDF render canvas dimensions are not manufacturing sizes. |
| `src/utils/pdf.ts`, `src/utils/pdfConfig.ts` | Consume configuration labels and fields; PDF template/placement/download are not catalog sources. |
| `src/utils/submission.ts`, `api/submit-door-builder.ts` | Translate configuration into existing submission fields and Supabase leads/Zapier flow. Preserve payload contracts and historic values. |
| `src/utils/sortByDisplayLabel.ts`, `src/styles.css` | Display ordering, responsive layout, preview sizing. No inventory migration required. |
| `server/dealerResolution.ts`, `api/dealer-context.ts` | Existing Supabase `dealers` lookup; not inventory. |
| `server/aiUsage.ts`, `api/complete-ai-visualization.ts` | Existing Supabase `ai_generation_usage` / `ai_entrance_detection_usage` telemetry; keep separate. |
| `public/assets/**`, asset audit/optimization/hero scripts | Actual deployed art, path integrity and generated marketing assets. A physical asset is not necessarily a customer product. Do not run optimization as an inventory migration. |

## 3. Categories and counts

Counts are from runtime imports of the current source modules, source inspection and the existing read-only asset/integrity checks. They are **not stock counts or independent SKUs**. Parent products, material variants, finish-specific variants, raw rows, visible rows, and asset expansions are deliberately distinguished.

Additional categories represented in the code include glass caming/metal variants (for example Nickel/Patina/Brass within named designs), mini-blind variants, CLiC glazing/grid options, Low-E coatings, double-door preparation and Savannah hinge options, timber versus clad frame context, glass-frame finishes, interior/exterior artwork views, and marketing presets. These are not all independent stocked product masters. A transom is currently an analyzed photo feature rather than a customer-selected transom inventory catalog.

| Category | Count | Meaning |
| --- | ---: | --- |
| Customer-facing door line/material groups | 5 | Signature Series Fiberglass Grained, Smooth Steel, Paintable and Stainable Steel, Brushed Smooth Fiberglass, Textured Fiberglass |
| Internal catalog line records | 8 | Four Signature grain lines plus four other lines |
| Broad base materials | 2 | Steel and fiberglass, inferred from line names; no independent material master table |
| Explicit steel gauge-coded internal lines | 2 | `20-gauge-smooth-steel`, `22-gauge-steel`; gauge is not a separate picker and is absent from customer line labels |
| Named grains | 4 | Cherry, Fir, Mahogany, Oak; Oak also used by other textured/stainable lines |
| Door style/design records | 42 | `catalogDoorStyles`, grouped across line variants |
| Style–line variants | 127 | Sum of line style rows; 43 distinct raw variant codes |
| Entry configurations | 3 | Single, French, Savannah |
| Handing/swing choices | 4 | LHI, LHO, RHI, RHO |
| Double-door lock-prep choices | 3 | DDLLBO, DDLLAC, DDLLKP |
| Savannah required product option | 1 | HINGEOJ; behavior, not a standalone stocked product list |
| Paint colors | 26 | `paintColors` |
| Stain colors | 21 | `stainColors` |
| Combined finish records | 47 | `options.finishes`; not 47 valid finishes for every line |
| Clad colors | 6 | Restricted subset of paints, not six additional colors |
| Main glass families | 5 + conditional Retro | Clear, Decorative, Privacy, Mini Blinds, CLiC; Retro substitutes for family grouping on specified styles |
| Approved decorative base names / IDs | 23 / 35 | Approval allowlists; not all imported source rows |
| Approved privacy base names / IDs | 6 / 8 | Includes Linen in approval layer, separately hidden in customer layer |
| Main glass exported rows / unique IDs | 127 / 126 | Duplicate `paris` row |
| Main glass rows passing customer-only Linen predicate | 126 | Still subject to style/material/legacy filtering |
| Main glass IDs reachable through current material/style and visibility filters | 88 | Static enumeration of current line choices and styles, reproducing `availableGlass`, additive allowlist updates and Linen predicate; not a count for any single door |
| Main glass IDs retained but not reachable by that enumeration | 38 | Listed in section 7; no discontinuation claim |
| Sidelite slab styles | 5 | FSL, F48SL, SSL, S2SL, CR14SL |
| Sidelite asset families / family-style associations | 7 / 21 | Family aliases can share the same physical artwork |
| Semantic sidelite relationships / physical codes | 4 / 4 | None/hinge-side/lock-side/both-sides; NOSIDE/LEFTSIDE/RIGHTSIDE/BOTHSIDES |
| Exported sidelite glass rows | 92 | FSL 31, F48SL 21, SSL 29, S2SL 1, CR14SL 10; scoped rows, not 92 globally unique designs |
| Sidelite glass categories by slab | 5 / 3 / 4 / 1 / 3 | FSL / F48SL / SSL / S2SL / CR14SL |
| Hardware brands | 2 | Baldwin, Schlage |
| Hardware manufacturer/style groups | 15 | Grouped picker products |
| Hardware finish-specific selectable records | 34 | Derived `hardwareOptions` |
| Actual hardware finishes | 5 | Bright Brass, Dark Bronze, Matte Black, Satin Nickel, Venetian Bronze |
| Baldwin / Schlage source records | 13 / 21 | Different source representations; not view-expanded assets |
| Derived hardware asset records | 97 | Includes view/handing expansions; NOT 97 selectable hardware products |
| Jamb material choices retained internally | 2 | Timber, clad; UI currently hides material/color selection |
| Finish kinds | 2 | Paint/stain; clad is a frame finish context/subset, not a third slab finish palette |
| Grid location / profile domains | 5 / 4 | Type unions: No Grids/External/Internal/SDL/Arts & Crafts and Arts & Crafts/Contoured/Flat/Prairie; UI has a smaller scoped set |
| Grid pattern / color / width domains | 11 / 7 / 3 | Numeric lite patterns including horizontal variant; widths 5/8, 7/8, 11/16 inch; not every cross-product is valid |
| Coating label domain | 7 | Includes composite “either coating” labels; not seven independently selectable coatings everywhere |
| Main glass opening masks | 33 | Code → mask entries |
| Default smooth slab map / thumbnail map keys | 39 / 44 | Aliases and auxiliary keys mean neither equals visible style count |
| Sidelite glass masks | 5 | One per slab style |
| Hero presets | 29 | Marketing combinations, not inventory |

### Line/style membership totals

| Internal line | Style rows | Grain | Customer group |
| --- | ---: | --- | --- |
| `signature-cherry` | 9 | Cherry | Signature Series |
| `signature-fir` | 2 | Fir | Signature Series |
| `signature-mahogany` | 5 | Mahogany | Signature Series |
| `signature-oak` | 3 | Oak | Signature Series |
| `20-gauge-smooth-steel` | 37 | None | Smooth Steel |
| `22-gauge-steel` | 33 | Oak | Paintable and Stainable Steel |
| `brushed-smooth-fiberglass` | 24 | None | Brushed Smooth Fiberglass |
| `textured-fiberglass` | 14 | Oak | Textured Fiberglass |

Do not rename gauge-coded IDs during import merely because customer labels have changed. Existing drafts and integrations depend on the IDs.

### Asset counts and limitations

`scripts/auditProductionAssets.ts` scanned 91 source files and found:

- 1,572 raster files under deployed assets, totaling 33,232,008 bytes.
- 716 exact source reference strings and 18 dynamic prefixes.
- 1,571 conservatively referenced files after prefix expansion; 33,135,636 bytes.
- Zero missing exact references.
- 63 byte-identical duplicate groups containing 79 additional copies.
- One candidate unreferenced raster: `public/assets/visualizer/auto-fit-door-slab-example.webp` (96,372 bytes).

These totals include marketing, UI, PDF and Visualizer imagery, not only inventory art. Dynamic-prefix expansion intentionally overcounts reachability; it cannot prove that all 1,571 files are used by a currently selectable product. Conversely, SVG/generated procedural images and arbitrary future remote assets are not represented by this raster count. A later import should produce an explicit product-role asset manifest before claiming an exact inventory-only asset count.

The configuration integrity test separately checked 786 unique asset paths and 357 unique AI reference sets across 50,381 prepared AI configurations, with no missing assets. Its `51,081,189,421,440` theoretical combination estimate is an automated test estimate, NOT a manufacturer SKU count, stock count, or guarantee of commercial availability; it multiplies derived rule domains and includes retained records.

## 4. Relationships and current availability rules

### Door styles, lines and materials

`productCatalog` establishes explicit style membership per internal line. `catalogDoorStyles` merges rows by normalized **display name**, then stores `variants[]` containing line ID, line name, original style code, grains and color allowance. The visible line group can contain several internal lines. `doorLineChoicesForStyle` selects groups whose `lineIds` intersect the style variants.

`S1NGSS` is displayed as S1 / Six Panel No Glass, which merges it with S1 variants. Preserve both raw variant codes and the existing stable derived style ID. Future names must not become primary keys: a display-name edit currently risks changing the derived style slug/grouping.

`glassDoorCodes` is a 29-code allowlist; `doorStyleSupportsGlass` checks selected-line variants. A shared style's aggregate `hasGlass` alone is not sufficient to choose a line-specific glass path.

### Finishes and colors

`finishesForStyle`/`finishTypesForDoorLine` combine variant membership, allowed grains, color allowance, `paintOnly` and line grouping. Smooth Steel and Brushed Smooth Fiberglass are paint-only. Textured Fiberglass and Paintable/Stainable Steel use Oak automatically; Signature chooses compatible grain variants.

App narrows the available finish records by active paint/stain kind and resolves frame choices separately. Hidden selectors do not remove those fields: jamb/glass-frame values still flow into the preview, configured reference, PDF and submission. Timber can reuse the door finish ID. Clad matching uses the same ID when available, otherwise the first clad finish. Glass frame has match-door/custom modes and a compatible default (`paint-white` or first available). Do not silently expand clad availability to all paints/stains in the migration.

### Main glass

There is no clean main-glass product-to-family foreign key today. Family is inferred from ID/name containing CLiC/blinds, `clearGlassIds`, privacy approval membership, then decorative fallback. Retro is a presentation grouping for 3LT/3STEP/4LT/5LT/F764, not another independent glass inventory.

Actual availability is a sequence:

1. Build rows from thumbnail/variant source arrays; discard umbrella/legacy thumbnail entries as encoded in `glassOptions.ts`.
2. Apply known/approved privacy and decorative ID allowlists.
3. Require an overlay for at least one selected style/line code.
4. Exclude legacy clear/blinds sets on F, S and F48/F482; enforce F48 whitelist (including its later `.add` entries).
5. Exclude privacy glass for SAT.
6. Hide Linen with `isCustomerSelectableGlass` at picker presentation.
7. Group named variants and sort visible choices.

An overlay being available is currently both an asset fact and an availability signal. Database relationships should explicitly record allowed membership instead of inferring all commercial compatibility from asset existence.

### Sidelites

`sideliteAssetFamilyForSlab` maps line/grain to family; map keys define allowed slab styles:

| Asset family | Allowed sidelite styles | Current line context |
| --- | --- | --- |
| smooth-steel | FSL, F48SL, SSL, S2SL | Smooth Steel |
| 20-gauge | FSL, F48SL, S2SL | Brushed Smooth Fiberglass |
| 22-gauge | FSL, F48SL, SSL, S2SL | Paintable/Stainable Steel and Textured Fiberglass |
| cherry | FSL, F48SL, SSL | Signature Cherry |
| fir | FSL, CR14SL | Signature Fir |
| mahogany | FSL, F48SL, SSL | Signature Mahogany |
| oak | F48SL, SSL | Signature Oak |

These are current asset-family aliases, not proof that fiberglass is a steel gauge. Smooth Steel SSL intentionally reuses `Sidelites/Signature/Oak/SSL.webp`; do not exclude it based on filename/gauge. `doorStyleCode` exists in the family input type but the current family resolver uses line/grain, not a style-by-style sidelite manufacturer table.

Each slab chooses its own glass catalog and grid rules. CR14SL derives glass from main CR14 overlays; S2SL has one clear option and no populated grid rules. Semantic hinge-side/lock-side is resolved using handing and exterior/interior view; French/Savannah can present physical left/right options translated through the same code mapping. This translation is application behavior, not four independent sidelite products per door.

### Hardware

Source artwork expands into view/handing assets. `hardwareOptions` selects exterior/preferred handing records, deduplicates by its derived key and groups manufacturer/style with finish choices. The inspected path does not contain an independent comprehensive door-style/material → hardware commercial exclusion table. Do not invent one or assume all source asset rows are distinct sellable products.

`doorHardwarePlacements` applies selected preparation to double doors: DDLLBO full locksets on both leaves; DDLLAC full lockset on active leaf; DDLLKP full active lockset plus knob-only inactive hardware. Savannah retains HINGEOJ behavior. These are precise rendering/functional semantics; importing labels alone would lose them. Single-door handing is unchanged by finish/style grouping. Temporary Georgian/Matte Black preview art before selection is a UI fallback, not a saved default hardware order.

### Grids, coatings and sizing

Main F, F48/F482 and S glass each have scoped standard/Low-E maps. The key sequence is glass opening → grid location → profile → numeric pattern → color → width, with coating inferred from standard/Low-E rule intersection. F48 removes external grids. External/SDL patterns have explicit opening-specific lists. Sidelite grids use separate slab-specific maps, with shared Prairie/Arts & Crafts art and fallback choices. Empty width arrays mean a widthless/no-width-selection case; `undefined` means disallowed. Do not conflate them during import.

Type unions contain 11 patterns and seven colors; these are domains, NOT all-pairs availability. Generated paths use different codes by opening (`BK` vs `BL`, `BZ` vs `BR`). Bronze/White can reuse White artwork with distinct rendering. Import exact resolved assets per valid grid tuple, rather than guessing filenames.

No customer manufacturing width/height selector was identified. Named lite dimensions such as F848 and S836 and grid bar widths are product descriptors. `ENTRANCE_GEOMETRY` uses slab width 242, opening height 549, sidelite ratio 0.35, center stile 7, threshold 12 and frame profiles in render coordinates. The comment references a 36-inch slab/12–14-inch sidelite as a fallback convention; these numbers are NOT an approved manufacturing size catalog. CSS and PDF canvas sizes likewise stay out of physical inventory dimensions.

### Options disappearing and configuration consumers

App derives `available*` lists and clears invalid downstream selections when style/line/grain changes. It skips unsupported glass/grid pages and hidden jamb/frame-color controls. Default selection and fallback chains rely on array order in some places, while `sortByDisplayLabel` sorts only rendered copies; database `display_order` must not inadvertently change defaults.

Existing drafts store IDs and selected values; some downstream configuration fields additionally carry nested product data and labels. Sidelite glass is translated into a name/asset configuration and server lookup can use name equality. PDF and leads depend on these existing contracts, so an adapter must preserve them even if database records use new UUID keys.

Visualizer A–E photo-opening compatibility is a separate concern: A single; B single + one sidelite; C single + both sidelites or double without sidelites; D double + one; E double + both. This is not stock availability and must remain in application code during inventory migration. Entrance detection/model/prompts/masks are out of scope.

## 5. Asset mapping system

Assets live in `public/assets` and are served through `/assets/...` paths. Major inventory-related branches include `door-lines`, `door-styles`, `finishes/paint`, `finishes/stain`, `glass/thumbnails`, `grid-options`, `hardware`, `hardware/cards`, `hardware/finishes`, `hardware/lock-setup`, `masks`, and `hgi-assets` (Preview Slabs, Preview Hardware, glass opening families and Sidelites). `generated/hero-doors` is marketing output; `pdf-icons` is document UI art.

The same product can need several roles: picker thumbnail, slab render, finish swatch, glass overlay, glass opening mask, frame mask, hardware card, exterior/interior hardware, grid overlay and sidelite slab. One `image_url` column per product would be insufficient.

Slab candidates are selected by code + line + grain + finish context, then fallbacks. Brushed Smooth Fiberglass deliberately returns only smooth candidates so missing artwork cannot silently turn it into textured/grained material. Other lines can fall through alternate maps and thumbnails. Preserve precedence and log fallback use; do not replace this with “first asset for style.”

Main glass overlays are keyed by opening code. SO2 can reuse SO art. FSL/F48SL/SSL construct paths by codes; several grid/hardware products intentionally share art. Hardware has both card art and installation art with view/handing metadata (`?v=5` is URL cache-busting, not a product version). Glass-frame geometry is procedurally derived and should not become admin-editable SQL expressions.

Recommended asset manifest fields: stable asset ID, existing public path, role, MIME, width/height, byte size, checksum, transparency, source/provenance, content version and optional crop metadata. Store per-product binding context separately. Retain current local paths in the first migration; moving media to Supabase Storage is a separate reversible phase.

## 6. Product facts versus executable rules

**Suitable for database administration:** display names/descriptions, internal codes, series/material/grain identity, paint/stain hex palettes, explicit style–line membership, explicit allowed finish/glass/sidelite/grid tuples, customer visibility, active/legacy/discontinued status, asset metadata/bindings, notes, approved ordering and manufacturer provenance.

**Keep in code:** step/progress/navigation, selected-state effects, sorting implementation, semantic sidelite/handing/view translation, active-leaf hardware placement and knob crop semantics, rendering geometry/tinting/mask creation, complete reference capture, PDF layout, submission serialization, draft validation/migration algorithms, photo normalization/detection, A–E compatibility, automatic Good-fit continuation, generation/model/prompt/error/telemetry behavior.

Hybrid examples: store supported grid combinations but keep the evaluation/defaulting algorithm in code; store approved glass-family membership but keep presentation grouping; store material traits such as paint-only but keep validation of the resulting selection. Do not introduce a general-purpose rule scripting engine in Supabase.

## 7. Problems and inconsistencies found (not fixed)

1. **Duplicate main glass ID:** `paris` occurs in both thumbnail sources and survives as two exported rows. Both currently have the same label, thumbnail and eight opening keys. A future unique constraint/import needs an explicit deduplication decision and legacy-ID mapping, not silent last-write-wins. No duplicate IDs were found in the 42 derived door styles, 47 finishes, or 34 selectable hardware rows.
2. **Duplicate labels with different scope:** Grace–Nickel/Patina, Nouveau–Nickel/Patina, Clear Glass, Clear Glass with Grids, NOGRID and NONSTOCKCL labels recur under different IDs/opening families. Examples: `ca-grace-nickel`/`grace-nickel`, `hrt-nouveau-nickel`/`nouveau-nickel`, and `f-clear-grids`/`f48-clear-grids`/`s-clear-grids`. These are not necessarily duplicates; scope and raw codes must survive import.
3. **Retained but currently unreachable main glass IDs:** static enumeration found 38:

   ```text
   contg, decorative, extg, flatg, linen, ocean-caming, privacy, celestial,
   blinds-espresso, blinds-gray, blinds-sand, blinds-silver, blinds-tan, blinds-white,
   f-f10l, f-f15wh, f-prairie-internal, f-blinds-15, f-ten-lite,
   f-clear-f10, f-clear-f10l, f-clear-f15, f-clear-f15int, f-clear-f15intl,
   f-clear-fpraint, f-clear-ften, f-clear-nonstock,
   f48-clear-f1248, f48-clear-f1248l, f48-clear-f648l, f48-clear-nonstock,
   s-clear-s5, s-clear-s5l, s-clear-s9, s-clear-s9int, s-clear-s9intl,
   s-clear-sv6, s-clear-nonstock
   ```

   Includes placeholders, explicit legacy exclusions, lack of matching overlay/membership and Linen. This is not proof of discontinued manufacturer products. F48 `.add` updates were included; omitting them incorrectly understates visible IDs by two. Source approval filters also remove other raw designs before export; preserve that distinction when extracting source tables.
4. **Linen policy layering:** privacy approval still includes Linen while customer predicate hides it in main and FSL/F48SL/SSL pickers. Model `customer_selectable` separately from `renderable`/legacy availability; do not delete saved values.
5. **Display-name identity coupling:** styles merge and get IDs from normalized names; hardware IDs derive from manufacturer/style/finish/handing labels. Label changes can break historic IDs. Assign stable database identities and preserve legacy external IDs.
6. **Gauge/family names are not material truth:** customer labels omit steel gauge; filenames/internal IDs retain gauge names. Brushed fiberglass uses a `20-gauge` sidelite asset alias, textured fiberglass a `22-gauge` alias. Never infer sellable gauge/material from file path.
7. **Availability lives in multiple places:** catalog flags, asset existence, approvals, App whitelists/exclusions and hidden-control flags all contribute. A source-array-only import would expose hidden/unsupported choices or remove valid ones.
8. **Shared assets and duplicate bytes:** 63 identical groups; examples include Schlage Bright Brass interior art shared across authored/card-style paths, multiple Baldwin style previews sharing finish/view art, and S-family clear-grid overlays (`SF10`, `SF5`, `SF5L`, `SS5L`). Smooth Steel SSL shares Oak SSL artwork; F48SL/SSL Arts & Crafts share one path. Shared art can be intentional; checksum identity does not imply product identity.
9. **Mapping-only hardware finish:** `finishColors` includes Aged Bronze, but current selectable hardware rows use five other finishes. Do not expose it solely because a color map exists.
10. **Candidate stale asset:** `visualizer/auto-fit-door-slab-example.webp` is the audit's only unreferenced raster candidate. Not deleted. Broad dynamic prefixes may conceal other unused files.
11. **Fallbacks can hide fidelity gaps:** available assets may render through alternate slab maps/thumbnail fallback; geometric rules use generic defaults. Zero missing files does not prove correct artwork for every commercially valid combination. Need per-role visual acceptance during migration.
12. **Server/browser drift risk:** shared imports coexist with repeated resolver logic and name-based sidelite lookup. Database switching must be revision-consistent in both layers; cannot migrate browser lists alone.
13. **No authoritative stale-product determination:** current code has no discontinuation dates or live manufacturer inventory feed. Legacy/hidden records are candidates for HGI review, not products to remove automatically.
14. **No physical sizing/stock source:** grid widths and render pixels are not orderable door dimensions. Manufacturer availability disclaimer remains necessary. Confirm actual manufacturing constraints with HGI before adding dimensions, quantities or commercial promises.

## 8. Proposed Supabase schema (design only)

Prefer a catalog schema with stable UUID primary keys and explicit foreign keys. Preserve current IDs/codes through unique legacy-key columns scoped to the correct namespace. Do not make customer names or asset filenames primary keys. No SQL was applied.

### Common lifecycle fields

Customer-editable product/option tables should have `legacy_id`, `internal_code` where applicable, `display_name`, `description`, `status` (`active`, `legacy_only`, `discontinued`), `customer_selectable`, `display_order`, `notes`, `created_at`, `updated_at`, and publish/audit provenance. `customer_selectable=false` must not prevent resolving historical saved configurations. Junction rows can carry status/order/notes when that relationship has its own lifecycle. Unique keys are scoped (e.g. slab + sidelite glass legacy ID), not globally enforced on repeated labels.

Display order is explicit editorial data; the application retains its current alphabetical/semantic sorting policy and default selection priority. Store a separate `default_priority` only where needed to preserve existing first-option fallbacks.

### Tables and why they exist

| Proposed table(s) | Main fields / relationships | Purpose |
| --- | --- | --- |
| `catalog_revisions` | ID, status draft/published/retired, published_at/by, manifest checksum, source commit | Publish a validated complete snapshot, not half-edited live arrays |
| `materials`, `series`, `grains` | Stable codes/names; steel/fiberglass traits; series→material; grain metadata | Separate commercial identity from asset aliases/gauge filenames |
| `door_lines` | Series/material FK, optional gauge metadata, paint/stain traits, customer group reference | Preserve eight internal line records and five current groups without adding a gauge UI |
| `door_line_groups`, `door_line_group_members` | Customer group name/code/order; group↔line FKs | Model grouped Signature choices explicitly |
| `door_styles`, `door_variants` | Style FK + line FK + original product code, grain association, glass-opening code/has-glass | Represent 42 shared designs and 127 line memberships without name-based merging |
| `finishes`, `door_variant_finishes` | Kind paint/stain, hex, ProMatch; variant↔finish allowlist | Reuse 47 finishes and explicitly express allowed combinations |
| `frame_materials`, `frame_material_finishes` | Timber/clad records; allowed finish FKs and fallback priority | Preserve frame palette/subset independently of hidden selectors |
| `glass_families`, `glass_designs`, `glass_options` | Family/design FKs; scoped legacy ID, raw code, variant/caming/coating metadata | Distinguish a design such as Grace from finish/opening-specific options; no name parsing required |
| `door_variant_glass` | Variant FK + glass option FK + opening code; availability/status | Explicit main-glass compatibility, independent of overlay presence |
| `sidelite_styles`, `sidelite_variants`, `door_variant_sidelites` | Style, line/grain variant, original code; allowed door variant↔sidelite variant | Separate five sidelite designs from seven art families; retain SSL eligibility |
| `sidelite_variant_glass` | Sidelite variant FK + scoped glass option FK | Scoped sidelite glass compatibility; preserve CR14-derived membership at import |
| `hardware_brands`, `hardware_styles`, `hardware_finishes`, `hardware_variants` | Brand/style/finish FKs; legacy selected ID, functional kind and knob-prep metadata | 15 grouped styles and 34 sellable finish records; artwork view/handing not fake products |
| `entry_product_options` | Codes/labels for retained order-facing prep/hinge options | Optional small catalog of DDLL* / HINGEOJ metadata; their execution remains in code |
| `grid_profiles`, `grid_patterns`, `grid_colors`, `grid_widths`, `glass_coatings` | Stable codes/labels, physical grid widths, numeric order | Small typed dimensions reused by main/sidelite grid combinations |
| `grid_combinations` plus `door_glass_grid_combinations` / `sidelite_glass_grid_combinations` | Opening family, coating, location, profile/pattern/color/width nullable where meaningful; typed allowed-membership FKs | Import allowed tuples rather than unrestricted Cartesian products; preserve widthless vs forbidden cases |
| `assets` | Storage/public path, role-neutral metadata, MIME/dimensions/bytes/checksum/version/provenance | One media record can serve several products without duplicated bytes |
| Typed asset-binding tables: `door_variant_assets`, `glass_option_assets`, `sidelite_variant_assets`, `hardware_variant_assets`, `finish_assets`, `grid_combination_assets`, plus line/group card bindings | Parent FK + asset FK + role + opening/grain/finish/view/handing context and candidate priority as applicable | Supports thumbnail/render/mask/view art with referential integrity; avoid unvalidated polymorphic product IDs |
| `catalog_change_log` | Editor, timestamp, revision, entity and before/after metadata | Future admin audit trail; separate from customer/lead records |

The above is a logical table proposal, not a mandate to build all admin screens at once. Small immutable domains such as entry type/handing may remain application enums initially. Do not precompute/store tens of trillions of full door configurations. Join small catalogs and scoped allowlists at runtime.

Use stable entities with revision-scoped published memberships/values or immutable published snapshot manifests so one builder session can remain pinned to a revision. Choose that concrete storage approach before writing migrations; a revision row by itself does not version mutable product rows. Existing submission JSON should keep the selected names/codes and ideally later include catalog revision plus stable IDs, preserving historical quotes when catalog names change.

Only add hardware–door commercial allowlists after HGI supplies authoritative restrictions; current code does not justify invented restrictions. Physical manufacturing `size_options` and stock tables should be a separate later extension after units, stock scope and supplier semantics are agreed.

### Security and administration

Expose only published customer-selectable catalog reads; restrict draft edits/publication to authenticated authorized admins. Keep notes intended for staff out of anonymous responses. Use RLS and explicit privileges on exposed tables, and never ship service-role credentials to the browser. Existing lead/dealer/telemetry access must remain unchanged. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

If media moves to Supabase Storage later, restrict write/delete through storage policies and authorized admin roles. Published product art can be public without exposing customer photos. See [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Inventory admin editing should not use the existing customer lead endpoints.

## 9. Migration safety plan

1. **Freeze and export a baseline:** preserve this source commit, scoped legacy IDs, all source and effective visible memberships, default priorities, approvals/exclusions and explicit resolved asset manifests. Include hidden/legacy records and why they are hidden. Resolve duplicate Paris ownership with HGI before applying uniqueness constraints.
2. **Build Supabase alongside current code:** new tables/admin publication, no production reads switched. Keep existing assets local initially. No FeneVision dependency.
3. **Import idempotently:** upsert by scoped stable legacy key; stage raw and effective records separately. Record source provenance and counts. Do not infer material from paths, merge by label, or mark hidden records discontinued automatically.
4. **Introduce an adapter in a later implementation phase:** return exactly the existing TypeScript shapes from either source, validating types, IDs, relationships and asset roles. Keep the hardcoded adapter as the reference. This phase does not add that adapter.
5. **Shadow comparison:** fetch Supabase inventory without driving customer UI. Diff IDs, labels, code membership, approved/hidden options, finish hex/type, render candidates and priority, resolved assets, defaults, and grid tuples against hardcoded output. Test loaded drafts and nested submission/PDF values, not counts alone.
6. **Migrate one low-risk category at a time:** suggested sequence palettes → hardware catalog → door lines/styles → main glass → sidelites → grid compatibility. Each category requires complete dependent memberships and asset bindings before switch. Keep behavioral algorithms unchanged. Treat interdependent glass/overlay changes atomically.
7. **Feature flags and coherent fallback:** opt-in staging/canary first; pin a builder session to one validated published catalog revision. Use bounded fetch timeouts, last-known-good snapshot and whole-snapshot/category-boundary fallback, never half remote/half local relationships after selection. Log source/revision/fallback without customer images or secrets.
8. **Historic draft protection:** distinguish selectable from renderable records; load a historic product with its saved revision/legacy identity where supported. If unavailable, explain and request reselection rather than silently substituting another product. Preserve current draft schema/version safeguards until an explicit migration is tested.
9. **Parity gates:** current integrity/browser/draft/handing/PDF/submission tests; direct member-set comparison; preview/reference/PDF visual samples; mobile; valid/invalid commercial combinations; disabled-product history; duplicate import; missing asset; network outage; admin publish rollback and server/browser revision mismatch.
10. **Production validation before removal:** monitor product resolution/fallback rates, test real orders with HGI, restore previous published snapshot via flag/revision if needed. Remove hardcoded runtime inventory only after a documented validation period; retain export snapshots/legacy aliases for rollback/history.

Acceptance means the same configurations remain selectable and render identically, existing saved values/PDF/submission fields remain valid, and catalog updates require admin publication rather than application redeployment. It does not mean changing product rules or the Visualizer during migration.

## 10. Risks, recommendations and verification

Highest risks: label-derived IDs; hidden records accidentally exposed; asset existence mistaken for commercial approval; different source revisions in browser/server; silently invalidating saved drafts; losing grid null/empty semantics; material inferred from gauge-named asset directories; changing defaults through DB ordering; editing colors that alter renderer fidelity; and coupling catalog downtime to normal builder access.

Admin editing can add products without redeployment only within the renderer's supported data/asset contract. A genuinely new opening shape, material rendering method or functional hardware mode may still need code support; do not promise arbitrary new geometry through inventory tables alone.

Before implementation, ask HGI to confirm commercial availability versus physical stock scope, stable manufacturer codes, hidden versus discontinued status, ownership of duplicate/legacy glass records, acceptable fallback colors, actual manufacturing dimensions, and approval responsibility. Keep admin changes draft until all assets/memberships validate and an authorized person publishes a coherent revision.

### Checks run for this report

| Check | Result |
| --- | --- |
| `npm run test:configuration-integrity` | Passed: 4,688 material/finish selections, 786 asset paths, 50,381 AI product preparations, 357 reference sets; zero missing/broken/deleted-raster references |
| `node --import tsx scripts/verifyCustomerGlassAvailability.ts` | Passed: Linen hidden, retained catalog unchanged; main 126 other rows, FSL 30, F48SL 20, SSL 28 |
| `npm run test:door-builder-draft` | Passed persistence and defensive restoration checks |
| `npm run test:entrance-compatibility` | Passed 64 A–E structure combinations and confidence/transom safeguards |
| `npm run test:option-order` | Passed 1280px desktop and 390px mobile F/F1 flows; display ordering, filtering, saved selections, keyboard focus, no overflow |
| `node --import tsx scripts/verifySideliteHanding.ts` | Passed 32 relationship/handing/view mappings plus preview/capture/PDF/AI/submission/legacy-draft checks |
| `node --import tsx scripts/auditProductionAssets.ts` | Read-only audit passed with zero missing exact references; duplicate/unreferenced candidates above |
| `npm run build` | Passed TypeScript project build and production Vite build; existing large-chunk warning (notably HEIC bundle), not a build failure |
| `git diff --check` | Passed; separate `git diff --no-index --check /dev/null docs/inventory/inventory-audit.md` also produced no whitespace errors for the new untracked report (exit 1 indicates file differences) |

No live OpenAI, production Supabase, admin publication, lead submission or paid generation request was made. Counts/relationships were inspected locally; manufacturing stock accuracy cannot be verified from this repository. The requested deliverable is this report only; no commit is made automatically.
