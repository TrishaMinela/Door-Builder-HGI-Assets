# Home Guard Industries Door Builder

A lead-generation door configurator built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Customer submissions are posted by the browser to `/api/submit-door-builder`. The Vercel function first stores the complete configuration in the existing Dealer Portal Supabase project, then forwards the existing normalized flat payload to Zapier. A submission is complete only after both destinations succeed.

Configure these server-only Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZAPIER_DOOR_BUILDER_WEBHOOK_URL`

Never expose the Supabase service-role key or either server integration through a `VITE_` environment variable.

## Replace placeholder visuals

Current door previews are layered CSS placeholders. Product data lives in `src/data/options.ts`, and the preview implementation lives in `src/components/DoorPreview.tsx`, keeping real product assets easy to add later.
