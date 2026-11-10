# Dealer Mode — stateless authentication and deployment gate

Authenticated convenience access is not a security boundary around browser PDF
code or client navigation. Customer mode is the default. A server-validated dealer
session bypasses the form through normal application navigation. Submission,
consent, PDF, AI and Dealer Portal flows are unchanged.
No Redis, database, new dependency, or outbound authentication service is required.

## Required server-only configuration

In Vercel, select **door-builder-visualizer → Settings → Environment Variables**.
Configure Production only; use separate credentials for Preview. Never use a
`VITE_` prefix or paste credentials into chat.

| Variable | Value to enter securely |
| --- | --- |
| `DEALER_MODE_PASSWORD` | The initial password requested by the owner; mark sensitive |
| `DEALER_MODE_SESSION_SECRET` | Independently generated 32 random bytes encoded as exactly 64 hexadecimal characters; mark sensitive |

Use a trusted secret generator. Do not reuse the dealer password, API key or another
credential. Missing or incorrectly formatted secrets fail closed. Length checking
cannot establish entropy: generate the secret randomly, not manually.

Optional `DEALER_MODE_ORIGIN` overrides the canonical default
`https://www.hgidoorbuilder.com`. Use an exact approved HTTPS origin without a
trailing slash. Other hostnames must redirect to the canonical origin; they cannot
authenticate directly. Preview requires separate credentials and an explicit origin.
Plain Vite does not serve this Vercel endpoint; local UI tests mock it.

## Session behavior and limits

- HMAC-SHA256 signed token containing version, expiry and random nonce; no password
  or customer data. Signature/password comparisons are constant-time.
- `__Host-hgi-dealer`: Secure, HttpOnly, SameSite=Strict, Path=/; browser-session
  cookie with no persistent Max-Age or Expires on login. Server validity lasts
  24 hours from authentication, with no short inactivity timeout. GET checks do not
  renew that maximum. Responses are no-store. After 24 hours, sign in again.
- Refresh preserves authenticated access. Some browsers restore session cookies
  after closing/reopening; browser closure is not a guarantee of logout. Use Exit
  Dealer Mode on shared machines.
- Signatures bind to the password, signing secret and allowed origin. Rotating
  either credential invalidates earlier sessions once deployment receives the new
  environment configuration.
- POST/DELETE require the permitted Origin. GET cannot create a session.
- Every bypass navigation/PDF action revalidates the server session. Focus and
  visibility changes recheck it; local expiry disables access. URL/storage flags
  cannot enable the normal application bypass.
- Exit expires the browser cookie and immediately disables local access. Failed
  sign-out offers a retry and cannot silently re-enable local access on focus.
- **Stateless limitation:** a copied token remains valid after browser logout until
  expiry or credential rotation. Individual-session revocation is not claimed.
- Missing configuration leaves normal customer submission available.

## Password guessing protection

Bounded in-memory counters allow five attempts per trusted Vercel IP per 15 minutes.
These are defense in depth, **not distributed enforcement**: cold starts and other
instances have independent counters. Shared office IPs share an instance's limit.
The map is bounded and rejects new attempts when full.

Before rollout, inspect available Vercel Firewall rate-limit options for a project
rule covering POST `/api/dealer-session`. This is the no-database route to
cross-instance enforcement. Do not upgrade plans or claim distributed protection
without verifying the rule. No firewall settings were changed.
Trusted IP behavior: [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).

## Verification and rollout

Authentication tests use random test-only secrets and assert zero external calls.
Coverage: wrong passwords, forged/tampered signatures, CSRF, cookie attributes,
expiry, persistence beyond 30 minutes, credential rotation, logout, copied-token limitation, local limits and
missing/weak secrets. Existing mocked customer/dealer UI tests cover responsive
modal/focus, form gates, refresh, PDF downloads, Visualizer entry, logout, sign-out
failure and expiry without creating leads or making paid AI calls.

Do not commit/push/deploy until secrets are securely configured and checks pass.
After deployment, perform non-billable login/logout and customer-gate smoke checks;
do not upload a photo or start generation. Never include real credentials in Git,
screenshots, logs, tests or browser bundles.
