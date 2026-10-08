# Emery Unified draft website link corrections

Updated October 9, 2026. Corrections are saved in Personify. The existing layout, colors, typography, images, section order, and page slugs were retained. The footer's template labels were replaced with district navigation within the existing columns.

## Saved corrections

| Area | Result |
| --- | --- |
| Shared Calendars link | Selects Calendar, `/calendar`, rather than Home |
| Shared Contact Us link | Selects Contact Us, `/contact-us`, rather than `#` |
| Shared Employment link | Selects Human Resources, `/human-resources` |
| Shared Parent Portal button | Selects Parent Portal, `/parent-portal`, rather than calling the phone number |
| Shared Follow Us link | Selects Social, `/social` |
| Logo action | Opens Home, `/home`; tested in preview |
| Board of Education menu | Selects the existing Board of Education page with the correct `/board-members` slug; submenu retained |
| Departments menu | Selects the existing `/departments` overview; submenu retained |
| Home district information buttons | Select the matching Why Choose Our Schools, Superintendent, Leadership, Accountability Reports, and Video Gallery pages |
| Home quick links | Calendars, Contact Us, and Employment select their matching pages |
| Home District News buttons | The three body and quick-link buttons scroll to the existing newsletter section; the erroneous phone and brochure-download actions were removed |
| Home Tour and Enroll buttons | Correct internal pages selected, including separate desktop and mobile variants |
| Superintendent's Corner | Mobile Tour and Enroll actions select their correct pages |
| Title-IX | Desktop and mobile Tour and Enroll actions select their correct pages |
| Business Office | Mobile Tour and Enroll actions select their correct pages |
| Why Choose Our Schools | Body Enroll Now action selects `/enrollment` |
| Departments overview | All ten cards select their own department pages instead of Home |
| Parent Portal School Events Calendar | Selects `/calendar` |
| Parent Portal Emeryville Health Center | Selects `/emeryville-health-center` |
| Parent Portal Special Education and Student Services | Select their respective pages instead of downloading the Emery brochure |
| Schedule a Tour | Tour buttons scroll to the tour contact section instead of directing visitors to Aeries enrollment; contact-section action tested |
| Schedule a Tour email | Cleaned to `mailto:info@emeryusd.org` and verified in the saved preview |
| Shared footer | Twenty real navigation links replace towing-template entries; internal footer links use the verified relative slugs |

## Footer destinations

| Column | Label | Destination |
| --- | --- | --- |
| District | About EUSD | `/about` |
| District | Superintendent | `/superintendent` |
| District | Leadership and Staff | `/leadership` |
| District | Departments | `/departments` |
| District | Contact Us | `/contact-us` |
| Governance | Board of Education | `/board-members` |
| Governance | Board Agendas | Existing Emery Simbli meeting listing |
| Governance | Board Policies | Existing Emery Simbli policy listing |
| Governance | Parcel Tax | `/parcel-tax` |
| Governance | Sub Committees | `/sub-committees` |
| Families | Parent Portal | `/parent-portal` |
| Families | Enrollment | `/enrollment` |
| Families | Calendar | `/calendar` |
| Families | Student Services | `/student-services` |
| Families | Food Services | `/food-services` |
| Schools | Anna Yates TK 8 | `https://www.annayatesk8.com/` |
| Schools | Emery High School | `https://www.emeryhigh.com/` |
| Schools | Why Choose Our Schools | `/why-choose-our-schools` |
| Schools | Schedule a Tour | `/schedule-a-tour` |
| Schools | Inclusion | `/inclusion` |

## Verification

The saved previews of all 33 draft pages were checked after the shared changes. Calendars, Employment, Contact Us, Parent Portal, Departments, Board of Education, and Follow Us matched their expected page destinations on every page. No towing-template footer entries remained. Internal footer slugs were matched against the existing saved page paths.

The department cards and Parent Portal resource destinations were verified in preview. The accidental district-number actions on Home, Superintendent's Corner, Title-IX, Business Office, and Why Choose Our Schools were removed. Home's news-section action and the tour contact-section action were tested. The tour email correction was checked after saving.

Parent Portal's remaining policy and form buttons have assigned files with matching names: Bullying Policy, Uniform Complaint Procedure Form, School in Session Calendar, and physical forms. The footer logo renders correctly; it was not changed. The initial Title-IX email-protection URLs disappeared when the page finished loading, and the original email addresses display correctly, so no Title-IX email edits were necessary.

Internal menu and button selections use Personify's preview routing now and their saved page slugs when the domain is connected. Relative footer links intentionally use the final slugs; their production routing requires the future domain. No publishing action was performed.

## Remaining launch dependencies

### District News blog

The District Newsletters blog exists, but it has no configured domain or slug. Personify disables its blog slug field until a domain is selected, and the navigation menu URL editor rejects a bare relative `/district-news` URL. Therefore the shared top-bar and About-dropdown District News links remain placeholders rather than being assigned an invented or incorrect destination. Human Resources also retains its original READ link to the old District News page.

When the domain is connected, configure the blog's final landing path and replace those menu links with that destination. `/district-news` is a suitable intended path consistent with the old site's District News page, but it is not yet configured. Home's three news buttons already work by scrolling to its current newsletter section.

### Pages absent from the draft

Privacy Policy, Terms of Service, and License Info remain unlinked text because corresponding pages and approved content do not exist in this draft.

Curriculum and Instruction still references eleven pages on the original website that are absent from the draft: Art, Common Core State Testing, English Language Arts, English Language Development, History and Social Studies, LCAP, Math, Music, Science, Technology Integration, and Transitional Kindergarten. The existing original-site links were retained. These pages need to be migrated before their links can be replaced with verified local slugs.

### Original Title-IX content

The original Title-IX content includes a Fremont complaint coordinator address and Fremont policy references. These were retained, because substituting an unconfirmed Emery contact or policy would change the content beyond a link repair. The district should confirm the intended coordinator and references before launch.

The original read-only audit is historical; this file records the current corrections and remaining dependencies.
