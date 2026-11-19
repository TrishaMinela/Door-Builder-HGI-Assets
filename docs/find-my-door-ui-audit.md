# Find My Door UI audit

Checked the whole flow at 390px and 1440px, homeowner and Dealer Mode. Fixes are in this branch.

| Step | Finding | Fix | Done |
| --- | --- | --- | --- |
| Start | Uppercase eyebrow, gold underline, boxed card, and yellow tip bars read as a generic AI form. | Removed that chrome. Short heading, one hint line, builder peacock button. | Yes |
| Start | No photography. The repo has no photos of HGI doors installed on houses. | Gallery uses existing catalog product renders, labeled with the real style and finish, lazy-loaded WebP. Missing house photos are listed below. | Yes |
| Start | Upload was buried under tips. | Upload is the only primary action until a photo is chosen, then Continue is the primary. | Yes |
| Style and glass | Both questions sat in two cards on one long page. | Split into two steps. One Next / See my door action each. Choices are 64px targets with the builder’s gold selection outline. | Yes |
| Lead | Long explanatory paragraph and a boxed form. | Four fields, short line, inline errors tied to each input, autocomplete and input types kept. | Yes |
| Loading | Spinner plus a long sentence. | Skeleton rows while doors are chosen. House render uses a progress bar and one line: “Placing this door on your photo.” | Yes |
| Results | Stacked text cards, a spec table, and a large gold pill forced a long scroll. | Builder layout: OptionCard thumbnails rendered with DoorPreview on the left, the same DoorPreview large on the right, compact summary, builder-sized actions. | Yes |
| House render | The render replaced the page and could be cancelled without a visible retry. | Toggle between Door and On my house in the preview. See this on my house stays available. Failures show the server message and the same button retries. | Yes |
| Errors | Photo, match, send, and render failures were easy to miss. | Each keeps a short message and a recovery action: change the photo, try again, or view the door first. | Yes |
| Progress | No sense of where you were. | A step row. Completed steps are buttons. Dealer Mode omits Details. | Yes |
| Dealer Mode | Contact form still had to be skipped by hand in the new steps. | Glass goes straight to the door. Signing in on the form still jumps to the door. | Yes |
| Density | Desktop results ran past 900px before the actions. | Preview is capped so the door, summary, and both actions sit in the first screen. The site footer is the remaining scroll. | Yes |
| Tap targets | Some text links were under 44px. | Buttons and step controls are at least 44px. Inputs are 48px. | Yes |
| Contrast | Gold text and gray hints were the weak spots. | Body copy is #243034 or #3a4448 on white. Primary buttons are white on peacock. Errors are #9d3f31. | Yes |
| Focus | Inconsistent outlines. | Visible peacock focus ring on the Find My Door controls. | Yes |
| Labels | Upload and gallery images needed names. | Upload input is inside its label. Gallery buttons name the product. The rendered house image is labeled with the door title. | Yes |
| Copy | Explanations repeated the mechanism. | One or two sentences per step. | Yes |
| Performance | Gallery could have shipped large PNGs. | Eight WebP files, 1–7 KB each, with width and height set and lazy loading. | Yes |
| Builder entry | The hidden-entry flag had to stay off. | `builderUx.showFindMyDoorEntry` is still false. | Yes |

## Photos used

These are catalog renders already in the repo, recompressed into `public/assets/find-my-door/`. They are not photographs of installed doors.

| File | Source | Label |
| --- | --- | --- |
| full-lite-white.webp | `public/assets/hero/ai-doors/hero-ai-02-f-paint-white-lhi-exterior-v1.webp` | Full Lite, White |
| two-panel-navy.webp | `hero-ai-01-2phd-paint-navy-lhi-exterior-v1.webp` | 2 Panel, Navy |
| stacked-three-black.webp | `hero-ai-06-3lt-paint-black-lhi-exterior-v1.webp` | Stacked 3 Lite, Black |
| two-panel-natural.webp | `hero-ai-03-2pngss-stain-natural-gold-lhi-exterior-v1.webp` | 2 Panel, Natural Gold |
| shaker-forest.webp | `hero-ai-13-shak3-paint-forest-lhi-exterior-v1.webp` | 3-Panel Shaker, Forest |
| craftsman-harvest.webp | `hero-ai-05-cr14-stain-harvest-wheat-lhi-exterior-v1.webp` | Craftsman, Harvest Wheat |
| french-black.webp | `public/popular-styles/04-french-double.png` | French doors, Black |
| sidelites-forest.webp | `public/popular-styles/03-farmhouse-sidelites.png` | 3/4 Lite with sidelites, Forest |

`public/assets/hero/hero-entryway.webp` is a generated porch with an empty door opening. It is not an HGI door on a house, so it is not in the gallery.

## Photos still needed

There is no real install or lifestyle photography in the repo. Brian would need to supply photos of HGI or ProVia doors on houses for:

- Modern farmhouse
- Craftsman
- Colonial
- Contemporary / modern
- Transitional
- A black or other dark door on a house
- A natural wood-look stain on a house
- A full-lite door on a house
- Double doors on a house
- A door with sidelites on a house
- Forest (deep green) on a house
- Navy on a house
