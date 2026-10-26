# Submission confirmation and latency assessment — 2026-10-27

## Scope

Only the completed quote/PDF confirmation layout changes at runtime. Submission,
PDF content, customer records, Zapier, and the pending Sheets integration are unchanged.
External services were mocked for all new submissions; no live leads were created.

## Timing evidence

Existing production request `str4g-1793037512279-f081e69be968` returned HTTP 200
at 2026-10-26 17:58:32.279 UTC (October 27, 01:58:32 Philippine time), on
deployment `dpl_2yc2WyF87rR38RuM59bZFMQqJhtU`, commit `a5140c6`.
Vercel reported response finished in 2.6 seconds, function execution 1.97 seconds,
and cold start 214 milliseconds. Peak concurrency was one and memory 213/2048 MB.
It recorded a Supabase lead POST followed by a Zapier POST. Individual outbound
latency insights were unavailable on the current plan. These timings do not
establish which downstream service dominates, nor measure the customer's browser.

Source sequence: prepare/cache configured door image before opening the form;
on submit, validate and construct payload, await submission API (dealer lookup
if applicable, Supabase persistence, then Zapier delivery), generate/download PDF,
then display confirmation. PDF modules, font and template images may be loaded
after the API response. No additional customer API is required after submission.

Clean local Chrome 156 mocked tests measured validation/payload at 0–2 ms,
the deliberately 500 ms mocked API at approximately 508–521 ms, actual local
PDF preparation/download at approximately 0.56–0.67 seconds, and confirmation
transition at 6–7 ms. These are local fixture measurements, not production
network performance or evidence of an implemented speed improvement.

## Layout correction

Use a dedicated, scoped confirmation component. Center all content and actions,
restore normal section typography, remove the delayed primary-button animation,
use compact spacing and a single secondary return action, and reset stale form
scroll position with focus on the confirmation heading. Remove the inherited
mobile builder-preview spacer while reserving space for the fixed header.

## Deferred delivery risks and required design

The legacy endpoint awaits Zapier and returns a generic 502 if it fails after
Supabase has saved the lead. The UI then blocks the PDF. Retrying the same server
submission ID preserves its lead row but forwards Zapier again. The browser's
fingerprint includes a fresh timestamp, so a form retry can receive a new ID.
These existing behaviors were reproduced with mocks and are not fixed here.

Decoupling delivery safely requires an approved durable outbox committed with
the lead, stable logical submission IDs, worker leases/status/retries, and review
of Zapier's downstream deduplication for ambiguous acknowledgements. A background
promise alone cannot guarantee delivery. This needs separately reviewed delivery
and database work; the unfinished Google Sheets integration is not activated.

## Verification

The new browser harness verifies success, Supabase and Zapier failures, preserved
form fields, blocked PDFs before API success, duplicate-click prevention, actual
downloaded PDF bytes, centered responsive geometry, unobscured success content,
and return/continue actions at 1440, 820, 390 and 320 px. The native endpoint test
adds a mocked Zapier timeout. Existing configuration integrity, all 86 PDF cases,
homepage, configuration-edit, mocked Visualizer API/UI and workflow regressions
were run against an isolated committed snapshot plus only these changes.

Known pre-existing generic submission-test failure: Savannah lock label expectation
(`Locks on Both` versus `Lock on Main Door Only`). No product rule was changed to
make that test pass. No real production submission or paid AI generation was tested.
