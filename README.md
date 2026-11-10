# Home Guard Industries Door Builder

Lead-generation door configurator for [hgidoorbuilder.com](https://www.hgidoorbuilder.com). A shopper designs an entry door in the browser, downloads a configuration PDF, and requests a quote. The app does not calculate a price. The PDF says final pricing comes after the request.

Built with React, TypeScript, and Vite. Vercel project `door-builder-visualizer` deploys production from the `visualizer` branch. `main` is not the live site. Server routes live in `api/` and run as Vercel functions. `npm run build` is the production build.

Coding agents should follow [AGENTS.md](AGENTS.md). Product photos stay in `public/assets/` and are served as-is. Do not scan that folder for a text or catalog edit.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` serves the browser app only. The `api/` functions run on Vercel, not in that local Vite server.

## Quote requests

The browser posts the configuration to `/api/submit-door-builder`. That function stores the lead in the Dealer Portal Supabase project, then forwards it to Zapier. The request is complete only after both succeed.

Server-only Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZAPIER_DOOR_BUILDER_WEBHOOK_URL`
- `ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL` and `ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL` for dealer-specific leads
- `ZAPIER_FEEDBACK_WEBHOOK_URL` for `/api/submit-feedback`
- `OPENAI_API_KEY` for the AI visualizer

Never expose the Supabase service-role key, the OpenAI key, or a webhook URL through a `VITE_` variable. See `.env.example`.

## Dealer Mode

**Dealer Mode**, at the bottom of the page, is one shared password, not a dealer account. The browser sends the password to `/api/dealer-session`. The server checks `DEALER_MODE_PASSWORD` and sets an HttpOnly cookie. The password is not in the frontend code. **Exit Dealer Mode** clears the cookie. The signing secret is `DEALER_MODE_SESSION_SECRET`. Setup notes are in `docs/maintenance/dealer-mode-setup.md`.

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
