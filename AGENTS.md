# Home Guard Door Builder — agent map

React + TypeScript + Vite door configurator. The live site is www.hgidoorbuilder.com. Vercel production deploys the `visualizer` branch, not `main`. `npm run build` is `tsc -b && vite build`.

This is not only a static site. `api/` is a set of Vercel functions. The browser never receives server secrets. Do not put those secrets in a `VITE_` variable, in source, or in a screenshot.

## Rules for every edit

- Change only the files the task needs. Do not clean up neighboring code.
- Do not open, search, or read `public/` or `public/assets/`. Image paths are already written in the data files. The photos stay in git because the site serves them.
- Do not reformat `src/App.tsx` or `src/styles.css`. Both are large, with very long lines. Touch the smallest span that does the job, and leave the rest of the line as it is.
- `.cursorignore` and `.codexignore` skip `public/assets`, `dist`, and `.codex-glass-update-report.json`. `.vercelignore` is a separate deploy filter. Do not delete images to simplify a task.
- Do not invent a dealer account system. Dealer Mode is one shared password, checked on the server.

## Where things live

| Task | File |
| --- | --- |
| Door styles and which material lines offer them | `src/data/productCatalog.ts` |
| Paint, stain, and the clad-color filter | `src/data/finishes.ts` |
| Glass name, thumbnail, and overlay file per door style | `src/data/glassOptions.ts` |
| Extra glass availability and family rules | `src/data/customerGlassAvailability.ts`, `src/data/glassFamilyCompatibility.ts` |
| Whether a decorative or privacy glass is actually offered | `src/data/decorativeGlass.ts`, `src/data/privacyGlass.ts` |
| Sidelite glass, one file per slab | `src/data/fslGlass.ts`, `f48slGlass.ts`, `sslGlass.ts`, `s2slGlass.ts`, `cr14slGlass.ts` |
| Baldwin hardware rows | `src/data/hardwareAssets.ts` |
| Schlage hardware rows and image names | `src/data/schlageHardware.ts` |
| Hardware finish colors and display name | `src/data/hardware.ts` |
| Style-card photo and live slab photo | `src/data/doorStyleThumbnailAssets.ts`, `src/data/doorPreviewAssets.ts` |
| Glass opening shape (mask) | `src/data/glassMaskAssets.ts`, `src/data/glassFrameMasks.ts` |
| Preview stacking and finish tint | `src/components/DoorPreview.tsx` |
| Frame, sidelites, threshold | `src/components/preview/DoorFrame.tsx` |
| Home page, step flow, grid rules, reset control | `src/App.tsx` |
| Dealer Mode button, password dialog, Exit | `src/components/DealerMode.tsx` |
| Dealer Mode session (password check and cookie) | `api/dealer-session.ts` |
| Dealer branding for a URL slug | `api/dealer-context.ts`, `src/utils/dealerSlug.ts` |
| Quote field labels | `src/components/QuoteForm.tsx` |
| PDF layout, disclaimer, phone, email, website | `src/utils/pdf.ts` |
| Browser quote POST | `src/utils/submission.ts` |
| Save the lead, then forward to Zapier | `api/submit-door-builder.ts` |
| Feedback POST | `api/submit-feedback.ts` |
| AI door visualization and entrance detection | `api/generate-door-visualization.ts`, `api/detect-entrance-structure.ts` |
| Browser tab title | `index.html` |

`src/data/options.ts` only re-exports the catalog. It is not the source of truth.

## Dealer Mode

A **Dealer Mode** button at the bottom of the page asks for one shared password. The browser posts that password to `/api/dealer-session`. The function compares it with `DEALER_MODE_PASSWORD` and sets an HttpOnly cookie named `__Host-hgi-dealer`. The password is not in the JavaScript bundle and must not be written to localStorage. A localStorage or URL flag does not unlock the mode.

On this branch the cookie is a browser-session cookie. The signed token lasts 24 hours and is not renewed by later page loads. Closing the browser often asks for the password again. **Exit Dealer Mode** clears the cookie. Details and the required secrets are in `docs/maintenance/dealer-mode-setup.md`.

`DEALER_MODE_SESSION_SECRET` is a separate 64-character hex secret. Optional `DEALER_MODE_ORIGIN` defaults to `https://www.hgidoorbuilder.com`. Plain `npm run dev` does not serve this function.

## Glass checklist

A glass option that is missing from any applicable row below will not show up.

1. `src/data/glassOptions.ts` — name, thumbnail path, and overlay filename for each door style that offers it. Live art is under `public/assets/hgi-assets/Glass/`. Thumbnails are under `public/assets/glass/thumbnails/`. Do not read the image bytes.
2. `src/data/decorativeGlass.ts` or `src/data/privacyGlass.ts` — add the approved name and id, or the filter hides the option.
3. `src/data/customerGlassAvailability.ts` and `src/data/glassFamilyCompatibility.ts` when the option is still missing after the lists above.
4. Sidelite slabs, only if that slab should offer it: `fslGlass.ts`, `f48slGlass.ts`, `sslGlass.ts`, `s2slGlass.ts`, or `cr14slGlass.ts`.
5. `src/App.tsx` ID lists, only for clear glass, mini blinds, CLiC, or a 3/4 lite (`F48` / `F482`). Do not reformat the file.

## Other common edits

- **Finish name or hex.** One line in `src/data/finishes.ts`. Swatch file, only if the photo changes: `public/assets/finishes/paint/{id}.png` or `stain/{id}.png`. ProMatch and TimberStain tooltip text is in `src/App.tsx`.
- **Hardware.** Baldwin: `hardwareAssets.ts`. Schlage: `schlageHardware.ts`. Finish chip colors: `hardware.ts`. Images live under `public/assets/hardware/`.
- **Wording.** Home headline and step titles: `src/App.tsx`. Quote labels: `src/components/QuoteForm.tsx`. Tab title: `index.html`. PDF footer and disclaimer: `src/utils/pdf.ts`. The reset control is the circle-arrow button in the preview toolbar (`preview-reset-design` in `src/App.tsx`).
- **New door style.** Add `CODE|Name` on the right material lists in `productCatalog.ts`. Card photo: `doorStyleThumbnailAssets.ts`. Live slab: `doorPreviewAssets.ts`. If it has glass, also add the code to `glassDoorCodes`, a mask in `glassMaskAssets.ts`, and overlay filenames in `glassOptions.ts`. A new door line also needs the sidelite conditions in `src/App.tsx`.

## Server environment variables

Set these in Vercel. Never prefix a secret with `VITE_`.

| Variable | Used for |
| --- | --- |
| `DEALER_MODE_PASSWORD` | The shared Dealer Mode password |
| `DEALER_MODE_SESSION_SECRET` | Signs the dealer cookie. 64 hex characters, not the password |
| `DEALER_MODE_ORIGIN` | Optional. Defaults to `https://www.hgidoorbuilder.com` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Dealer Portal project. Leads and dealer lookup |
| `ZAPIER_DOOR_BUILDER_WEBHOOK_URL` | Lead forward after Supabase saves |
| `ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL`, `ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL` | Dealer-specific lead webhooks |
| `ZAPIER_FEEDBACK_WEBHOOK_URL` | Feedback form |
| `OPENAI_API_KEY` | AI visualizer. Optional model override: `OPENAI_ENTRANCE_DETECTION_MODEL` |

`VITE_PUBLISHED_CATALOG_SHADOW` and `VITE_INVENTORY_SHADOW` are development switches. They do not change the customer catalog.

## Click-through before calling a builder change done

Use a preview deploy, not production.

1. One glass door (Full Lite is enough) through finish, glass, hardware, and review.
2. One door with no glass.
3. One Signature Series door that asks for a wood grain.
4. One door with sidelites, including sidelite glass when that slab has it.
5. Hardware preview, interior and exterior.
6. PDF download.
7. Quote submit against a preview, only when the task touched submission. Do not create a real lead just to check a color change.
8. Dealer Mode, only when the task touched it: wrong password is rejected, Exit Dealer Mode locks it again, and the password never appears in the repo.

`npm run lint` exists on this branch (`eslint .`). Do not treat a lint failure in an untouched file as part of the task.
