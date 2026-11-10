# Home Guard Door Builder — agent map

Static Vite + React + TypeScript configurator for hgidoorbuilder.com. There is no server in this repo. Vercel deploys `main` with `npm run build`. A quote is a browser PDF plus an optional POST to `VITE_QUOTE_WEBHOOK_URL`. There is no price list.

## Rules for every edit

- Change only the files the task needs. Do not clean up neighboring code.
- Do not open, search, or read `public/` or `public/assets/`. Image paths are already written in the data files. The photos stay in git because the site serves them.
- Do not reformat `src/App.tsx` or `src/styles.css`. Both are large, with very long lines. Touch the smallest span that does the job, and leave the rest of the line as it is.
- `.cursorignore` and `.codexignore` skip `public/assets`, `dist`, and `.codex-glass-update-report.json`. Do not delete those images to “simplify” a task.

## Where things live

| Task | File |
| --- | --- |
| Door styles and which material lines offer them | `src/data/productCatalog.ts` |
| Paint, stain, and the clad-color filter | `src/data/finishes.ts` |
| Glass name, thumbnail, and overlay file per door style | `src/data/glassOptions.ts` |
| Whether a decorative or privacy glass is actually offered | `src/data/decorativeGlass.ts`, `src/data/privacyGlass.ts` |
| Sidelite glass, one file per slab | `src/data/fslGlass.ts`, `f48slGlass.ts`, `sslGlass.ts`, `s2slGlass.ts`, `cr14slGlass.ts` |
| Baldwin hardware rows | `src/data/hardwareAssets.ts` |
| Schlage hardware rows and image names | `src/data/schlageHardware.ts` |
| Hardware finish colors and display name | `src/data/hardware.ts` |
| Style-card photo | `src/data/doorStyleThumbnailAssets.ts` |
| Live slab photo | `src/data/doorPreviewAssets.ts` |
| Glass opening shape (mask) | `src/data/glassMaskAssets.ts` |
| Preview stacking and finish tint | `src/components/DoorPreview.tsx` |
| Frame, sidelites, threshold | `src/components/preview/DoorFrame.tsx` |
| Home page, step flow, grid rules, glass ID lists | `src/App.tsx` |
| Quote field labels | `src/components/QuoteForm.tsx` |
| PDF layout, disclaimer, phone, email, website | `src/utils/pdf.ts` |
| Quote POST | `src/utils/submission.ts` |
| Browser tab title | `index.html` |

`src/data/options.ts` only re-exports the catalog. It is not the source of truth.

## Glass checklist

A glass option that is missing from any applicable row below will not show up.

1. `src/data/glassOptions.ts` — name, thumbnail path, and overlay filename for each door style that offers it. Live art is under `public/assets/hgi-assets/Glass/`. Thumbnails are under `public/assets/glass/thumbnails/`. Do not read the image bytes.
2. `src/data/decorativeGlass.ts` or `src/data/privacyGlass.ts` — add the approved name and id, or the filter hides the option.
3. Sidelite slabs, only if that slab should offer it: `fslGlass.ts`, `f48slGlass.ts`, `sslGlass.ts`, `s2slGlass.ts`, or `cr14slGlass.ts`.
4. `src/App.tsx` ID lists, only for clear glass, mini blinds, CLiC, or a 3/4 lite (`F48` / `F482`): `clearGlassIds`, `f48GlassOptionIds`, and the `legacy*` sets. Do not reformat the file.

## Other common edits

- **Finish name or hex.** One line in `src/data/finishes.ts`. Swatch file, only if the photo changes: `public/assets/finishes/paint/{id}.png` or `stain/{id}.png`. Clad jamb colors are the six-id filter at the bottom of `finishes.ts`. ProMatch and TimberStain tooltip text is near the top of `src/App.tsx`.
- **Hardware.** Baldwin: `hardwareAssets.ts`. Schlage: `schlageHardware.ts`. Finish chip colors: `hardware.ts`. Images live under `public/assets/hardware/`. The label is built from manufacturer, style, and finish.
- **Wording.** Home headline and step titles: `src/App.tsx`. Quote labels: `src/components/QuoteForm.tsx`. Tab title: `index.html`. PDF footer and disclaimer: `src/utils/pdf.ts`.
- **New door style.** Add `CODE|Name` on the right material lists in `productCatalog.ts`. Card photo: `doorStyleThumbnailAssets.ts`. Live slab: `doorPreviewAssets.ts`. If it has glass, also add the code to `glassDoorCodes`, a mask in `glassMaskAssets.ts`, and overlay filenames in `glassOptions.ts`. A new style on an existing door line inherits that line’s sidelite rules. A new door line also needs the sidelite conditions in `src/App.tsx`.

## Click-through before calling a builder change done

Use a preview deploy, not `main`.

1. One glass door (Full Lite is enough) through finish, glass, hardware, and review.
2. One door with no glass.
3. One Signature Series door that asks for a wood grain.
4. One door with sidelites, including sidelite glass when that slab has it.
5. Hardware preview, interior and exterior.
6. PDF download.
7. Quote submit with `VITE_QUOTE_WEBHOOK_URL` empty: the form completes and sends nothing.

`npm run build` is `tsc -b && vite build`. `npm run lint` fails because ESLint is not installed. That failure is expected and is not part of the Vercel build.
