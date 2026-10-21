# Approved homepage AI showcase

The homepage uses the 22 approved WebP doorway overlays, in gallery order
1–22, from `public/assets/hero/ai-doors`. `homepageAiDoors.ts` is the explicit
ordered manifest and includes SHA-256 checksums of the approved files.
All documented minor fidelity differences were accepted by the user.

The original `hero-entryway.webp` is unchanged (SHA-256
`14ad782598be1ae0970ec23bc41538b5f01f7cc9ffd80b70e250dec216cea403`).
The existing percentage anchor, stage crop and responsive layout are unchanged.
Overlays are native 224 × 508 pixels and total 182,730 bytes. No regeneration,
resizing or recompression was performed during integration.

`HomepageDoorShowcase` owns the 5,000 ms interval and 700 ms incoming fade.
The opaque previous image remains underneath until the fade completes. The
first image has a high-priority preload; only one upcoming image is prepared,
loaded and decoded at a time. Broken images are skipped for this mount; slow
images hold the current door, with an eight-second preparation limit. Reduced
motion stops rotation and animation and initially fetches only the first door.
Timers/listeners/preloads are cleaned up on navigation away from home.

This manifest is display-only, not a source of configurator defaults, product
availability, AI prompts or PDF rendering. The prior offline hero-rendering
utility remains available; its 29 presets no longer drive the homepage.

Checks:

```
node --import tsx scripts/verifyHomepageAiShowcase.ts
node --import tsx scripts/verifyHomePage.ts
npm run test:configuration-integrity
npm run build
git diff --check
```

The showcase check verifies exact asset hashes, full ordering/wraparound,
decoded transitions with the prior opaque layer, failed/slow image recovery,
reduced motion, and the original geometry at phone/tablet/desktop widths.
Screenshots are written to `/tmp/hgi-home-ai-22`.
