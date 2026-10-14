# Customer product display-name audit

The shared presentation mapping is `src/data/productDisplayNames.ts`.
Catalog IDs, codes, asset paths, saved values and submission labels are unchanged.
Door descriptions come from the explicit `code|description` declarations in
`src/data/productCatalog.ts`; no names are inferred from code spelling.
Door cards, summaries, accessibility descriptions and PDF descriptions use
these descriptions without the generated code prefix. Material names remain
separate from door/slab names. Existing submission formatting retains codes.
Neither customer PDF template has a dedicated door-product-code field.

## Verified examples

- SSL: **Half Sidelite**, supported by the named SSL correction in commit
  `b17ca6d` and `scripts/pdfRendererHarness.ts`'s `halfSideliteFixture`.
- F48 door: **3/4 Lite**, explicitly declared in the door catalog. This is
  **not** evidence for the manufacturer's expanded F48SL sidelite name.
- 2PHD: the only verified descriptor is **2P HD Flat Top**. Its duplicated
  leading `2PHD` code is removed; `2P` and `HD` are not guessed or expanded.
- Six-panel: **Six Panel No Glass** in customer descriptions. The separate
  material-aware submission formatter still supplies S1NGSS/S1.

## Requires HGI confirmation

| Product/context | Available evidence | Still unresolved |
| --- | --- | --- |
| F48SL sidelite | Code-only sidelite declarations and matching artwork paths | Approved readable product name |
| FSL sidelite | Code-only sidelite declarations and matching artwork paths | Approved readable product name |
| S2SL sidelite | Code-only sidelite declarations and matching artwork paths | Approved readable product name |
| CR14SL sidelite | Code-only sidelite declarations and matching artwork paths | Approved readable product name |
| 2PHD / HDAT1 doors | 2P HD Flat Top / HD Arch Top descriptors | Meaning/approved expansion of HD; full 2PHD name |
| N door | N Panel descriptor | Full manufacturer name |
| QA door | 648 Quarter Height Eye Brow descriptor | Meaning of 648; preserved pending confirmation |
| Code-only glass labels/groups | CONTG, EXTG, FLATG, F10L; FRLB/SRLB/SFRLB families | Approved distinct product/group names where no complete descriptor is supplied |

Unverified labels are retained rather than replaced with invented names.
For full glass descriptions that explicitly supply `CODE - description`, the
customer summary/PDF removes the prefix. Glass grouping keys, variant identity,
availability, and order-sensitive choices are not rewritten. Existing readable
glass families, hardware brands/styles/finishes, paint/stain colors, materials,
and jamb type labels require no product-code translation. CLiC, Low-E and SDL
terminology is not treated as an invented product name.

The audit inspected catalog/asset declarations, repository documentation,
available pasted request records and locally available git history. Unavailable
past conversations and manufacturer systems were not used as evidence.

## Verification

- Desktop (1280 px) and mobile (390 px): all 42 door styles remain available;
  verified names appear in cards, selected values and summaries; saved IDs and
  submission product codes remain intact.
- Dependent defaults, six-panel material/code checks, draft persistence and
  configuration integrity passed (814 asset paths, zero missing assets).
- All 75 PDF rendering configurations passed; actual PDF text and page layout
  were checked. TypeScript, production build and whitespace checks passed.
- The broader submission suite has a pre-existing Savannah expectation failure
  (`Locks on Both Doors` versus `Lock on Main Door Only`). It fails identically
  on a temporary copy of the committed baseline. That unrelated test and its
  runtime implementation were not changed.
