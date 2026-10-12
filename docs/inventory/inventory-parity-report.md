# Phase 3B - Inventory parity report

Verified October 12, 2026 against HGI Portal Dev (`udbcnpjtwhmjzpjjhoph`).

Revision `1af5506c-c723-5d6d-a341-93815d0205e2` remains **draft**, with no publication timestamp/user. Source commit: `e06efe7ea936e20a38fa85c674c2e73697f67dc7`.

Catalog SHA-256: `70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c`.

## Comparison method

The exporter reads current committed runtime catalog modules and private App inventory constants without modifying them. Local checks validate deterministic output, source counts, scoped identities, FK integrity and special cases. The importer reads all DEV rows with pagination, then compares every exported field by UUID using canonical JSON, including labels, legacy IDs, status/selectability/renderability, FK memberships, notes/source metadata, paths, ordering, checksums and asset dimensions. Server-generated timestamps and omitted default-only columns are not fabricated or compared as source facts.

This proves database parity with the deterministic source-derived manifest. It is not independent manufacturer certification, stock verification, or full acceptance of a future runtime adapter. The context/sentinel mappings below must be included in shadow tests.

All 40 tables had zero rows before import. After import and a second idempotent apply, all expected rows match, with **0 missing, 0 extra and 0 changed exported records**.

## Table counts

| Table | Expected | DEV actual | Missing | Extra | Changed |
| --- | ---: | ---: | ---: | ---: | ---: |
| catalog_revisions | 1 | 1 | 0 | 0 | 0 |
| materials | 2 | 2 | 0 | 0 | 0 |
| series | 5 | 5 | 0 | 0 | 0 |
| grains | 4 | 4 | 0 | 0 | 0 |
| door_line_groups | 5 | 5 | 0 | 0 | 0 |
| door_lines | 8 | 8 | 0 | 0 | 0 |
| door_line_group_members | 8 | 8 | 0 | 0 | 0 |
| door_styles | 42 | 42 | 0 | 0 | 0 |
| door_variants | 127 | 127 | 0 | 0 | 0 |
| finishes | 47 | 47 | 0 | 0 | 0 |
| door_variant_finishes | 4688 | 4688 | 0 | 0 | 0 |
| frame_materials | 2 | 2 | 0 | 0 | 0 |
| frame_material_finishes | 53 | 53 | 0 | 0 | 0 |
| door_variant_frame_materials | 254 | 254 | 0 | 0 | 0 |
| glass_families | 6 | 6 | 0 | 0 | 0 |
| glass_designs | 217 | 217 | 0 | 0 | 0 |
| glass_options | 434 | 434 | 0 | 0 | 0 |
| door_variant_glass_options | 1490 | 1490 | 0 | 0 | 0 |
| sidelite_styles | 5 | 5 | 0 | 0 | 0 |
| sidelite_variants | 25 | 25 | 0 | 0 | 0 |
| door_variant_sidelites | 460 | 460 | 0 | 0 | 0 |
| sidelite_variant_glass_options | 551 | 551 | 0 | 0 | 0 |
| hardware_brands | 2 | 2 | 0 | 0 | 0 |
| hardware_styles | 15 | 15 | 0 | 0 | 0 |
| hardware_finishes | 5 | 5 | 0 | 0 | 0 |
| hardware_variants | 34 | 34 | 0 | 0 | 0 |
| grid_profiles | 4 | 4 | 0 | 0 | 0 |
| grid_patterns | 12 | 12 | 0 | 0 | 0 |
| grid_colors | 7 | 7 | 0 | 0 | 0 |
| grid_widths | 3 | 3 | 0 | 0 | 0 |
| glass_coatings | 7 | 7 | 0 | 0 | 0 |
| allowed_grid_combinations | 384 | 384 | 0 | 0 | 0 |
| assets | 945 | 945 | 0 | 0 | 0 |
| door_variant_assets | 874 | 874 | 0 | 0 | 0 |
| glass_option_assets | 1099 | 1099 | 0 | 0 | 0 |
| sidelite_variant_assets | 50 | 50 | 0 | 0 | 0 |
| hardware_variant_assets | 403 | 403 | 0 | 0 | 0 |
| finish_assets | 47 | 47 | 0 | 0 | 0 |
| grid_combination_assets | 386 | 386 | 0 | 0 | 0 |
| catalog_change_log | 1 | 1 | 0 | 0 | 0 |
| **Total** | **12712** | **12712** | **0** | **0** | **0** |

## Source versus normalized identity

| Source fact | Result |
| --- | --- |
| 8 internal lines, 5 customer groups, 42 shared styles, 127 variants | Preserved |
| 26 paint + 21 stain finishes | 47 exact finish records; colors/labels retained |
| 127 main glass source rows, 126 unique IDs | Identical Paris duplicate consolidated with both original positions |
| 88 customer-reachable main glass IDs | Preserved effective selectability; 38 historical/placeholder IDs retained separately |
| 92 sidelite glass source rows | 91 scoped identities; derived CR14SL Paris duplicate also consolidated |
| Main + sidelite scoped glass | 343 main-opening/placeholder options + 91 sidelite options = 434 |
| Repeated scoped labels | Separate IDs/design scopes; no global label deduplication |
| Linen | Historical/renderable; never customer-selectable |
| Timber / Clad | Two distinct retained internal types; Clad has six allowed paint memberships |
| 7 sidelite art-family aliases | Retained on 25 line/material-specific variants; art alias never inferred as physical material |
| Smooth Steel SSL | Retained, including shared Oak SSL asset |
| 34 hardware products / 97 authored asset rows | 34 products; authored views and resolved preview views become bindings |
| Empty grid width list / absent rule | Valid NULL-width combination / no row, respectively |
| Main Prairie without selected lite count | One non-selectable internal pattern sentinel; not a customer option |
| Existing asset paths | Preserved; no Storage upload or path rewrite |

## Differences requiring review, not silent fixes

1. **Paris ownership:** consolidated identical duplicate source records, not product redesign. Both main and CR14SL source positions remain recorded. Confirm canonical catalog ownership before future editing.
2. **Wineberry declaration:** `/assets/finishes/paint/wineberry.webp` does not exist locally. The declared path remains in DEV, with NULL dimensions/size/checksum and a missing-file note. Current paint UI uses the finish hex color, so no runtime image/color was substituted. This is a source asset gap, not an import mismatch.
3. **Grid schema representation:** Phase 2 has no location column and requires a non-null pattern FK. Location/artwork contexts are retained in JSON notes, and `__no_pattern_selection__` represents main Prairie's absent numeric selection. Shadow readers must honor these mappings. Public/admin UX must never expose the sentinel as an option.
4. **Historical/placeholder products:** current source visibility is mapped to `legacy_only`, not a claim of manufacturer discontinuation. Confirm those statuses and supplier availability with HGI. No stock quantities or manufacturing dimensions were invented.
5. **Scoped design grouping:** 217 design rows preserve source identities conservatively. They are not a deduplicated supplier design master; any later cross-scope consolidation requires HGI confirmation and must preserve all legacy mappings.

## Verification and readiness

- Live project/credential validation and 40-table empty preflight passed before inserts.
- Full-field DEV manifest parity passed.
- Idempotent apply repeated: **0 new rows**, same draft, no extra audit record.
- Local deterministic/safety tests and explicit tooling TypeScript check passed.
- Existing configuration-integrity and draft tests passed.
- Production build passed; existing chunk-size warning only.
- No runtime source, assets, Visualizer, PDFs, submissions, Production or Storage changed. No commit/push.

**Ready for DEV read-only shadow testing: YES**, provided it uses the documented scoped identities and grid-context/sentinel mapping. This does **not** authorize publishing the draft or changing the customer runtime. A future adapter must also pass visible-option, default/fallback, preview/PDF and submission parity checks before any rollout.
