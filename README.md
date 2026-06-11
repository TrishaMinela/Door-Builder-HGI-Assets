# Home Guard Industries Door Builder

A lead-generation door configurator built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_QUOTE_WEBHOOK_URL` in a `.env` file to send submitted quote requests to a webhook. Without it, the app completes the local success flow without sending data.

## Replace placeholder visuals

Current door previews are layered CSS placeholders. Product data lives in `src/data/options.ts`, and the preview implementation lives in `src/components/DoorPreview.tsx`, keeping real product assets easy to add later.
