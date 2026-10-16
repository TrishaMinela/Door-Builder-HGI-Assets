# Published Door catalog API and read-only shadow

Verified October 17, 2026, against **HGI Portal Dev**
(`udbcnpjtwhmjzpjjhoph`). No database writes, publication, schema changes,
Storage changes, Portal edits or runtime inventory switch.

## Current result

- Current publication discovered by status:
  `1af5506c-c723-5d6d-a341-93815d0205e2`.
- Publication timestamp: `2026-10-16T14:47:45.118086+00:00`.
- Separate draft `af9dd06f-019e-4a31-b44c-248c862ba7d3` excluded.
- Published Door payload: **42 styles, 127 variants, 159 referenced assets,
  874 variant/asset bindings**.
- The revision has 919 total asset records. Only the 159 referenced by Door
  bindings are returned; Glass, Hardware and Sidelite inventory is not exposed.
- **1,383 logical choice/relationship comparisons, 1,383 matches, zero
  mismatches**. Every compared choice includes all of its normalized metadata;
  this is not a count of individual scalar assertions.
- **159/159 Storage objects resolved**, matched recorded SHA-256 and byte size,
  and matched the corresponding current local files byte-for-byte.

## API boundary

`GET /api/catalog` uses `server/publishedDoorCatalog.ts`. It queries exactly one
`status=published` revision, not a hardcoded UUID and not the newest draft. It
fails closed if publication is missing/ambiguous, any child belongs to another
revision, an FK/Storage mapping is invalid, or publication changes during the
read. It rechecks publication after reading the revision-scoped pages.

No revision override is accepted: query parameters return HTTP 400. Non-GET
methods return 405; missing opt-in returns 404; upstream/configuration failures
return sanitized 503 responses. All responses use `Cache-Control: no-store`.
The immutable revision ID is the catalog version; `publishedAt` identifies its
publication and `schemaVersion` versions the customer DTO separately.

The reader uses a fixed table/column allowlist, bounded pagination, bounded
parallelism, timeout and GET requests only. It cannot invoke importer/admin RPCs
or select audit/change-log tables. No notes, admin actors, provenance, source
commits or credentials are returned. `src/published-catalog/types.ts` defines the
explicit safe DTO. Inactive/hidden published product state is retained explicitly
for lifecycle/availability comparison, not made selectable.

The project currently has admin-only catalog table RLS, so this first API uses
the existing **server-only** service-role credential. The reader rejects any
origin except HGI Portal Dev before making requests; JWT credentials must match
that project/role and not be expired. No service key or server reader is imported
by browser code. The deployed API does not import product catalogs, public assets,
the exporter/importer, or the DEV comparison infrastructure.

## Opt-in and production isolation

Local setup, using existing server-only DEV values in `.env.local`:

```sh
VITE_PUBLISHED_CATALOG_SHADOW=true npm run dev
```

Vite loads the API and diagnostics middleware through `ssrLoadModule` only for
an explicitly enabled non-production dev server. Server environment values stay
on the server; they are not copied into `define` or a `VITE_` credential.

The DEV-only hook requests `/__dev/published-catalog-shadow/compare` on entering
the builder. The server reads/normalizes the same published DTO and compares it
to hardcoded data. Only reports reach that diagnostics hook. `/api/catalog`
also independently returns the normalized customer-safe catalog.

When disabled, no diagnostics hook or middleware is registered. Vite may serve
its ordinary static/module/SPA fallback for an unhandled GET; this is not a JSON
catalog service. In production builds the hook is aliased to a no-op even if the
DEV flag is accidentally set. It has no configuration setters or render state.

The standalone API additionally requires server-only
`PUBLISHED_CATALOG_READ_ENABLED=true`. **Leave it unset/false in Production.**
The local Vite opt-in supplies this privately. No Vercel environment settings
were changed. The customer builder never depends on the new endpoint.

## Semantics and availability

The comparison reuses Phase 4's `compareSnapshots`, stable metadata comparison
and `hardcodedSnapshot` for compatible material/grain lists and Door artwork.
The shared comparison accepts an optional publication ID for report attribution;
its existing default/pinned-draft behavior is unchanged.

Checks include:

- Style/variant legacy IDs, codes, names, descriptions, statuses, visibility and
  explicit display order.
- Materials, series, line groups, group membership and grains.
- Per-style material choices and Signature grain choices.
- All-style initial browsing separately from later material/grain filtering.
- Thumbnail, slab-render and mask bindings, with view, ordered fallback position,
  variant ownership and original local path.

Visibility and metadata drift injection tests produce mismatches as expected.
No compatibility/default-selection logic was moved to the database or changed.

## Storage

The bucket is private, not a public bucket. The DTO provides bucket/object path
and an `/object/authenticated/` URL with `access: authenticated`; it does not
invent public URLs or expose a service token. Storage verification used GET with
the server credential. No signed URL creation or Storage mutation was performed.

Source objects under older immutable revision scopes are allowed only after a
GET-only check that their source revision is published/retired, never draft.
The current 159 mappings resolve to the published baseline's object scope.

The local visible thumbnails, main preview, PDF and AI configured reference
capture remain unchanged. Browser checks made **zero Supabase Storage image
requests**. Before any hosted-image runtime switch, independently validate
browser-safe object delivery/RLS, including reuse of retired revision objects;
server-role verification alone does not prove anonymous Storage access.

## Verification

```sh
npm run test:published-door-catalog
npm run test:published-door-catalog:live
npm run build
npm run test:published-door-catalog:integration
npm run test:configuration-integrity
npm run test:door-builder-draft
git diff --check
```

Live unit/API checks passed: current publication discovery, a different future
publication without repinning, draft/cross-revision refusal, publication races,
missing/ambiguous publication, broken relationships, unpublished object scopes,
Storage traversal, method/query guards, sanitized failures, timeout and opt-out.

Browser checks passed at 1280px and 390px: live comparison, forced 503 outage,
unchanged saved selections, existing Next navigation, zero hosted product image
loads and no page exceptions. Production config bundling contains only
`vite.config.ts`; the API's emitted application graph contains only its endpoint
and reader. The production browser output was scanned against the actual secret
and the DEV route: neither was present.

An actual local `@vercel/node` build of `api/catalog.ts` emitted five files
(endpoint/reader JS + sourcemaps and package.json), **38,069 bytes**. It included
zero public assets, product catalog modules or DEV scripts. This is a local
packaging measurement, not a deployed Vercel resource-size claim.

Configuration integrity passed: 54,723 AI configurations, 375 unique reference
groups and 814 checked assets, with zero missing assets/broken dynamic paths.
Draft persistence, strict ES2022 server/test TypeScript, frontend TypeScript and
the production build passed. Existing large-chunk build warnings remain.

### Legacy test limitations (not silently bypassed)

- The old full inventory shadow command deliberately requires its original
  revision to be draft. That revision is now published, so it correctly stops at
  `Pinned draft provenance/status mismatch`. It was not repinned to the new
  draft and its protection was not weakened. The former 41,480 full-inventory
  comparisons are **not claimed as passing** in this Door-only phase.
- Existing option-order assertions expect a literal `doorSwingOptions.map(`
  that is absent in the committed baseline too.
- The old dependent-default UI test looks for visible `strong` card names, but
  the already-committed image-focused cards moved names to accessible labels.
  Its initial browsing checks pass before that stale selector times out.
  Neither issue is caused by the two added App hook lines; unrelated UI/test
  changes were not made to hide these failures.

## Recommended next step

Review this Door-only payload and zero-drift report with HGI. Then validate a
browser-safe published Storage delivery path and a separately flagged **staging
Door-only adapter** with coherent revision pinning and rollback. Do not enable
runtime authority or migrate Glass/Hardware/Sidelites as part of this checkpoint.
Pending font changes are explicitly excluded from the task commit.
