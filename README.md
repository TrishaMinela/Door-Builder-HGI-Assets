# Home Guard Industries Door Builder

A lead-generation door configurator built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Set the server-only Vercel environment variable `ZAPIER_DOOR_BUILDER_WEBHOOK_URL` to the Zapier Catch Hook URL. Customer submissions are posted by the browser to `/api/submit-door-builder`; the Vercel function forwards the normalized flat payload to Zapier. Do not expose this value through a `VITE_` environment variable.

## Replace placeholder visuals

Current door previews are layered CSS placeholders. Product data lives in `src/data/options.ts`, and the preview implementation lives in `src/components/DoorPreview.tsx`, keeping real product assets easy to add later.
