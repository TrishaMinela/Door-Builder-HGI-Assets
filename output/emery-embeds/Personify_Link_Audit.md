# Emery Unified draft website link audit

Reviewed October 8, 2026. All 33 pages in EUSD Draft were opened in preview, and their saved paths were read from page settings. This was a read-only review; no design, content, links, or page paths were changed.

The saved paths are consistent and unique. The draft is not yet fully linked: several links still use placeholders, telephone actions, or the wrong page. Preview URLs such as `/preview/<page ID>` are Personify's preview routing for internal page links. Existing internal page selections can remain in place; the destination page's saved path is the relevant path when a domain is connected. Production routing cannot be tested until the domain is connected.

## Shared navigation issues

These issues appear across all 33 preview pages.

| Link | Current destination | Correct destination or action |
| --- | --- | --- |
| Calendars | Home | Calendar page, `/calendar` |
| Contact Us in top bar | `#` | Contact Us page, `/contact-us` |
| Parent Portal | `tel:510-601-4000` | Parent Portal page, `/parent-portal` |
| Follow Us in About dropdown | `#` | Social page, `/social` |
| Brand logo | `#` or `https://#` | Home page, `/home` |
| Employment | `#` | Human Resources page, `/human-resources`, if this is the intended employment landing page; otherwise use the approved external job listing |
| District News in top bar and About dropdown | `#` | Confirm the newsletter/blog landing destination; there is no District News page in the 33-page inventory |
| Board of Education menu | Opens submenu, with no Board of Education landing-page link | Add access to the existing Board of Education page, `/board-members` |
| Departments menu | Opens submenu, with no Departments landing-page link | Add access to the existing Departments page, `/departments`, if visitors should reach the overview |

The Board dropdown currently includes Board Agendas, Board Governance Handbook, Board Meeting Videos, Board Policies, Parcel Tax, and Sub Committees. It does not include Meet the Board or another link to `/board-members`.

## Home page links

The following body links currently dial `510-601-4000` instead of opening their corresponding pages.

| Link | Correct saved path |
| --- | --- |
| Why Choose Our Schools | `/why-choose-our-schools` |
| Message from Dr Quiauna Scott Superintendent | `/superintendent` |
| Leadership and Staff | `/leadership` |
| Accountability Reports | `/sarc` |
| Video Gallery | `/video-gallery` |
| Schedule a tour in lower sections | `/schedule-a-tour` |
| Enroll Now in lower sections | `/enrollment` |
| District News | Confirm newsletter/blog landing destination |

The first hero Enroll Now and Schedule a Tour links already select the corresponding existing pages. The later repeated buttons are the telephone links.

## Repeated call to action issues

Schedule a Tour and Enroll Now links also dial the district number on Superintendent's Corner, Title-IX, and Business Office. The body Enroll Now link on Why Choose Our Schools also dials the number. Use `/schedule-a-tour` and `/enrollment`, respectively.

## Departments overview

All 10 department cards currently select Home. Their destination pages already exist.

| Card | Correct saved path |
| --- | --- |
| Business Office | `/business-office` |
| Curriculum and Instruction | `/curriculum-instruction` |
| Emeryville Health Center Life Long | `/emeryville-health-center` |
| Food Services and Nutrition | `/food-services` |
| Human Resources | `/human-resources` |
| IT Department | `/it-department` |
| Special Education | `/special-education` |
| Student Services | `/student-services` |
| Wellness and Health | `/wellness-and-health` |
| Maintenance and Operations | `/maintenance-and-ops` |

## Parent Portal

- School Events Calendar is `#`; use `/calendar`.
- Emeryville Health Center is `#`; use `/emeryville-health-center`.
- Food Services, Mental Health Resources, and Wellness and Health already select their existing pages.
- School-specific resource links use the Anna Yates and Emery High external websites.

## Pages and destinations still needing decisions

- District News is not a page in the draft inventory. Newsletter article links exist under a separate blog preview ID, so the blog landing path needs to be checked before assigning the navigation link.
- Curriculum and Instruction still links to 11 pages on the old domain: Art, Common Core State Testing, English Language Arts, English Language Development, History and Social Studies, LCAP, Math, Music, Science, Technology Integration, and Transitional Kindergarten. Corresponding pages are absent from this draft. Decide whether to migrate them or intentionally retain the external links. Do not replace them with invented slugs.
- Human Resources has a READ link to the old site's `district-news.html`.
- The Schedule a Tour page's linked Schedule a Tour text opens Aeries enrollment, rather than a tour booking destination. Its email link contains whitespace and an invisible character after `mailto:`; normalize it to `mailto:info@emeryusd.org`.
- Footer Privacy Policy, Terms of Service, and License Info are plain text, with no links. These pages are absent from the draft inventory.
- Title-IX includes policy links to Fremont's website. Confirm those are intentional references for Emery before launch.

## Other missed items seen during the link review

The shared footer still contains towing-template text: Emergency Towing, Jump Starts, Flat Tire Changes, Lockout Service, and Fuel Delivery. These entries have no district navigation links. A broken footer image is visible in the editor. These are content and asset issues; they were left untouched.

## Parcel Tax page specifically

The page path is `/parcel-tax`. Its Measure J Citizen's Oversight Committee link selects the existing Measure J page, whose path is `/measure-j`. Packet and expenditure links are document URLs rather than internal page links. The Message from the Superintendent button is explicitly configured as Download File with an assigned PDF; it should not be flagged as a missing page link merely because it renders as a button.

## Verified saved page paths

| Page | Saved path |
| --- | --- |
| Home | `/home` |
| About | `/about` |
| Superintendent's Corner | `/superintendent` |
| Accountability Reports | `/sarc` |
| Gate Entry Hours | `/gate-entry-hours` |
| Why Choose Our Schools | `/why-choose-our-schools` |
| Contact Us | `/contact-us` |
| Video Gallery | `/video-gallery` |
| FAQs | `/faqs` |
| Title-IX | `/title-ix` |
| Leadership and Staff | `/leadership` |
| Social | `/social` |
| Inclusion | `/inclusion` |
| Departments | `/departments` |
| Business Office | `/business-office` |
| Curriculum and Instruction | `/curriculum-instruction` |
| Emeryville Health Center | `/emeryville-health-center` |
| Human Resources | `/human-resources` |
| Special Education | `/special-education` |
| Student Services | `/student-services` |
| Wellness and Health | `/wellness-and-health` |
| Food Services | `/food-services` |
| IT Department | `/it-department` |
| Board of Education | `/board-members` |
| Maintenance and Operations | `/maintenance-and-ops` |
| Parcel Tax | `/parcel-tax` |
| Measure J | `/measure-j` |
| Sub Committees | `/sub-committees` |
| Enroll Now | `/enrollment` |
| Schedule a Tour | `/schedule-a-tour` |
| Parent Portal | `/parent-portal` |
| Mental Health Resources | `/mental-health-resources` |
| Calendar | `/calendar` |

## Scope limits

The review checked page settings and preview page-link destinations. It did not test production domain routing, every external website, every downloaded file, every popup, form submission, or every button's configured action. Download buttons without anchor URLs are not automatically broken. No publishing or edits were performed.
