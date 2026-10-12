# Phase 4.5 — catalog issue review

Reviewed October 12, 2026. **Inspection and recommendations only. No runtime code, Supabase records, schema, publication or Production changes.**

## Evidence and scope

- Current Door Builder source: commit `4dd335eefd7e6811d2ac5d1ab8a6801f4715db2c`.
- Live GET-only inspection of HGI Portal Dev: `udbcnpjtwhmjzpjjhoph`.
- Pinned imported revision: `1af5506c-c723-5d6d-a341-93815d0205e2`, still **DRAFT** and unpublished.
- Imported source commit: `e06efe7ea936e20a38fa85c674c2e73697f67dc7`; digest `70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c`.
- Inspected current deterministic exporter in memory, imported source objects retained in revision/option notes, live scoped records, memberships, asset bindings and PostgREST schema metadata. The in-memory current export is NOT a new imported revision.
- All 434 scoped glass-option records match current exported identity/scope/opening, display name, lifecycle, selectability and renderability. Phase 4 semantic suite rerun: **41,480/41,480 matches across 2,440 contexts; zero mismatches**.
- Runtime inventory remains hardcoded. No service-role credential or customer data is included here.

Primary sources: `src/data/glassOptions.ts`, `privacyGlass.ts`, `decorativeGlass.ts`, `customerGlassAvailability.ts`, `fslGlass.ts`, `f48slGlass.ts`, `sslGlass.ts`, `s2slGlass.ts`, `cr14slGlass.ts`, `src/App.tsx`, `src/data/finishes.ts`, `options.ts`, `scripts/exportInventoryCatalog.ts`, and `server/inventoryShadowSemantics.ts`. Supabase tables inspected include glass designs/options and memberships, finishes/assets/bindings, and grid dimensions/combinations/bindings.

A database `renderable=true` is a retained catalog assertion, not proof of a usable installed-glass overlay. Customer availability is the intersection of product flags AND selected-variant membership AND existing UI rules. Neither label equality nor a shared image proves duplicate product ownership.

## 1. Duplicate Paris ownership

### What exists and why flagged

`src/data/glassOptions.ts:374` declares Paris in `glassThumbnailOptions`; line 1037 declares it again in `variantThumbnailOptions`. Both flow through the same overlay construction. In the exported `glassOptions` array they occupy zero-based positions **23 and 50**. Their entire final objects compare equal: same ID `paris`, label `Paris`, thumbnail and all eight overlay paths. There is no distinct product code, finish, family, opening set or ownership metadata distinguishing the two.

The Phase 3 exporter checks equality before consolidation; conflicting duplicate IDs abort. It produces one `door:paris` design and eight opening-scoped option records, retaining `sourceRowPositions:[23,50]`. CR14SL is derived directly from main CR14 overlays, so it inherits two identical `paris` rows at positions **5 and 9**. Its export likewise consolidates within that scope.

**Conclusion:** the duplicate main source rows are genuinely redundant in today's application data, not separate intended configurations. The eight main opening options and four sidelite scopes below are intentional, NOT duplicates to merge across scope.

### Every exported/live Paris option

All following records have display name **Paris**, family **decorative**, status **active**, `customer_selectable=true`, `renderable=true`. Every listed compatibility membership is selectable. There are **12 scoped option records and five scoped design records**; no S2SL Paris record exists.

| Legacy ID | Scope / opening | Design legacy key | DEV option UUID | Overlay asset | Compatible variant legacy IDs |
| --- | --- | --- | --- | --- | --- |
| paris | door / CR14 | door:paris | 655b58a7-a4fc-5e05-a047-bb9482843a38 | /assets/hgi-assets/Glass/CR14/CR14PAR.webp | cr14-craftsman-1-4-rectangle:20-gauge-smooth-steel; cr14-craftsman-1-4-rectangle:22-gauge-steel; cr14-craftsman-1-4-rectangle:signature-fir |
| paris | door / CR14PL | door:paris | 8298b8f1-6690-51c7-af69-598adf8e2450 | /assets/hgi-assets/Glass/CR14PL/CR14PL - Paris.webp | cr14pl-craftsman-1-4-cottage:20-gauge-smooth-steel |
| paris | door / F | door:paris | f6189192-86c3-51f3-a2cf-41e9e43f74b3 | /assets/hgi-assets/Glass/F/DECO/FPAR.webp | f-full-lite:20-gauge-smooth-steel; f-full-lite:22-gauge-steel; f-full-lite:brushed-smooth-fiberglass; f-full-lite:signature-cherry; f-full-lite:signature-fir; f-full-lite:signature-mahogany; f-full-lite:signature-oak; f-full-lite:textured-fiberglass |
| paris | door / F48 | door:paris | 6af5450b-b1b2-5478-a45b-70aef0b20e60 | /assets/hgi-assets/Glass/F48/DECO/F48PAR.webp | f48-3-4-lite:20-gauge-smooth-steel; f48-3-4-lite:22-gauge-steel; f48-3-4-lite:signature-mahogany; f48-3-4-lite:textured-fiberglass |
| paris | door / F482 | door:paris | 8570560b-42fb-551c-ae83-16a4db1401bc | /assets/hgi-assets/Glass/F482/F482Paris.webp | f482-3-4-lite-2-panel:20-gauge-smooth-steel; f482-3-4-lite-2-panel:brushed-smooth-fiberglass; f482-3-4-lite-2-panel:signature-cherry |
| paris | door / F848 | door:paris | f61166f5-621c-53f5-abf2-56138d101974 | /assets/hgi-assets/Glass/F848/F848PAR.webp | f848-two-8-x-48-lites-3-4-lite-:20-gauge-smooth-steel; f848-two-8-x-48-lites-3-4-lite-:22-gauge-steel; f848-two-8-x-48-lites-3-4-lite-:textured-fiberglass |
| paris | door / S | door:paris | 8d6f5f33-6595-5523-abd8-f5a735faba84 | /assets/hgi-assets/Glass/S/DECO/SPAR.webp | s-half-lite:20-gauge-smooth-steel; s-half-lite:22-gauge-steel; s-half-lite:brushed-smooth-fiberglass; s-half-lite:signature-cherry; s-half-lite:signature-mahogany; s-half-lite:signature-oak; s-half-lite:textured-fiberglass |
| paris | door / S836 | door:paris | 5191fc36-182b-5ea6-a0b7-27075f87486a | /assets/hgi-assets/Glass/S836/S836PAR.webp | s836-two-8-x-36-lites:20-gauge-smooth-steel; s836-two-8-x-36-lites:22-gauge-steel; s836-two-8-x-36-lites:brushed-smooth-fiberglass |
| paris | sidelite / CR14SL | sidelite:cr14sl:paris | 6ef9e68e-2dba-502d-a366-8610a6d8ee26 | /assets/hgi-assets/Glass/CR14/CR14PAR.webp | signature-fir:cr14sl |
| par | sidelite / F48SL | sidelite:f48sl:par | 80d1fe8e-03d8-556f-a5ed-3f36c3e73b8c | /assets/hgi-assets/Sidelites/F48SL/Glass/F48SLPAR.webp | 20-gauge-smooth-steel:f48sl; 22-gauge-steel:f48sl; brushed-smooth-fiberglass:f48sl; signature-cherry:f48sl; signature-mahogany:f48sl; signature-oak:f48sl; textured-fiberglass:f48sl |
| par | sidelite / FSL | sidelite:fsl:par | cd128604-7e45-5775-adaf-beded9a2e821 | /assets/hgi-assets/Sidelites/FSL/Glass/FSLPAR.webp | 20-gauge-smooth-steel:fsl; 22-gauge-steel:fsl; brushed-smooth-fiberglass:fsl; signature-cherry:fsl; signature-fir:fsl; signature-mahogany:fsl; textured-fiberglass:fsl |
| par | sidelite / SSL | sidelite:ssl:par | 4c54eaad-a2e8-53f6-ab7c-5bfaa8b25e59 | /assets/hgi-assets/Sidelites/SSL/Glass/SSLPAR.webp | 20-gauge-smooth-steel:ssl; 22-gauge-steel:ssl; signature-cherry:ssl; signature-mahogany:ssl; signature-oak:ssl; textured-fiberglass:ssl |


Main Paris options also bind thumbnail `/assets/glass/thumbnails/Paris.webp` and opening-specific masks `/assets/masks/{CR14,CR14PL,F848,S,F,F48,F482,S836}.png`. Sidelite options bind the overlay listed above; their card thumbnail is resolved by the existing thumbnail helper, not a separate duplicated sellable record.

Source ownership:

- All eight main options: `src/data/glassOptions.ts`, same `door:paris` design. Scope-specific artwork sizes are intentional.
- FSL `par`: `src/data/fslGlass.ts`, source position 20.
- F48SL `par`: `src/data/f48slGlass.ts`, source position 13.
- SSL `par`: `src/data/sslGlass.ts`, source position 18.
- CR14SL `paris`: `src/data/cr14slGlass.ts` derives from main CR14; positions [5,9]; shared main CR14 artwork is explicit existing behavior, not invented CR14SL artwork.
- FSL/F48SL/SSL `par` IDs must remain scoped; do not rename them to `paris` or combine memberships merely because labels match.

Other Paris references: `src/data/decorativeGlass.ts` approves the Paris name/ID; these are eligibility sets, not additional products. `src/data/heroPresets.ts:12` requests `paris` for 3STEP and line 36 for SO. Neither opening exists in the Paris overlay map above. The hero resolver in `src/App.tsx:1013–1036` checks compatible overlays and falls back to another decorative/clear option when the preferred Paris is absent. These are presentation presets, not valid Paris compatibility memberships, and are not exported as extra Paris options. Hero filenames can still contain the requested Paris ID even when the rendered demo uses fallback glass. Recommend a separate presentation-data review, not extending Paris availability to match those presets.

### Recommendation and impact

**Recommend merge the two redundant main source declarations in a separately approved cleanup, preserving canonical legacy ID `paris`, all eight overlays, ordering/default semantics and provenance. Keep all opening/sidelite scoped records.** The draft has already consolidated identical source occurrences; no further DEV record merge is needed today. Do not mark one intended scoped option legacy-only.

HGI confirmation is required before cleanup to confirm there is no undocumented manufacturer distinction; code evidence alone cannot establish manufacturer ownership. Ask: “Are both source declarations the same Paris decorative design, and is CR14SL's reuse of CR14 artwork intentional?”

Customer risk now: duplicated source choices can survive into a group and repeat React keys (`key={item.id}` in the main/sidelite glass-variant lists), but first-match lookup and artwork resolve identically. No different design/color evidence. This is not a blocker to a parity-preserving runtime reader that retains scoped identities and intentional deduplication; ownership confirmation is a release/catalog-governance gate before changing identities.

## 2. Historical glass status audit

### Counts and terminology

| Population | Count | Meaning |
| --- | --- | --- |
| Main source rows / IDs | 127 / 126 | Paris contributes the one identical duplicate |
| Main scoped options | 343 | Opening-specific records; includes NULL-opening placeholders |
| Main active/selectable IDs | 88 | Reachable in at least one valid material/style context |
| Main hidden IDs / scoped options | 38 / 45 | customer_selectable=false; currently all marked renderable |
| Sidelite scoped options | 91 | Includes CR14SL deduplication |
| Sidelite selectable / hidden | 88 / 3 | Hidden records are FSL/F48SL/SSL Linen |
| Total scoped glass options | 434 | 386 active/selectable flags; 48 hidden flags |
| Imported scoped design identities | 217 | 126 main plus 91 sidelite |
| Raw main declarations excluded before export | 57 rows / 56 IDs | Courtyard appears twice; not extra imported glass |
| Raw FSL/F48SL/SSL declarations excluded before export | 72 scoped rows | Approval-name filtering, not discontinuation proof |


The active/selectable flag on main glass is global to the design's reachability. Five opening-specific cases below are nevertheless hidden in that particular context by false memberships. Treat them as context exclusions, not globally discontinued glass.

### Deliberately hidden, historical and questionable imported records

This table covers **all 41 hidden design identities** (45 main option scopes plus 3 sidelite scopes). Each retains `renderable=true`; no record is recommended discontinued without HGI evidence.

| Legacy ID / scoped key | Display name | Openings | Current status | Selectable | Renderable | Memberships (visible/total) | Recommendation | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| blinds-espresso | Blinds - Espresso | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| blinds-gray | Blinds - Gray | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| blinds-sand | Blinds - Sand | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| blinds-silver | Blinds - Silver | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| blinds-tan | Blinds - Tan | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| blinds-white | Blinds - White | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| celestial | Celestial | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| contg | CONTG | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| decorative | Decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| extg | EXTG | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| f-blinds-15 | Blinds - 15 Lite | F | legacy_only | false | true | 0/8 | legacy_only | Explicit full-lite legacy exclusion; current FRLB choices remain active |
| f-clear-f10 | F10 – Clear Full Lite - Standard | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-f10l | F10 – Clear Full Lite - Low-E | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-f15 | Clear Glass with Grids - 15 Lite External | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-f15int | Clear Glass with Grids - 15 Lite Internal Standard | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-f15intl | Clear Glass with Grids - 15 Lite Internal Low-E | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-fpraint | Clear Glass with Grids - Prairie Internal | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-ften | Clear Glass with Grids - 10 Lite External | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-clear-nonstock | NONSTOCKCL – Non-Stock Clear Glass | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-f10l | F10L | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-f15wh | F15 White Grid | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-prairie-internal | Prairie Internal | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f-ten-lite | Ten Lite | F | legacy_only | false | true | 0/8 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f48-clear-f1248 | Clear Glass - F1248 3/4 12 Lite Ext Grids | F48, F482 | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f48-clear-f1248l | Clear Glass - F1248L 3/4 12 Lite Int Grids Low-E | F48, F482 | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f48-clear-f648l | Clear Glass - F648L 3/4 6 Lite Ext Grids Low-E | F48, F482 | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| f48-clear-nonstock | NONSTOCKCL – Non-Stock | F48, F482 | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| flatg | FLATG | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| linen | Linen | F, F48, F848, S | legacy_only | false | true | 0/22 | legacy_only | Explicit customer predicate hides Linen by ID/name; approved privacy art retained |
| ocean-caming | Ocean Caming | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| privacy | Private Lites | NULL | legacy_only | false | true | 0/0 | needs HGI review | Thumbnail only; no opening overlay or compatibility membership |
| s-clear-nonstock | NONSTOCKCL - Non-Stock Clear Glass | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-s5 | Clear Half Lite - S5 Standard | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-s5l | Clear Half Lite - S5L Low-E | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-s9 | Clear Grids and Vented - S9 Ext Grids | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-s9int | Clear Grids and Vented - S9INT Int Grids | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-s9intl | Clear Grids and Vented - S9INTL Int Grids Low-E | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| s-clear-sv6 | Clear Grids and Vented - SV6 Half Lite Vented | S | legacy_only | false | true | 0/7 | legacy_only | Explicit opening-specific legacy exclusion; current consolidated clear/grid flow replaces selection |
| F48SL:lin | Linen | F48SL | legacy_only | false | true | 0/7 | legacy_only | Explicit customer predicate hides Linen by ID/name; approved privacy art retained |
| FSL:lin | Linen | FSL | legacy_only | false | true | 0/7 | legacy_only | Explicit customer predicate hides Linen by ID/name; approved privacy art retained |
| SSL:lin | Linen | SSL | legacy_only | false | true | 0/6 | legacy_only | Explicit customer predicate hides Linen by ID/name; approved privacy art retained |


**Linen:** main `linen` has overlays in F/F48/F848/S and 22 retained door memberships. Sidelite `lin` has 7 FSL, 7 F48SL and 6 SSL memberships. All are intentionally unselectable through `isCustomerSelectableGlass`, including the name-based guard for `lin`. Approved privacy lists still retain Linen for rendering. Recommend **legacy_only**, not discontinued; no HGI decision is necessary to preserve current hiding, but HGI must confirm any future deletion/reintroduction.

**Legacy clear:** named F/F48/S legacy sets explicitly exclude old clear/grid IDs while retaining overlay mappings. Recommend **legacy_only** where the table indicates it. Do not globally retire `clear` or `clear-low-e`: they remain selectable for other openings. Future reader must honor membership flags, not just design status.

**Blinds:** the six generic color IDs and `f-blinds-15` are hidden by the full-lite legacy set. Recommend legacy_only. The current FRLB/FRLB15, FRLB48, SRLB/SFRLB/SRLB9, H8RLB and sidelite blinds remain active; Appendix A lists each separately. Shared blind artwork does not justify merging product codes. HGI should confirm whether generic sand/no-current-equivalent variants remain orderable; do not infer that from UI hiding.

**Seven thumbnail-only IDs:** `celestial, contg, decorative, extg, flatg, ocean-caming, privacy`. They have zero opening overlays and zero compatibility memberships, yet importer sets renderable=true. Some look like category/grid placeholders, and Celestial shares the Ocean Caming thumbnail. Recommendation **needs HGI review**: distinguish historical product, alias and presentation-only placeholder; do not mark discontinued. They cannot currently render an installed main-glass replacement via their own overlay. This is a lifecycle/data-quality limitation masked by matching imports, not a new runtime defect.

### Globally active but excluded in a specific opening

| Legacy ID | Name | Opening | Current option flags | Membership visibility | Recommendation |
| --- | --- | --- | --- | --- | --- |
| clear-low-e | Clear Glass - Low-E | F48 | active / selectable / renderable | 0 / 4 | active globally; retain this context exclusion |
| rain | Rain | SAT | active / selectable / renderable | 0 / 4 | active globally; retain this context exclusion |
| clear | Clear Glass - Standard | S | active / selectable / renderable | 0 / 7 | active globally; retain this context exclusion |
| clear | Clear Glass - Standard | F48 | active / selectable / renderable | 0 / 4 | active globally; retain this context exclusion |
| clear | Clear Glass - Standard | F | active / selectable / renderable | 0 / 8 | active globally; retain this context exclusion |


The `clear` exclusions originate in the F/S legacy sets and F48 allowlist; `clear-low-e` F48 is legacy-excluded; SAT excludes privacy, including Rain. These flags should be resolved as membership-level customer eligibility, not exposed based on global status.

### Raw source approval exclusions

Appendix B lists every raw main declaration and FSL/F48SL/SSL declaration removed by the source filters before export. Main rejection occurs at base-thumbnail filtering and privacy/decorative ID approval; sidelite rejection uses approved names. CR14SL inherits already-filtered main options; S2SL has only its single clear option and no additional exclusion list.

These are **not records accidentally missing from DEV**. Main definitions/overlay maps may still retain artwork for rejected designs, but they are absent from final `glassOptions`, so existing renderer lookup is not assured. Recommend **needs HGI review** for lifecycle status, retain current exclusion. Generic alias labels (Dorian, Grace, etc.) and coating/category labels (Low-E, CLiC, Blinds) must not become additional sellable products merely by importing raw arrays.

There is **no authoritative discontinued list or discontinuation date** in the inspected source/draft. HGI must supply product/code scope and effective dates to recommend discontinued. Unreachable is not synonymous with discontinued.

### Recommendation and migration impact

Keep currently reachable records **active** and deliberately hidden, overlay-backed historic records **legacy_only**. Seek HGI review for placeholders, approval exclusions and manufacturer stock conclusions. Preserve separate selectable/renderable/lifecycle fields plus per-variant flags; do not delete mappings or silently expose all active records.

Customers now see existing filtered lists; no Phase 4.5 changes. A runtime switch is blocked **if it ignores those layered visibility rules or assumes renderable=true guarantees an overlay**. A parity-preserving reader can retain the current statuses; manufacturer availability certification and questionable placeholder classification require HGI input before publication/admin lifecycle cleanup.

## 3. Wineberry asset review

### Exact record and rendering path

- Raw color ID: `wineberry`, `src/data/finishes.ts:27`.
- Configuration/export legacy finish ID: `paint-wineberry`.
- DEV finish UUID: `e709ae94-24b0-52a0-a373-a9787838fb8c`.
- Display name: **Wineberry**; type **paint**; hex **#3F0D04**; computed accent **#1c0000**; `proMatch=true` retained in source notes; status active and selectable.
- `src/data/options.ts:toFinish` declares `/assets/finishes/paint/wineberry.webp` for this finish.
- Expected repository file: `public/assets/finishes/paint/wineberry.webp` — **does not exist**.
- DEV asset UUID: `8d2b3d7e-0a65-568b-aca5-e5348c107ffe`; path retained, MIME/dimensions/byte size/checksum/transparency NULL, explicit missing-file note.
- DEV binding UUID: `f1f26321-f5b2-5e23-abbf-1d4743c2c752`; `finish_assets.role=finish_swatch`, points to that asset. **Binding is not missing.**

Current paint cards do not request `finish.image`: `src/App.tsx:2112` uses `--fallback-finish:item.color`; only stain cards create the finish-image element. `src/styles.css:.finish-tile-flat` renders the hex background with no background image. ProMatch branding is separate, not a Wineberry color substitute.

The door preview uses `finish.color`/tint and the existing slab artwork/masks. There is no dedicated alternate Wineberry image fallback; the hex swatch is the intentional primary paint presentation. Reference/submission paths retain the declared image string, so future consumers must not assume that string resolves just because an asset binding exists.

### Recommendation and impact

**Recommend add missing asset** at the exact declared path in a separately approved asset task if keeping a uniform image-backed inventory contract. Use an HGI-approved Wineberry swatch—not another color or fabricated material texture. **Do not add a second binding**; one already exists. Alternatively HGI can explicitly adopt hex-only paint swatches and retire unused image declarations through a later reviewed contract change.

No current paint-selector customer defect; no reason to hide Wineberry. Does not block a reader preserving the current hex-first paint rendering. **Does block a switch that unconditionally loads every finish binding as a required image.** HGI input: approve supplying the swatch versus a documented hex-only asset policy. No asset/binding created now.

## 4. Grid / Prairie schema review

### Actual representations

Live schema was inspected through DEV PostgREST metadata, not inferred solely from exporter objects. `allowed_grid_combinations.grid_pattern_id` is required; `grid_width_id` and `glass_coating_id` are nullable; `notes` is TEXT carrying serialized JSON. There is no dedicated location column. `grid_combination_assets.view_key` is required and carries location, but is an artwork binding rather than explicit eligibility.

| Dimension | Hardcoded behavior | Exporter / DEV draft | Shadow interpretation / concern |
| --- | --- | --- | --- |
| Location | external / internal / sdl in App; opening-specific options | notes.contexts[{location,path}]; binding view_key duplicates location | Expands each context; location absent from combination natural key, so a tuple can have multiple contexts |
| Profile | GridStyle Flat / Contoured / Prairie / Arts & Crafts | grid_profiles FK | Stable IDs retained; picker/evaluation stays in code |
| Main Prairie pattern | No numeric pattern selection; rules index color directly | Internal grid_patterns __no_pattern_selection__, customer_selectable=false, status active; required FK | Maps sentinel to NULL; never show as a product option |
| Sidelite Prairie pattern | Implicit FSL 5 Lite, F48SL 4 Lite, SSL 3 Lite | Actual pattern FK from source dictionaries | Not equivalent to no-pattern main Prairie; retain scope-specific defaults |
| Width without selection | Explicit [] means supported combination with no width question | grid_width_id=NULL, width_selection_mode=none | Valid row, not unavailable and not all-width permission |
| Unavailable width | Absent key / undefined; unsupported chosen width | No corresponding combination row | Keep separate from []/NULL; do not fill absent keys with defaults |
| Specific width | Allowed array values e.g. 5/8, 7/8, 11/16 inch | Width FK + width_selection_mode=specific; fractional legacy labels and numeric inches | Use IDs; no inferred new sizes |
| Coating | Standard/Low-E match calculated from source dictionaries; composite eligibility labels | glass_coatings FK includes combined labels such as Standard / No Low-E or Low-E | Parity preserved; composite label is an allowed set, not necessarily an actual single coating selection |
| Color | Stable GridColor keys, hex or Bronze/White gradient | grid_colors.hex_color when valid hex; notes.appearance for gradient | Bicolor is not missing color; do not replace with one hex |
| Artwork/template | Source resolver maps profile/pattern/color/scope to existing paths; tint/default render logic in code | notes.contexts.path plus assets/grid_combination_assets by location | Compare both; notes path and FK binding can drift independently |
| Rule provenance | Private App dictionaries + side module exports | Revision notes.sourceFacts stores original dictionaries, helper values and side implicit patterns | Provenance, not executable database UI rules |


Live counts: **384 combinations; 46 Prairie combinations (28 main sentinel, 18 sidelite numeric); 22 NULL-width combinations; 2 combinations with multiple location contexts; zero combinations without any artwork binding.** Binding presence is not pixel-appearance verification.

Examples:

- Main F clear-grids / internal / Prairie / Beige / NULL width / “Standard / No Low-E or Low-E”: path `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACHBE.webp`.
- S Prairie / Beige / NULL width is Low-E only; missing Standard Beige is not another widthless choice.
- Sidelite SSL Prairie uses **3 Lite**; F48SL **4 Lite**; FSL **5 Lite**, with per-color widths and coatings from their source rules.
- External/SDL combinations may share the same tuple/artwork with other locations. Shared paths do not make location eligibility interchangeable.
- Bronze/White stores a CSS two-color gradient in notes.appearance, hex NULL; preserving it is required for parity.

Exporter special cases: `ruleGrid` distinguishes empty arrays from absent keys and unions Standard/Low-E signatures; `gridCombo` excludes location from its dedupe key, retains all contexts in notes; main Prairie injects the nonselectable sentinel; coating composite labels mirror App; artwork binding is created only for an existing file. Phase 4 native resolver uses a local `none` dictionary key normalized to NULL, while the database resolver normalizes `__no_pattern_selection__` to NULL and expands notes contexts. These two internal representations must never appear in customer/admin product pickers.

### Exact recommendation

Choose **B + C: add dedicated schema fields through a small, separately reviewed follow-up migration before public runtime migration**. Keep today's mapping unchanged during review/shadow testing (A temporarily). Keep evaluation/rendering behavior in code (D).

Proposed follow-up, NOT implemented:

1. Represent eligibility location explicitly—prefer a revisioned `grid_combination_locations` relation with controlled values external/internal/sdl, since two existing combinations have multiple locations. Link artwork to that context rather than duplicate unconstrained notes/view_key strings. Preserve current paths/IDs during migration.
2. Add explicit pattern-selection semantics, e.g. `pattern_selection_mode = none | implicit | selectable`. Permit NULL pattern FK for none; retain real numeric pattern for implicit sidelite cases. Backfill all 28 sentinel combinations with the right semantics before hiding/retiring the sentinel in a later revision. Review NULL-aware uniqueness/check constraints; a naive unique key containing NULL can allow duplicate logical combinations.
3. Keep existing width_selection_mode and NULL width—already models the required distinction. Add/verify an invariant none iff width FK is NULL, and document absent row means unavailable. No extra “unavailable” width record.
4. Define whether coating rows represent eligibility sets or selected manufacturing coatings. If admin editing needs atomic Standard/Low-E/Low-E Plus choices, use explicit memberships rather than parse human display strings. Backfill without changing allowed tuples; do not infer additional Low-E Plus support.
5. Give bicolor appearance explicit structured data if admin edits require it (e.g. ordered color components); do not store executable CSS supplied by admins. Single-color hex remains appropriate.
6. Keep artwork path in assets/bindings as source of truth; leave notes as provenance. Add semantic parity coverage for location, no/implicit pattern, no-width and coating sets before retiring old mappings. Do not introduce an arbitrary schema rule engine.

HGI input: confirm Prairie's absence of a main numeric question versus implicit sidelite patterns, combined coating-label meaning and how Bronze/White maps to physical sides. Engineering can design typed fields, but must not infer manufacturing availability.

Current customer effect: none; hardcoded rules still govern. Current mapping passes parity and is sufficient for DEV shadow testing. **Release gate before runtime/admin switch:** resolve or explicitly accept the notes/sentinel contract. A specialized reader could technically preserve behavior as-is, but generic readers/admin CRUD could expose a sentinel, lose a location or interpret NULL as unavailable. Recommend schema follow-up before that switch, not a runtime fix now.

## 5. Additional catalog-quality findings

1. Seven thumbnail-only glass IDs marked renderable with no overlay/membership (above). Treat “renderable” as requiring a role/scope-aware contract in future; do not silently flip current flags.
2. Global selectability differs from per-opening eligibility in five cases. Current imported memberships are correct; readers must combine both flags. Status-only queries would expose obsolete clear choices/SAT privacy.
3. Raw main/sidelite approval exclusions intentionally are not imported. Matching Phase 3/4 data is NOT a complete manufacturer master list. An admin must not reintroduce raw rejected art as active inventory without approval.
4. Names, IDs and categories are not universally aligned: `privacy` is labelled Private Lites but classified decorative; `celestial` uses Ocean Caming thumbnail; `par` and `paris` vary by scope. Confirm identity rather than “cleaning up” names/IDs opportunistically.
5. Composite coating labels and Bronze/White gradient metadata are structured product semantics encoded as strings/notes. They merit migration contract review, not new current products.
6. Current imported status is inferred from UI reachability, not HGI lifecycle history. No record can be authoritatively called discontinued from this evidence alone.
7. Paris hero presets request unsupported 3STEP/SO opening combinations and can render fallback glass under a Paris-labelled filename. This is existing presentation-data drift, not a missing sellable Paris membership. Do not change product availability to satisfy marketing/demo presets.

No additional runtime fix is proposed or applied.

## Appendix A — complete imported glass identity register

Covers all **217 design identities / 434 scoped option records**. Multiple opening codes in one row represent separate option records. Main source is `src/data/glassOptions.ts`; sidelite source is the corresponding `{opening.toLowerCase()}Glass.ts` (CR14SL derives from main, S2SL owns clear). `Visible/total memberships` is across listed openings; see the five per-opening exceptions above. Renderable column records the DEV assertion, not visual verification.

For active records, recommendation active means retain current customer availability—not manufacturer stock certification. For hidden records, reasons are in section 2; HGI review means do not change current legacy_only status until ownership is resolved.

| Scope / legacy key | Display name | Family | Opening codes | Current status | Selectable | Renderable | Visible/total memberships | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| door / bay-point | Bay Point | decorative | CR14PL, F | active | true | true | 9/9 | active |
| door / blinds-espresso | Blinds - Espresso | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / blinds-gray | Blinds - Gray | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / blinds-sand | Blinds - Sand | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / blinds-silver | Blinds - Silver | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / blinds-tan | Blinds - Tan | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / blinds-white | Blinds - White | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / ca-grace-nickel | Grace - Nickel | decorative | CA | active | true | true | 1/1 | active |
| door / ca-grace-patina | Grace - Patina | decorative | CA | active | true | true | 1/1 | active |
| door / ca-heirloom-brass | Heirloom - Brass | decorative | CA | active | true | true | 1/1 | active |
| door / ca-heirloom-nickel | Heirloom - Nickel | decorative | CA | active | true | true | 1/1 | active |
| door / cadence | Cadence | decorative | F, F48, F482, F848, FO, SO, SO2 | active | true | true | 24/24 | active |
| door / celestial | Celestial | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / chinchilla | Chinchilla | privacy | 3LT, 3STEP, 4LT, 5LT, CR14PL, F48, F482, F764, F848, S, S836 | active | true | true | 35/35 | active |
| door / clear | Clear Glass - Standard | clear | 3LT, 3STEP, 4LT, 5LT, CR14, CR14PL, F, F2, F3, F4, F48, F764, F848, FO, S, S2, S3, S4, S836 | active | true | true | 48/67 | active |
| door / clear-low-e | Clear Glass - Low-E | clear | 3LT, 3STEP, 4LT, 5LT, F48, F764 | active | true | true | 14/18 | active |
| door / cobblestone | Cobblestone | decorative | CR14, F, S | active | true | true | 18/18 | active |
| door / contg | CONTG | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / cr14-divided-lites | Craftsman Divided Lites | clear | CR14, CR14PL | active | true | true | 4/4 | active |
| door / cr14pl-dorian | Dorian | decorative | CR14PL | active | true | true | 1/1 | active |
| door / cubed | Cubed | decorative | 3LT, 3STEP, 4LT, 5LT, F764 | active | true | true | 14/14 | active |
| door / cumulus | Cumulus | privacy | CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 29/29 | active |
| door / decorative | Decorative | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / dorian-nickel | Dorian - Nickel | decorative | F, F48, F482, F848, S, S836 | active | true | true | 28/28 | active |
| door / dorian-patina | Dorian - Patina | decorative | F, F48, F482, F848, S, S836 | active | true | true | 28/28 | active |
| door / dutchcraft | Dutchcraft | decorative | CR14, F, S | active | true | true | 18/18 | active |
| door / extg | EXTG | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / f-blinds-15 | Blinds - 15 Lite | blinds | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-blinds-frlb-espresso | FRLB - Espresso Blinds | blinds | F | active | true | true | 8/8 | active |
| door / f-blinds-frlb-gray | FRLB - Slate Gray Blinds | blinds | F | active | true | true | 8/8 | active |
| door / f-blinds-frlb-silver | FRLB - Silver Moon Blinds | blinds | F | active | true | true | 8/8 | active |
| door / f-blinds-frlb-tan | FRLB - Tan Blinds | blinds | F | active | true | true | 8/8 | active |
| door / f-blinds-frlb-white | FRLB - White Blinds | blinds | F | active | true | true | 8/8 | active |
| door / f-blinds-frlb15-white | FRLB15 – Full 15 Lite Blinds (White) | blinds | F | active | true | true | 8/8 | active |
| door / f-clear-f10 | F10 – Clear Full Lite - Standard | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-f10l | F10 – Clear Full Lite - Low-E | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-f15 | Clear Glass with Grids - 15 Lite External | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-f15int | Clear Glass with Grids - 15 Lite Internal Standard | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-f15intl | Clear Glass with Grids - 15 Lite Internal Low-E | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-fpraint | Clear Glass with Grids - Prairie Internal | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-ften | Clear Glass with Grids - 10 Lite External | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clear-grids | Clear Glass with Grids | clear | F | active | true | true | 8/8 | active |
| door / f-clear-no-grids | Clear Glass with No Grids | clear | F | active | true | true | 8/8 | active |
| door / f-clear-nonstock | NONSTOCKCL – Non-Stock Clear Glass | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-clic-ext-10l | External Grids - 10 Lite | clic | F | active | true | true | 8/8 | active |
| door / f-clic-ext-15l | External Grids - 15 Lite | clic | F | active | true | true | 8/8 | active |
| door / f-clic-ext-8l | External Grids - 8 Lite | clic | F | active | true | true | 8/8 | active |
| door / f-clic-nogrid | NOGRID – No Grids | clic | F | active | true | true | 8/8 | active |
| door / f-f10l | F10L | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-f15wh | F15 White Grid | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-prairie-internal | Prairie Internal | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f-ten-lite | Ten Lite | clear | F | legacy_only | false | true | 0/8 | legacy_only |
| door / f48-blinds-white | FRLB48 – 3/4 Lite Blinds - White Blinds | blinds | F48, F482 | active | true | true | 7/7 | active |
| door / f48-clear-f1248 | Clear Glass - F1248 3/4 12 Lite Ext Grids | clear | F48, F482 | legacy_only | false | true | 0/7 | legacy_only |
| door / f48-clear-f1248l | Clear Glass - F1248L 3/4 12 Lite Int Grids Low-E | clear | F48, F482 | legacy_only | false | true | 0/7 | legacy_only |
| door / f48-clear-f648l | Clear Glass - F648L 3/4 6 Lite Ext Grids Low-E | clear | F48, F482 | legacy_only | false | true | 0/7 | legacy_only |
| door / f48-clear-grids | Clear Glass with Grids | clear | F48, F482 | active | true | true | 7/7 | active |
| door / f48-clear-no-grids | Clear Glass | clear | F48, F482 | active | true | true | 7/7 | active |
| door / f48-clear-nonstock | NONSTOCKCL – Non-Stock | clear | F48, F482 | legacy_only | false | true | 0/7 | legacy_only |
| door / f48-clic-ext-12l | External Grids - 12 Lite | clic | F48, F482 | active | true | true | 7/7 | active |
| door / f48-clic-nogrid | NOGRID – No Grids | clic | F48, F482 | active | true | true | 7/7 | active |
| door / flatg | FLATG | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / frt-clear-f17rt | F17RT - 17 Lite Ext Grids Round Top | clear | FRT | active | true | true | 3/3 | active |
| door / grace-nickel | Grace - Nickel | decorative | F, F48, F482, FO, QA, S, S836, SAT, SO, SO2, SW | active | true | true | 43/43 | active |
| door / grace-patina | Grace - Patina | decorative | F48, F482, F848, FO, QA, SAT, SW | active | true | true | 25/25 | active |
| door / heirlooms-brass | Heirlooms - Brass | decorative | F, F48, F482, F848, FO, N, S, S836, SO, SO2, SW | active | true | true | 40/40 | active |
| door / heirlooms-nickel | Heirlooms - Nickel | decorative | F, F48, F482, F848, FO, N, S, S836, SO, SO2, SW | active | true | true | 40/40 | active |
| door / hrt-clear-s11rt | S11RT - Half Round Top Clear Glass | clear | HRT | active | true | true | 4/4 | active |
| door / hrt-nouveau-nickel | Nouveau - Nickel | decorative | HRT | active | true | true | 4/4 | active |
| door / hrt-nouveau-patina | Nouveau - Patina | decorative | HRT | active | true | true | 4/4 | active |
| door / lazarus | Lazarus | decorative | F, S | active | true | true | 15/15 | active |
| door / leland | Leland | decorative | CR14, F, S | active | true | true | 18/18 | active |
| door / lexington | Lexington | decorative | F, S | active | true | true | 15/15 | active |
| door / linen | Linen | privacy | F, F48, F848, S | legacy_only | false | true | 0/22 | legacy_only |
| door / majestic-nickel | Majestic - Nickel | decorative | F, F482, F848 | active | true | true | 14/14 | active |
| door / majestic-patina | Majestic - Patina | decorative | F, F482, S, S836 | active | true | true | 21/21 | active |
| door / margate | Margate | decorative | CR14PL, F48, F482, F848, S, S836 | active | true | true | 21/21 | active |
| door / mistify | Mistify | privacy | CR14PL, F48, F482, S836 | active | true | true | 11/11 | active |
| door / mohave | Mohave | decorative | F, F48, F482, S, S836 | active | true | true | 25/25 | active |
| door / n-clear-ncl | NCL - Clear Glass Nine Panel | clear | N | active | true | true | 2/2 | active |
| door / nouveau-nickel | Nouveau - Nickel | decorative | F, F48, F482, F848, FO, N, QA, S, S836, SO, SO2, SW | active | true | true | 44/44 | active |
| door / nouveau-patina | Nouveau - Patina | decorative | F, F48, F482, F848, FO, N, QA, S, S836, SO, SO2, SW | active | true | true | 44/44 | active |
| door / oak-park | Oak Park | decorative | CR14, CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 32/32 | active |
| door / ocean-caming | Ocean Caming | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / ovation | Ovation | decorative | F | active | true | true | 8/8 | active |
| door / paris | Paris | decorative | CR14, CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 32/32 | active |
| door / privacy | Private Lites | decorative | NULL | legacy_only | false | true | 0/0 | needs HGI review |
| door / qa-clear-qacl | QACL - Quarter Arch Clear Glass | clear | QA | active | true | true | 4/4 | active |
| door / rain | Rain | privacy | 3LT, 3STEP, 4LT, 5LT, CR14, CR14PL, F, F48, F482, F764, N, S, S836, SAT, SO, SO2 | active | true | true | 48/52 | active |
| door / renewed-impressions | Renewed Impressions | decorative | F, S, S836, SO, SO2, SW | active | true | true | 25/25 | active |
| door / s-blinds-sfrlb-espresso | SFRLB - Espresso Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-sfrlb-gray | SFRLB - Slate Gray Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-sfrlb-silver | SFRLB - Silver Moon Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-sfrlb-tan | SFRLB - Tan Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-sfrlb-white | SFRLB - White Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-sfrlb9-white | SFRLB9 - White Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb-espresso | SRLB - Espresso Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb-gray | SRLB - Slate Gray Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb-silver | SRLB - Silver Moon Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb-tan | SRLB - Tan Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb-white | SRLB - White Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-blinds-srlb9-white | SRLB9 - White Blinds | blinds | S | active | true | true | 7/7 | active |
| door / s-clear-grids | Clear Glass with Grids | clear | S | active | true | true | 7/7 | active |
| door / s-clear-no-grids | Clear Glass | clear | S | active | true | true | 7/7 | active |
| door / s-clear-nonstock | NONSTOCKCL - Non-Stock Clear Glass | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-s5 | Clear Half Lite - S5 Standard | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-s5l | Clear Half Lite - S5L Low-E | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-s9 | Clear Grids and Vented - S9 Ext Grids | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-s9int | Clear Grids and Vented - S9INT Int Grids | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-s9intl | Clear Grids and Vented - S9INTL Int Grids Low-E | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clear-sv6 | Clear Grids and Vented - SV6 Half Lite Vented | clear | S | legacy_only | false | true | 0/7 | legacy_only |
| door / s-clic-ext-4l | EXTG - 4 Lite | clic | S | active | true | true | 7/7 | active |
| door / s-clic-ext-9l | EXTG - 9 Lite | clic | S | active | true | true | 7/7 | active |
| door / s-clic-nogrid | NOGRID - No Grids | clic | S | active | true | true | 7/7 | active |
| door / s836-blinds-h8rlb | H8RLB - Two 8x36 Blinds | blinds | S836 | active | true | true | 3/3 | active |
| door / sat-clear-nonstock | NONSTOCKCL - Non-Stock Clear Glass | clear | SAT | active | true | true | 4/4 | active |
| door / so-clear-nonstock | NONSTOCKCL - Non-Stock Clear Glass | clear | SO, SO2 | active | true | true | 3/3 | active |
| door / so-clear-small-low-e | Small Oval Clear - Low-E | clear | SO, SO2 | active | true | true | 3/3 | active |
| door / so-clear-small-no-coating | Small Oval Clear - No Low-E | clear | SO, SO2 | active | true | true | 3/3 | active |
| door / sw-clear-swg | SWG - Half Round Glass With External Grids | clear | SW | active | true | true | 4/4 | active |
| door / sw-rain-5l | Rain - 5L 5 Lite | privacy | SW | active | true | true | 4/4 | active |
| door / sw-rain-nogrid | Rain - No Grid | privacy | SW | active | true | true | 4/4 | active |
| door / topaz | Topaz | decorative | CR14, CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 32/32 | active |
| door / vapor | Vapor | privacy | CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 29/29 | active |
| door / vilano | Vilano | decorative | CR14PL, F, F48, F482, F848, S, S836 | active | true | true | 29/29 | active |
| door / waterside | Waterside | decorative | F, F48, F482, F848, S, S836 | active | true | true | 28/28 | active |
| sidelite / CR14SL:clear | Clear Glass - Standard | clear | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:cobblestone | Cobblestone | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:cr14-divided-lites | Craftsman Divided Lites | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:dutchcraft | Dutchcraft | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:leland | Leland | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:oak-park | Oak Park | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:paris | Paris | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:rain | Rain | privacy | CR14SL | active | true | true | 1/1 | active |
| sidelite / CR14SL:topaz | Topaz | decorative | CR14SL | active | true | true | 1/1 | active |
| sidelite / F48SL:4lchi | Chinchilla – 4 Lite | privacy | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:cad | Cadence | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:chi | Chinchilla | privacy | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:clear-grids | Clear Glass with Grids | clear | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:clear-no-grids | Clear Glass with No Grids | clear | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:cum | Cumulus | privacy | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:dorni | Dorian – Nickel | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:dorpa | Dorian – Patina | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:gra | Grace | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:heibb | Heirlooms – Brass | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:heini | Heirlooms – Nickel | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:lin | Linen | privacy | F48SL | legacy_only | false | true | 0/7 | legacy_only |
| sidelite / F48SL:maj | Majestic | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:moh | Mohave | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:nouni | Nouveau – Nickel | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:noupa | Nouveau – Patina | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:oak | Oak Park | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:par | Paris | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:rai | Rain | privacy | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:top | Topaz | decorative | F48SL | active | true | true | 7/7 | active |
| sidelite / F48SL:vap | Vapor | privacy | F48SL | active | true | true | 7/7 | active |
| sidelite / FSL:bay | Bay Point | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:cad | Cadence | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:chi | Chinchilla | privacy | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:clear-grids | Clear Glass with Grids | clear | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:clear-no-grids | Clear Glass with No Grids | clear | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:cob | Cobblestone | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:cum | Cumulus | privacy | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:dorni | Dorian – Nickel | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:dorpa | Dorian – Patina | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:dut | Dutchcraft | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:entl | CLiC – Left | clic | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:entr | CLiC – Right | clic | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:frlbsl | Mini Blinds | blinds | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:gra | Grace | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:heibb | Heirlooms – Brass | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:heini | Heirlooms – Nickel | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:laz | Lazarus | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:lel | Leland | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:lex | Lexington | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:lin | Linen | privacy | FSL | legacy_only | false | true | 0/7 | legacy_only |
| sidelite / FSL:maj | Majestic | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:moh | Mohave | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:nouni | Nouveau – Nickel | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:noupa | Nouveau – Patina | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:oak | Oak Park | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:ova | Ovation | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:par | Paris | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:rai | Rain | privacy | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:ren | Renewed Impressions | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:top | Topaz | decorative | FSL | active | true | true | 7/7 | active |
| sidelite / FSL:vap | Vapor | privacy | FSL | active | true | true | 7/7 | active |
| sidelite / S2SL:clear-no-grids | Clear Glass with No Grids | clear | S2SL | active | true | true | 4/4 | active |
| sidelite / SSL:chi | Chinchilla | privacy | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:clear-grids | Clear Glass with Grids | clear | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:clear-no-grids | Clear Glass with No Grids | clear | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:cob | Cobblestone | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:cum | Cumulus | privacy | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:dorni | Dorian – Nickel | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:dorpa | Dorian – Patina | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:dut | Dutchcraft | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:gra | Grace | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:heibb | Heirlooms – Brass | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:heini | Heirlooms – Nickel | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:laz | Lazarus | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:lel | Leland | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:lex | Lexington | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:lin | Linen | privacy | SSL | legacy_only | false | true | 0/6 | legacy_only |
| sidelite / SSL:maj | Majestic | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:mar | Margate | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:moh | Mohave | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:nouni | Nouveau – Nickel | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:noupa | Nouveau – Patina | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:oak | Oak Park | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:par | Paris | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:rai | Rain | privacy | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:ren | Renewed Impressions | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:rlbsl | Mini Blinds – Raise, Lower & Tilt | blinds | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:top | Topaz | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:vap | Vapor | privacy | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:vil | Vilano | decorative | SSL | active | true | true | 6/6 | active |
| sidelite / SSL:wts | Waterside | decorative | SSL | active | true | true | 6/6 | active |


## Appendix B — complete pre-export exclusion register

All rows below are customer-unreachable through these source lists and absent from corresponding exported/DEV identities. Recommendation for each: **needs HGI review**, retain exclusion. Renderability/lifecycle are **not represented as catalog flags**, and a raw thumbnail or declaration alone does not prove a historical saved configuration can render. No record is recommended discontinued. Main raw arrays are in `src/data/glassOptions.ts`; side arrays are in the indicated scope module.

| Raw scope / ID | Label | Source array/file | Why not exported/selectable | Recommendation |
| --- | --- | --- | --- | --- |
| main / ashbury | Ashbury | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / berkley | Berkley | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / blanca | Blanca | glassOptions.ts / glassThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / blinds | Blinds | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / briselle | Briselle | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / bristol | Bristol | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / calandra | Calandra | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / carrollton | Carrollton | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / catalina | Catalina | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / clic | CLIC | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / courtyard | Courtyard | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / crosswalk | Crosswalk | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / cyndi | Cyndi | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / dorian | Dorian | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / edgewood | Edgewood | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / elegant | Elegant | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / empire | Empire | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / entropy | Entropy | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / fragrance | Fragrance | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / frosted | Frosted | glassOptions.ts / glassThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / garrison | Garrison | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / geneva | Geneva | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / grace | Grace | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / heirlooms | Heirlooms | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / high-point | High Point | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / jacinto | Jacinto | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / jameston | Jameston | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / laurel | Laurel | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / london | London | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / low-e | Low-E | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / low-e-plus | Low-E+ | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / low-e-366 | Low-E 366 | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / majestic | Majestic | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / metro | Metro | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / micro-granite | Micro Granite | glassOptions.ts / glassThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / monterey | Monterey | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / neo | Neo | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / nouveau | Nouveau | glassOptions.ts / glassThumbnailOptions | base-thumbnail generic/legacy/low-E filtering | needs HGI review |
| main / pembrook | Pembrook | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / prestige | Prestige | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / retro | Retro | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / rill | Rill | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / riverwood | Riverwood | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / sterling | Sterling | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / vincraft | Vincraft | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / wyngate | Wyngate | glassOptions.ts / glassThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / baroque | Baroque | glassOptions.ts / variantThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / cr14pl-monterey | Monterey | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / double-water | Double Water | glassOptions.ts / variantThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / streamed | Streamed | glassOptions.ts / variantThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / wide-reed | Wide Reed | glassOptions.ts / variantThumbnailOptions | privacy approval exclusion | needs HGI review |
| main / elegant-black-white | Elegant - Black/White | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / elegant-nickel | Elegant - Nickel | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / elegant-patina | Elegant - Patina | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / monterey-nickel | Monterey - Nickel | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / monterey-patina | Monterey - Patina | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| main / courtyard | Courtyard | glassOptions.ts / variantThumbnailOptions | decorative approval exclusion | needs HGI review |
| FSL / ash | Ashbury | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / ber | Berkley | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / bri | Bristol | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / cal | Calandra | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / car | Carrollton | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / cat | Catalina | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / cou | Courtyard | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / cro | Crosswalk | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / edg | Edgewood | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / elebw | Elegant – Black/White | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / eleni | Elegant – Nickel | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / elepa | Elegant – Patina | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / gen | Geneva | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / hig | High Point | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / jac | Jacinto | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / jam | Jameston | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / lau | Laurel | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / lon | London | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / monni | Monterey – Nickel | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / monpa | Monterey – Patina | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / pem | Pembrook | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / pre | Prestige | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / riv | Riverwood | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / ste | Sterling | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / vin | Vincraft | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / wyn | Wyngate | src/data/fslGlass.ts | decorative name approval exclusion | needs HGI review |
| FSL / bla | Blanca | src/data/fslGlass.ts | privacy name approval exclusion | needs HGI review |
| FSL / celoc | Celestial | src/data/fslGlass.ts | privacy name approval exclusion | needs HGI review |
| FSL / mic | Micro Granite | src/data/fslGlass.ts | privacy name approval exclusion | needs HGI review |
| F48SL / ber | Berkley | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / bri | Bristol | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / cal | Calandra | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / car | Carrollton | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / cou | Courtyard | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / cro | Crosswalk | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / cyd | Cyndi | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / elebw | Elegant – Black/White | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / eleni | Elegant – Nickel | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / elepa | Elegant – Patina | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / emp | Empire | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / gen | Geneva | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / hig | High Point | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / jac | Jacinto | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / met | Metro | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / monni | Monterey – Nickel | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / monpa | Monterey – Patina | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / neo | Neo | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / pre | Prestige | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / ste | Sterling | src/data/f48slGlass.ts | decorative name approval exclusion | needs HGI review |
| F48SL / bla | Blanca | src/data/f48slGlass.ts | privacy name approval exclusion | needs HGI review |
| F48SL / mic | Micro Granite | src/data/f48slGlass.ts | privacy name approval exclusion | needs HGI review |
| F48SL / 4lbla | Blanca – 4 Lite | src/data/f48slGlass.ts | privacy name approval exclusion | needs HGI review |
| F48SL / 4lmic | Micro Granite – 4 Lite | src/data/f48slGlass.ts | privacy name approval exclusion | needs HGI review |
| SSL / ber | Berkley | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / bri | Bristol | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / cou | Courtyard | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / cro | Crosswalk | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / edg | Edgewood | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / elebw | Elegant – Black/White | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / eleni | Elegant – Nickel | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / elepa | Elegant – Patina | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / emp | Empire | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / jam | Jameston | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / lau | Laurel | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / lon | London | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / met | Metro | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / neo | Neo | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / pem | Pembrook | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / pre | Prestige | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / vin | Vincraft | src/data/sslGlass.ts | decorative name approval exclusion | needs HGI review |
| SSL / bla | Blanca | src/data/sslGlass.ts | privacy name approval exclusion | needs HGI review |
| SSL / mic | Micro Granite | src/data/sslGlass.ts | privacy name approval exclusion | needs HGI review |


## Verification and safety

- DEV project/credential guards executed before authenticated reads; pinned DRAFT status/provenance validated.
- Read-only catalog and schema requests only; no importer apply, mutation, migration or publication calls.
- Current exporter ran in memory only; no exported file or new DEV revision was created.
- Scope/identity/lifecycle flags for all 434 options matched current export.
- Shadow suite: 41,480 matches, zero mismatches; pin, outage, timeout and privacy tests passed.
- Only this report was added to the repository. The pre-existing untracked `scripts/verifyInventoryCatalog.ts` was preserved.
- Runtime source, assets and Production unchanged. No commit/push.
- `git diff --check` and the separate new-report whitespace check passed.
- This documentation-only task does not retest paid AI generation or claim new rendering/stock certification.

## Summary and decisions requested

| Issue | Current Risk | Blocks Runtime Switch? | Recommended Action | HGI Input Needed? |
| --- | --- | --- | --- | --- |
| Duplicate Paris ownership | Low: redundant identical source entries; scope collapse would be harmful | No for scoped parity reader; ownership gate before identity cleanup | Merge redundant main declarations later; keep all main/sidelite scoped records; draft already deduped | Yes: canonical ownership and CR14SL art reuse |
| Historical glass status | Medium: naive flags could expose hidden options; seven renderable assertions lack overlays | Yes if membership/legacy behavior is not preserved; otherwise lifecycle review gate | Keep reachable active, deliberate history legacy_only; review placeholders/raw exclusions; no unsupported discontinued claims | Yes for questionable identities and manufacturer lifecycle |
| Wineberry asset | Low now: hex paint rendering works; declared file missing | No for hex-first paint; yes if all bound images are required | Add approved missing asset later, or approve hex-only contract; binding already exists | Yes: approved swatch versus hex-only policy |
| Grid / Prairie schema | Medium migration/admin risk: notes/sentinel/composite-label dependencies | Recommended pre-switch gate, not a current customer blocker | B+C small schema follow-up; preserve mappings now; retain rendering/evaluation in code | Yes for Prairie/coating/bicolor physical meaning |

**Review is complete. Recommendations require separately authorized follow-up work; nothing has been fixed or published here.**
