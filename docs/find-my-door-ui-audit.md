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
| Density | The phone results overflowed sideways, and the desktop door was a small box in a text-heavy panel. | Phone order is title, a door about 55% of the screen, the toggle, a snap row of doors, then the actions, then details. Desktop gives the door most of the right panel. The reason sits under the selected door. Checked that scroll width matches the screen at 360px and 390px. | Yes |
| Tap targets | Some text links were under 44px. | Buttons and step controls are at least 44px. Inputs are 48px. | Yes |
| Contrast | Gold text and gray hints were the weak spots. | Body copy is #243034 or #3a4448 on white. Primary buttons are white on peacock. Errors are #9d3f31. | Yes |
| Focus | Inconsistent outlines. | Visible peacock focus ring on the Find My Door controls. | Yes |
| Labels | Upload and gallery images needed names. | Upload input is inside its label. Gallery buttons name the product. The rendered house image is labeled with the door title. | Yes |
| Copy | Explanations repeated the mechanism. | One or two sentences per step. | Yes |
| Performance | Gallery could have shipped large PNGs. | Eight WebP files, 1–7 KB each, with width and height set and lazy loading. | Yes |
| Builder entry | The hidden-entry flag had to stay off. | `builderUx.showFindMyDoorEntry` is still false. | Yes |

## Photos used

Exterior photos from homeguardindustries.com, saved as WebP in `public/assets/find-my-door/`. Names follow the source filenames.

| File | Source | Label |
| --- | --- | --- |
| hero-craftsman-full-lite.webp | Entry-Doors-20-Gauge-Gallery-F.jpg | 20 Gauge full lite, Craftsman. Hero. |
| signature-f482-sidelites.webp | Entry-Doors-Signature-Series-Gallery-F482-2.png | Signature Series F482, Farmhouse |
| gauge-22-cr14.webp | Entry-Doors-Popular-Entry-Doors-CR14.jpg | 22 Gauge CR14, Craftsman |
| brushed-smooth-full-lite.webp | Entry-Doors-Brushed-Smooth-Gallery-F-1.jpg | Brushed Smooth, Traditional |
| signature-two-panel.webp | Entry-Doors-Signature-Series-Gallery-2PPLSS.jpg | Signature Series, Modern |
| shaker-cottage.webp | Entry-Doors-22-Gauge-Gallery-SHAK3.png | 22 Gauge shaker, Cottage |
| brushed-smooth-3-lite.webp | Entry-Doors-Brushed-Smooth-Gallery-3LT.jpg | Brushed Smooth 3 lite, Modern |
| six-panel-colonial.webp | Entry-Doors-20-Gauge-Gallery-S1.png | 20 Gauge 6 panel, Colonial |
| textured-half-lite.webp | Entry-Doors-Textured-Gallery-S.jpg | Textured half lite, Modern |
| farmhouse-f482.webp | Entry-Doors-Popular-Doors-F482.webp | Popular F482, Farmhouse |
