# AI Visualizer prototype implementation report

## 1. Files changed

- `api/generate-door-visualization.ts` — new server handler, replacing `api/generate-ai-visualization.ts`.
- `server/aiDoorVisualization.ts` — validated catalog resolution, original reference loading, image/mask preparation, prioritized prompt.
- `src/features/home-visualizer/aiVisualization.ts` — bounded AI photo preparation and request client.
- `src/features/home-visualizer/aiImagePreparation.ts` — AI-only image limits, normalized-coordinate conversion and padding constants.
- `src/features/home-visualizer/HomeVisualizer.tsx` — AI lifecycle/state isolation, loading guidance, retained results and stale-request handling.
- `src/styles.css` — AI loading styles and a readable mobile Generate button.
- `.env.example` — server-only key documentation; requested model is selected in code.
- `vercel.json` — bundles trusted static application assets for this function and allows a 180-second function duration.
- `package.json`, `package-lock.json` — Sharp, Node types and the UI test command.
- `scripts/verifyAiVisualizer.ts` — expanded mocked server/image/security checks.
- `scripts/verifyAiVisualizerUi.ts` — mocked browser tests.
- `scripts/aiVisualizerFixture.ts`, `scripts/aiVisualizerHarness.html`, `scripts/aiVisualizerHarness.tsx` — development-only test fixture; not part of the production Vite entry/build.
- `docs/ai-visualizer-prototype.md` — this report.

The working tree was clean at inspection. No uncommitted dealer-slug work was overwritten. This turn did not change App configuration construction, lead submission, Supabase, Zapier, Dealer Portal, routing or PDF code.

## 2. Existing visualizer inspection and reuse

`HomeVisualizer.tsx` owns photo upload/replacement/removal, HEIC normalization, the photo object URL, corners and wizard state. Uploads accept JPG/PNG/WebP/AVIF/HEIC/HEIF up to 15 MB; HEIC becomes JPEG at .94 quality. Non-HEIC Manual uploads are not downscaled by the new AI feature. `frameImageSize` records natural dimensions after image loading.

`EntranceSelector.tsx` handles existing four-corner editing, photo zoom and corner magnification. `EntranceCorners` stores topLeft/topRight/bottomRight/bottomLeft as normalized x/y coordinates between 0 and 1. CSS/display size and zoom do not change these stored values.

Manual uses `ConfiguredDoorSource.tsx` → `DoorPreview.tsx` → `captureDoorPreview.ts` and `renderCache.ts` for the configured entrance. `SideliteSelector.tsx` defines existing product placement; `FrameAreaEditor.tsx`/`frameRecolor.ts` retain photographed-frame behavior. `ComposedPhotoPreview.tsx` performs the existing perspective/composite result and exports it. These renderers and geometry utilities were not rewritten.

Full current `DoorConfiguration` is already passed by `App.tsx` into HomeVisualizer. Additional jamb/glass-frame finish IDs come from the same `configuredDoorPreview` snapshot; this does not change DoorConfiguration itself.

## 3. Manual / AI state

Manual remains the default. The existing accessible pressed-state buttons respond to native keyboard activation. Shared photo, corners and configuration are not reset by a toggle. The Manual wizard position and frame/sidelite/cleanup state remain intact; its source render stays cached. AI holds its own result and request lifecycle. Completing AI while viewing Manual stores the AI result without navigating away from Manual. Switching back shows it without generating again.

Changing photo, corners, configuration, or resetting selection invalidates an obsolete AI result and aborts the browser request where possible. A latest-request check prevents old responses from updating newer state. Toggle changes never call OpenAI. A synchronous pending guard plus the disabled Generate button blocks repeated clicks.

## 4. Four corners

AI sends the exact four shared normalized corners, not an automatically enlarged sidelite boundary. Pixel positions are computed as x × processedWidth and y × processedHeight, preserving mapping when the house image is proportionally resized. For AI, the user should outline the whole entrance intended for replacement, including configured sidelites. Toggling does not move those points. Moving shared points intentionally changes the selection for both modes.

## 5. Server endpoint and request format

Browser → `POST /api/generate-door-visualization` → server-side image preparation/original references → OpenAI → safe JPEG data URL.

Bounded JSON matches the existing Vercel handler architecture and avoids an additional multipart parser. Only the house photo is uploaded as image data; the browser does not upload arbitrary reference images. Configuration carries product IDs and finish IDs. Server ignores embedded browser asset paths, masks, reference data and external URLs. The OpenAI request itself uses multipart FormData.

Checks cover POST-only, request size (3 MiB), house size (2 MiB decoded), supported MIME plus actual decoded format, valid decodable nonanimated image, 24-megapixel decode protection, exactly four finite in-range convex corners, recognized style/finish/hardware/product variants, arrangement, swing, sidelite style/glass, and bounded configuration/grid values. Invalid input fails before a paid OpenAI request. Same-body simultaneous requests are coalesced within a warm function instance; this is not distributed idempotency/rate limiting.

## 6. Model and endpoint

The fixed requested model is `gpt-image-2.5-sunburst`; no automatic substitution. The server uses `https://api.openai.com/v1/images/edits`, not generations. `OPENAI_API_KEY` is read only on the server. There is no VITE key or browser OpenAI call.

Verified against [official model documentation](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) and the [official image editing guide](https://developers.openai.com/api/docs/guides/image-generation).

## 7. Exact input image order

1. Customer house photo (PNG) — first/base image.
2. Original base door design (neutral slab, never the captured finished entrance).
3. Selected glass design, if configured.
4. Selected exterior hardware reference.
5. Original sidelite slab, if configured.
6. Selected sidelite glass design, if an original image exists.

The matching PNG alpha mask applies to the first image. One sidelite design reference represents the configured one/two count; count and placement are explicit in the prompt. Grid details are supplied as configuration rather than a generated grid/composite raster.

## 8. Trusted references

Door style/finish IDs are resolved from `options.ts`/`productCatalog.ts`; original slab candidates use `resolveDoorPreviewCandidates` from `doorPreviewAssets.ts`, with material/grain/product-variant selection. Glass ID resolves from `glassOptions.ts` using the chosen style/variant overlay or its original design thumbnail. Hardware manufacturer/style/finish/handing resolve through `resolveHardwareOption`, then `hardwarePreviewAssetUrl`, with trusted original hardware fallback. Sidelite family/style resolve through `sideliteAssets.ts`; glass name resolves from the chosen FSL/F48SL/SSL/S2SL/CR14SL catalog.

References are read from bundled `public/assets` using only paths produced by these catalogs, then decoded/resized losslessly to PNG. No request-controlled URL is fetched and no request-controlled filesystem path is read. Missing required assets fail safely rather than using a captured composite. Trusted fallback candidates are tried for original door/hardware sources.

## 9. Configuration → prompt

The server produces a schemaVersion 1 snapshot of recognized product values, excluding asset URLs and arbitrary configuration keys. It includes arrangement, line/material/product, style/code, grain, exact finish name/type/hex, glass, coating/grid details, hardware manufacturer/style/finish/handing, swing, jamb type/finish/type/hex, glass-frame finish, sidelite count/placement/style/glass/grids and applicable double-door lock/outer-jamb hinge options.

The programmatic prompt explicitly prioritizes (1) house preservation, (2) exact product geometry/design, (3) customer finishes rather than reference colors, and (4) realistic lighting, perspective, reflections and contact shadows. Slab and sidelites are instructed to share the selected finish. No pre-rendered entrance is supplied or requested to be pasted.

## 10. Mask

The server creates a PNG RGBA mask with the same dimensions and format as the processed house PNG. Outside the editable region alpha is 255; the doorway polygon and small padded edge have alpha 0. Padding is controlled by `AI_MASK_PADDING_PX = 18`, scaled relative to a 1536px longest edge and implemented as a polygon stroke/round join. It is not a large surrounding rectangle. Tests sample inside/outside alpha and verify padding locality. The mask is guidance, not guaranteed clipping; house preservation is reinforced in the prompt.

## 11. Image sizing/compression

AI only: longest house edge is at most 1536px, no upscaling, aspect ratio preserved. Browser JPEG quality .90; if encoded bytes exceed 2 MiB, both dimensions reduce proportionally by .8 until within budget (up to four attempts). Server independently verifies/limits dimensions, converts the house to PNG, and creates its PNG mask. Original references fit within 1024 × 1024 without enlargement, preserving transparency in PNG. Manual rendering resolution is unchanged.

## 12. Output

One image (`n=1`), quality `high`, `size=auto`, JPEG compression 90. High emphasizes prototype fidelity without selecting Sunburst's higher xhigh/max tiers. `AI_QUALITY` is easy to change in the server helper. Auto sizing is not a promise of original-photo output resolution or exact output framing. The function rejects unexpectedly large/malformed base64 output to respect Vercel response limits. Upstream has a 140-second timeout within a 180-second function window.

## 13. Loading/errors

Explicit Generate starts a visible status/spinner and disables repeat clicks. Photo/corners/configuration stay intact. Errors use friendly retry text; Manual remains available if the key/model/billing/API is unavailable. Logs record validation category, upstream status/error category, asset resolution and network/preparation failures without house images, raw configuration, keys, filesystem paths or raw upstream error messages. No automatic retry consumes more credits.

## 14. Downloads / continuation

AI uses the existing Original / AI Result comparison slider and downloads its JPEG through the existing browser-link pattern. Manual export, Return to Previous Step, Return to Review and configuration PDF behavior are preserved. AI does not silently replace a stored lead visualizer URL, upload to storage, modify backend records or become PDF content. Persistent AI-result storage/link attribution/PDF inclusion would require a separate authorized integration.

## 15. Automated validation

- `npm run test:ai-visualizer`: 25 API/image-preparation/security checks, OpenAI fully mocked.
- `npm run test:ai-visualizer:ui`: Chrome browser tests at 1280px and 390px, network responses mocked; default Manual, keyboard toggle, preserved photo/corners/configuration, no toggle generation, retry/loading/disabled button, late completion while Manual, retained results, Manual final canvas and no horizontal overflow.
- `npm run test:submission`: existing dealer routing/ownership, validation, Supabase-first/idempotency and Zapier compatibility regression checks.
- Production Vite/TypeScript build; separate server TypeScript check; `git diff --check`.

No real OpenAI request is made by any test/build.

## 16. Before production

- Public endpoint needs abuse protection, rate limiting and spend limits before general launch; the app's master-password UI is not API authorization.
- Warm-instance coalescing cannot stop duplicates across separate Vercel instances. Aborting a browser request cannot guarantee cancellation/refund of an already-running model request.
- Confirm Vercel's duration and bundled function-size limits for the deployment plan. Assets are currently approximately 188 MiB; bundled original references plus Sharp require a deployment packaging check. No deployment was performed.
- Confirm account/model access, billing and image-edit output fidelity with the first authorized real test. AI may alter pixels outside the mask despite instructions; inspect house preservation.
- Review latency/cost, photo consent/privacy/retention, model output aspect/framing, error/timeout and large-output behavior.
- Package installation reported six dependency audit findings; no unrelated dependency upgrade was performed.

## 17. First real test after reviewed deployment

1. Review this working-tree diff; deploy this Door Builder version manually. Nothing has been committed, pushed or deployed by this task.
2. In the SAME Vercel project's server environment, confirm `OPENAI_API_KEY` is enabled for the target deployment, then redeploy if the environment changed. Do not put the key in any VITE variable.
3. Open the deployed Door Builder, configure an obvious finish (e.g. Black), glass/hardware and optionally sidelites. Complete the existing customer submission flow unchanged and open View on Your Home.
4. Upload one normal house photo. Select the four corners of the entrance replacement region; include configured sidelites when present. Optionally finish Manual first for comparison.
5. Select AI Beta. Confirm photo/corners remain and no network generation occurs until you click.
6. Click Generate AI Visualization ONCE. This is the first paid request. Wait for Original / AI Result; inspect door design/color, glass, hardware, jamb/sidelites, perspective and unchanged surrounding architecture.
7. Download Photo. Switch Manual → AI again and verify both remain available without a second request. If it fails, inspect Vercel logs by the safe ai-visualizer categories before choosing another explicit paid retry.

Plain `npm run dev` serves Vite UI but does not execute Vercel functions; real endpoint testing should use the reviewed deployed Vercel version (or a separately configured Vercel local function runtime).
