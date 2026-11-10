# Home Guard Industries Door Builder

Lead-generation door configurator for [hgidoorbuilder.com](https://hgidoorbuilder.com). A shopper designs an entry door in the browser, downloads a configuration PDF, and requests a quote. The app does not calculate a price. The PDF says final pricing comes after the request.

Built with React, TypeScript, and Vite. This repository is a static site. There is no server here. Vercel builds the `main` branch with `npm run build`.

Coding agents should follow [AGENTS.md](AGENTS.md). Product photos stay in `public/assets/` and are served as-is. Do not scan that folder for a text or catalog edit.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Quote requests

Copy `.env.example` to `.env` and set `VITE_QUOTE_WEBHOOK_URL` to POST the configuration and a base64 PDF as JSON. With the variable empty, the form still shows success and sends nothing.

## Where the catalog lives

| Change | File |
| --- | --- |
| Door styles and which material lines offer them | `src/data/productCatalog.ts` |
| Paint, stain, and clad colors | `src/data/finishes.ts` |
| Glass names, thumbnails, and per-style overlay art | `src/data/glassOptions.ts` |
| Which decorative or privacy glasses are offered | `src/data/decorativeGlass.ts`, `src/data/privacyGlass.ts` |
| Sidelite glass | `src/data/fslGlass.ts` and the matching `f48sl`, `ssl`, `s2sl`, and `cr14sl` files |
| Baldwin hardware | `src/data/hardwareAssets.ts` |
| Schlage hardware | `src/data/schlageHardware.ts` |
| Style-card photos and live slab photos | `src/data/doorStyleThumbnailAssets.ts`, `src/data/doorPreviewAssets.ts` |

`src/data/options.ts` re-exports those lists. It is not where edits start.

The on-screen door is layered images: a slab photo, a glass overlay, a finish tint, and hardware, inside a drawn frame. That preview is `src/components/DoorPreview.tsx` and `src/components/preview/DoorFrame.tsx`. Home page copy, the step flow, and the grid rules are in `src/App.tsx`. PDF text, phone, email, and website are in `src/utils/pdf.ts`.
