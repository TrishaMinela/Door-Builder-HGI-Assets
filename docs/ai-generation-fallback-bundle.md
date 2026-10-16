# Generation fallback asset bundle

## Scope

Generation still prefers the customer-configured reference capture. Its existing
catalog fallback, candidate order, image normalization, prompts, settings and
error handling are unchanged. Detection remains independent. No public source
assets, frontend/PDF behavior, compatibility rules or Supabase settings changed.

`server/aiReferenceAssets.generated.ts` is the verified manifest and file loader.
Every reader has an exact literal file URL. The former dynamic read rooted at
`public/` is gone. Vercel traces the exact manifest reads; there is no manual
`includeFiles`, directory glob or raw `src/data/**` inclusion. Vercel's deployed
project schema accepts only one inclusion string, capped at 256 characters, so
neither an array nor a 627-file brace list is supported there. The actual builder
test verifies the complete file set **without** any forced asset inclusion.
Imported catalog code is traced normally. This also avoids glob interpretation
of authored filename punctuation (including a comma in one slab filename).

## Coverage

The inventory script exercises the existing server resolver, including retained
legacy inputs, rather than inventing a second compatibility implementation:

- 79,515 resolver cases; 583 distinct ordered reference groups.
- Every style/variant and paint/stain reference branch, all supported grain
  values, individual variants and combined variants.
- Every main glass ID, including opening-specific overlays and the resolver's
  existing thumbnail fallback.
- Every hardware option, including exterior artwork and secondary icon fallback.
- All seven reachable sidelite asset families and all scoped sidelite glass.
- Secondary slab candidates are included even when an earlier candidate exists.

These dimensions select reference files independently; the test does not claim
to enumerate every Cartesian combination of configuration state. Swing, side,
lock prep, finish hex, jamb color and grid metadata do not add file paths in this
fallback; they still affect the unchanged prompt/configuration snapshot.

| Required file group | Files | Bytes |
| --- | ---: | ---: |
| Door thumbnail fallback | 42 | 124,949 |
| Glass thumbnail fallback | 52 | 2,177,242 |
| Hardware secondary fallback | 34 | 191,300 |
| Main glass artwork | 275 | 8,558,388 |
| Exterior hardware artwork | 34 | 89,504 |
| Slab artwork | 89 | 1,947,246 |
| Sidelite slab/glass artwork | 101 | 1,497,056 |
| **Total** | **627** | **14,585,685** |

Thumbnail files in this table are not UI-only: the existing resolver can actually
read them. Hero scenes, logos, fonts, PDF templates, finish swatches/textures,
grid/mask artwork and unrelated UI thumbnails are not read by this fallback.
Configured captures still include their fully rendered finishes/grids as before.

## Verification and maintenance

Run:

```sh
node --import tsx scripts/generateAiReferenceManifest.ts
node --import tsx scripts/verifyAiReferenceBundle.ts
node --import tsx scripts/verifyEntranceDetectionIsolation.ts
npm run test:configuration-integrity
npm run test:entrance-compatibility
node --import tsx scripts/verifyEntranceAttachment.ts
npm run test:pdf-renderer
npm run build
git diff --check
```

After catalog changes, run the generator with `--patch` and apply its emitted
patch. Commit the generated readers. Keep the broad Vercel inclusion removed.
The default command fails on missing candidates or stale generated declarations.

With the local Vercel Node builder installed under `.vercel/builders`, also run:

```sh
node --import tsx scripts/verifyAiReferenceBundle.ts --package
```

This uses the actual `@vercel/node` builder without installing dependencies or
deploying. It materializes the emitted function files in an isolated temporary
directory, verifies all 627 file contents, repeats resolver parity across all
79,515 cases, and decodes every distinct reference group from the compiled
function. It asserts that detection contains no public assets/catalog modules.
Default verification also compares every candidate's normalized pixels with the
old Sharp processing, tests query strings, secondary candidates and failed reads.

## Measurements before deployment

Baseline: commit `6e129aa`, Vercel deployment
`dpl_uFUTgNtHEXsoaeg6D9QTPB4vPR2x`. Its Resources screen was inspected directly:
generation **42.9 MB**, detection **8.83 MB** (Node 24, IAD1).

Local measurements are **not deployed Vercel sizes**:

| Local measurement | Before | After |
| --- | ---: | ---: |
| NFT generation trace bytes | 53,369,647 | 33,948,666 |
| NFT public files | 1,568 | 627 |
| NFT public bytes | 34,109,688 | 14,585,685 |

NFT 1.10.0 used an in-memory TypeScript transpiler and the baseline generation
module from Git; unrelated untracked font files were excluded. Its 39 optional
native-platform warnings were the same before/after. This trace is separate from
the actual builder output below (which includes emitted JS and sourcemaps).

Actual local `@vercel/node` 16.0.2 packages on macOS:

- Generation: 766 files, 627 public assets, **34,522,674 bytes**.
- Detection: 95 files, zero public assets, **19,071,018 bytes**.

macOS Sharp/native libraries differ from Vercel's Linux deployment. Do not use
these numbers as Vercel dashboard measurements. Post-deployment Resources sizes
must be reported separately after the pushed deployment reaches Ready.

## Check results and limitations

- Manifest/parity/file-decoding and actual packaged-function checks passed.
- Detection isolation, 12 success/error contracts, configured-capture and catalog
  fallback generation requests, prompt and rate-limit checks passed (mocked API).
- Configuration integrity: 54,723 AI configurations, 375 reference groups, 814
  checked assets; zero missing assets or broken dynamic paths.
- 64 entrance compatibility combinations and five detection contracts passed.
- 86 PDF render cases passed, including finishes, hardware, glass and sidelites.
- Targeted server/test TypeScript checks and the production build passed.
- The local Node builder logs its existing older-default TypeScript library
  diagnostics for Error.cause/ErrorOptions and import.meta.env but emits usable
  packages; the explicit ES2022 + vite/client TypeScript check passes.
- `test:ai-visualizer` retains the existing failure at line 200: an unchanged
  transom-notes assertion expects a message while current compatibility notes are
  empty. Neither that test nor its compatibility implementation changed here.
- No real/paid AI generation was performed; upstream calls were mocked. Packaging
  and image resolution were exercised with actual image files and Sharp.

Unrelated pending Montserrat/font changes remain local and must not be included
in this performance commit.
