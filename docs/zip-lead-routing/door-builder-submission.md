# Door Builder lead submission (current path)

Investigated on the `visualizer` branch of `TrishaMinela/Door-Builder-HGI-Assets` at `a649f162b6afe2945c71a3083ab085a1e701c70e`, then checked again while implementing ZIP normalization. This describes the live customer submission path. It does not describe Dealer Mode, the feedback form, or the AI visualizer.

No webhook URL, Supabase key, or other secret is recorded here. Only environment variable names are listed.

## Where a homeowner submits

The same React app serves the main HGI site and dealer pages.

| Page | Browser path | `dealerSlug` sent with the lead |
| --- | --- | --- |
| Main HGI Door Builder | `/` | omitted (`null`) |
| Dealer page | `/{slug}` when the single path segment is a valid dealer slug | that slug, for example `uhr` |

`src/utils/dealerSlug.ts` reads one path segment. Reserved names (`api`, `assets`, `visualizer`, and the rest of `RESERVED_DEALER_SLUGS`) are not dealer pages. `src/components/DealerContextGate.tsx` loads public branding from `GET /api/dealer-context?slug=...` and passes the slug into the builder. The browser does not choose a dealer id.

There is no street address, city, or state field. The contact form is `src/components/QuoteForm.tsx`.

| Form state | Label | Sent as |
| --- | --- | --- |
| `fullName` | Full name | `full_name`, and split into `first_name` / `last_name` |
| `email` | Email | `email` |
| `phone` | Phone | `phone` |
| `zip` | ZIP code | `postal_code` on the request, `leads.zip` in the Portal |
| `notes` | Notes | `notes` on the request, `leads.comments` in the Portal |

The consent checkbox on the contact screen is not read and is not part of the payload.

The homeowner reaches the form from Review, after a door is configured. Download PDF and Launch Door Visualizer both open this form first. The PDF is built in the browser after the API accepts the lead. It is not uploaded.

## Client validation

`submit` in `src/App.tsx` requires full name, email, phone, and ZIP.

- Email must match a single `@` and a dot in the domain.
- Phone must match `^[+]?[\d\s().-]{7,20}$`.
- ZIP must be a 5-digit US ZIP or ZIP+4 (`12345` or `12345-6789`) after trimming. Leading zeros are kept because the value stays a string.

Main HGI (`dealerSlug` is null) normalizes ZIP+4 to the first five digits before the request is built. A dealer page keeps the trimmed value, including ZIP+4. `src/utils/usZip.ts` is the shared rule. `buildDoorBuilderSubmissionPayload` still only trims `contact.zip`; the caller decides whether that string is already normalized.

## Request

`src/utils/submission.ts` `submitQuote` sends:

`POST /api/submit-door-builder`

`Content-Type: application/json`

There is no `VITE_QUOTE_WEBHOOK_URL` in this repository. The browser never receives a Zapier or Supabase URL.

### Flat fields (Zapier allowlist)

`buildDoorBuilderSubmissionPayload` produces these strings:

`submitted_at`, `first_name`, `last_name`, `full_name`, `email`, `phone`, `postal_code`, `notes`, `door_configuration`, `door_line`, `door_style`, `sidelite_placement`, `sidelite_slab`, `sidelite_glass`, `main_door_glass`, `door_finish_type`, `door_finish_color`, `jamb_type`, `jamb_finish_type`, `jamb_finish_color`, `hardware`, `lock_setup`, `door_swing`, `hinge_option`.

`submitted_at` is an ISO timestamp generated at submit time. The first whitespace-separated word of the name is `first_name`; the rest is `last_name`. Door fields are display labels, not catalog ids. Empty optional configuration values become `Not applicable`.

### Fields the browser adds and Zapier does not receive

| Field | Meaning |
| --- | --- |
| `submissionId` | `crypto.randomUUID()`. Reused only when the flattened payload and configuration snapshot stringify to the same fingerprint. A new timestamp changes the fingerprint, so a second click usually creates a new id. |
| `doorConfiguration` | `{ schemaVersion: 1, configuration: DoorConfiguration }` |
| `dealerSlug` | `null` on the main site, otherwise the path slug |

`DoorConfiguration` is the in-memory selection: door type, product, line, style, grain, finish, jamb, glass, grids, hardware, swing, sidelites, and sidelite glass. It is a JSON object, not a second copy of the flat labels.

## Server endpoint

`api/submit-door-builder.ts` is the only lead endpoint. `api/submit-feedback.ts` is a separate Zapier post and is not a homeowner lead.

Order of work:

1. Require `POST`. Parse a JSON object.
2. Copy the allowlisted strings and trim them. Unknown keys are dropped. The allowlist also includes `lead_source`, `dealer_name`, and `dealer_slug`, which the browser does not send.
3. Require `full_name`, `email`, `phone`, and `postal_code`.
4. Require `submissionId` to be a UUID.
5. Require `doorConfiguration` to be an object of at most 128 KiB.
6. Require a real customer finish inside the snapshot. Reject hidden decorative glass.
7. Resolve `dealerSlug` with `server/dealerResolution.ts`. No slug means main HGI and does not query dealers. A slug must be syntactically valid and must match exactly one active `dealers` row. Missing is HTTP 404. Inactive is HTTP 403. Lookup failure is HTTP 502. Nothing is written in those cases.
8. Set attribution on the allowlisted payload. The browser cannot set `dealer_id`. A `dealer_id` in the body is ignored.
9. Main HGI only: require the trimmed `postal_code` to be a 5-digit ZIP or ZIP+4, then store and forward the 5-digit form. An invalid main-HGI ZIP returns HTTP 400 and does not call Supabase or Zapier. Dealer-slug `postal_code` is left as the trimmed string.
10. Resolve Zapier URLs. A bad or missing URL returns HTTP 502 and does not write the lead.
11. Insert the Portal lead. On failure, Zapier is skipped and the response is HTTP 502.
12. POST the allowlisted payload to Zapier. On failure, the lead row is already saved and the response is HTTP 502. A retry with the same `submissionId` does not duplicate the row (`resolution=ignore-duplicates`) and does forward to Zapier again.

Success is `{ ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } }`.

### Lead-source marker

| Lead | `lead_source` | `dealer_name` | `dealer_slug` | `leads.dealer_id` |
| --- | --- | --- | --- | --- |
| Main HGI | `HGI` | `Home Guard Industries` | empty string | `null` |
| `/americas-best-windows-and-doors` | `AB` | dealer `company_name` | that slug | that dealer's id |
| `/wdm` | `WDM` | dealer `company_name` | `wdm` | that dealer's id |
| Any other active slug, including `/uhr` | `{slug}-door-builder-lead` | dealer `company_name` | that slug | that dealer's id |

`lead_source`, `dealer_name`, and `dealer_slug` are on the Zapier body. They are not columns on `public.leads`. The Portal row distinguishes main HGI from a dealer page with `dealer_id` (`null` versus the resolved dealer) and `source` (`door_builder` for every Door Builder lead). The slug for a dealer lead is `dealers.slug` for that `dealer_id`.

## Where the lead is stored

The function inserts with the Supabase service role. It does not call `submit_public_lead`.

`POST {SUPABASE_URL}/rest/v1/leads?on_conflict=submission_id`

Headers: `apikey`, `Authorization: Bearer` (both the service-role key), `Content-Type: application/json`, `Prefer: resolution=ignore-duplicates,return=minimal`.

Columns written, and only these:

| Column | Value |
| --- | --- |
| `submission_id` | request UUID |
| `dealer_id` | `null` for main HGI, otherwise the resolved dealer id |
| `first_name`, `last_name` | split again from `full_name` |
| `email` | trimmed email |
| `phone` | trimmed phone, or `null` when empty |
| `zip` | routed `postal_code` (5 digits for main HGI; trimmed original for a dealer slug) |
| `comments` | notes, or `null` when empty |
| `status` | `new` |
| `source` | `door_builder` |
| `door_configuration` | the `{ schemaVersion: 1, configuration }` snapshot |

`address`, `city`, `state`, UTM columns, and `visualizer_url` are not written. This repository does not add columns and does not run SQL.

Dealer lookup, only when a slug is present:

`GET {SUPABASE_URL}/rest/v1/dealers?select=...&slug=eq.{slug}&limit=2`

The select list is the branding columns in `server/dealerResolution.ts`.

Portal schema these writes depend on (from `Home-Guard-Dealer-Portal` `main`, not modified here):

- `supabase/migrations/20260829000000_create_leads.sql` creates `public.leads`, including `zip text`.
- `20260909000000_add_secure_dealer_aware_lead_ingestion.sql` allows `dealer_id` to be null so a main-HGI lead can be stored.
- `20260911000000_add_door_builder_submission_fields.sql` adds `submission_id uuid` (unique) and `door_configuration jsonb`.

## Zapier

Environment variable names:

| Name | When it is called |
| --- | --- |
| `ZAPIER_DOOR_BUILDER_WEBHOOK_URL` | Every accepted lead, including dealer pages |
| `ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL` | Also, when `dealer_slug` is `americas-best-windows-and-doors` |
| `ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL` | Also, when `dealer_slug` is `wdm` |
| `ZAPIER_FEEDBACK_WEBHOOK_URL` | Feedback only. Not this lead. |

Each value must be `https` and the host must be `hooks.zapier.com`. The two URLs in a dealer pair must be different. The POST body is the allowlisted object only. `submissionId`, `doorConfiguration`, and `dealerSlug` are not in it.

`/uhr` and every other dealer slug use the master webhook only, with that slug's `lead_source`. They do not use the America's Best or WDM hooks.

For a main-HGI lead whose ZIP was already five digits, the Zapier JSON is unchanged by ZIP normalization. ZIP+4 on main HGI changes only `postal_code`, from `12345-6789` to `12345`. Dealer-slug bodies, including ZIP+4, are not rewritten.

## Personify and Opta

This repository does not call Personify or Opta. Searches of the Door Builder source and of `Home-Guard-Dealer-Portal` `main` found no Personify lead request. A Zapier zap could forward somewhere else after it receives the webhook; that step is outside both repositories.

America's Best Opta lives in the Portal (`api/_lib/optaLeadDelivery.ts`, `api/_lib/optaDeliveryControl.ts`). `OPTA_AUTOMATIC_DELIVERY_ENABLED` is `false`. Door Builder submission does not import or call that code, and this change does not. Automatic Opta delivery stays off.

## Notifications

Submission does not send email, SMS, or a dealer notification. The only outbound calls are the optional dealer lookup, the `leads` insert, and the Zapier POST(s) above. No database trigger in the Portal migrations searched for this note sends a notification from `public.leads`. A dealer is not notified at submission time.

## Door configuration serialization

Two representations travel together:

1. Flat labels on the Zapier body, produced by `buildDoorBuilderSubmissionPayload`.
2. The versioned snapshot on `leads.door_configuration`: `{ "schemaVersion": 1, "configuration": { ...DoorConfiguration } }`.

The snapshot is what the Portal stores for the configured door. ZIP routing can read `leads.zip` without parsing that object. The snapshot is not part of the Zapier body.

## Contract alignment

Checked `TrishaMinela/Home-Guard-Dealer-Portal` branches, including `main`, on 2026-11-17. No branch named `cursor/zip-lead-routing*` existed, and `docs/zip-lead-routing/contract.md` was not on `main`. This note will be updated if that contract names different existing columns.

Until then, the Portal can route main-HGI leads with columns that already exist:

| Need | Field already on the lead row |
| --- | --- |
| Normalized ZIP | `leads.zip`, 5-digit string for main HGI, leading zeros preserved |
| Main HGI versus a dealer page | `leads.dealer_id` is null for main HGI. A dealer page stores that dealer's id. `leads.source` is `door_builder` either way. |
| Dealer slug string | Not a `leads` column. It is `dealers.slug` for `dealer_id`, and `dealer_slug` / `lead_source` on the Zapier body. |
| Door configuration | `leads.door_configuration` |

No new insert column was added. A column that is not on `public.leads` would make PostgREST reject the insert and break every submission. This change does not apply a migration to `udbcnpjtwhmjzpjjhoph`.

## What this change does

- Main HGI: validate US ZIP or ZIP+4, normalize to five digits, keep leading zeros, and write that value to `postal_code` and `leads.zip`.
- Dealer slugs: same client format check, but the submitted and stored ZIP string is still the trimmed customer value. Webhooks, `lead_source`, and the Supabase column set are unchanged.
- No notification call was added.
