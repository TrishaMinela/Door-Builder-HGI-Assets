import assert from 'node:assert/strict'
import type { Page } from 'playwright-core'

/** Shared font coverage, including body-portaled dialogs and native controls. */
export async function assertBuilderFontFamilies(page: Page) {
  await page.evaluate('window.__name = (fn) => fn')
  const metrics = await page.evaluate(async () => {
    await document.fonts.ready
    const bad = [...document.querySelectorAll('.builder-typography :is(h1,h2,h3,h4,p,span,strong,a,button,label,input,select,textarea),.promatch-tooltip')]
      .filter(el => el.checkVisibility())
      .filter(el => !getComputedStyle(el).fontFamily.includes(el.closest('.home-hero h1') ? 'Caladea' : 'PT Sans'))
      .map(el => ({ tag: el.tagName, text: el.textContent?.slice(0,60), font: getComputedStyle(el).fontFamily }))
    const hero = document.querySelector('.home-hero h1 em')
    const faces = [...document.fonts].filter(face => face.status === 'loaded').map(face => ({ family: face.family, weight: face.weight, style: face.style }))
    return { bad, faces, hero: hero ? { weight: getComputedStyle(hero).fontWeight, style: getComputedStyle(hero).fontStyle } : null }
  })
  assert.deepEqual(metrics.bad, [], 'All UI text uses PT Sans except the Caladea hero')
  assert.ok(metrics.faces.some(face => face.family.replaceAll('"','') === 'PT Sans'), 'Actual self-hosted PT Sans loaded')
  if (metrics.hero) {
    assert.deepEqual(metrics.hero, { weight: '700', style: 'italic' })
    assert.ok(metrics.faces.some(face => face.family.replaceAll('"','') === 'Caladea' && face.weight === '700' && face.style === 'italic'), 'Actual bold italic Caladea loaded')
  }
}

/** Computed-style checks, not just stylesheet-string assertions. */
export async function assertBuilderTypography(page: Page, stage: string) {
  await page.evaluate('window.__name = (fn) => fn') // tsx preserves names in serialized browser callbacks.
  if (stage === 'home') {
    assert.equal(await page.evaluate(() => {
      const external = document.createElement('section')
      external.innerHTML = '<h1 style="font-size:17px">Unrelated embed</h1>'
      document.body.appendChild(external)
      const size = getComputedStyle(external.firstElementChild!).fontSize
      const token = getComputedStyle(external).getPropertyValue('--type-body')
      external.remove()
      return `${size}|${token}`
    }), '17px|', 'Typography is scoped away from unrelated embeds')
  }
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => {
    const visible = (el: Element) => el.checkVisibility()
    const headings = [...document.querySelectorAll('.builder-typography :is(h1,h2,h3,h4)')].filter(visible)
    const roots = [...document.querySelectorAll('.builder-typography')]
    return {
      h1s: headings.filter(el => el.tagName === 'H1').length,
      headings: headings.map(el => {
        const css = getComputedStyle(el)
        const level = el.tagName.toLowerCase()
        const probe = document.createElement('span')
        probe.style.fontSize = `var(--type-${level})`
        el.appendChild(probe)
        const expected = getComputedStyle(probe).fontSize
        probe.remove()
        return { text: el.textContent, actual: css.fontSize, expected, weight: css.fontWeight, font: css.fontFamily }
      }),
      inputs: [...document.querySelectorAll('.builder-typography :is(input:not([type=checkbox]):not([type=range]):not([type=file]),textarea,select)')].filter(visible).map(el => parseFloat(getComputedStyle(el).fontSize)),
      titles: [...document.querySelectorAll('.builder-typography .option-copy>strong')].filter(visible).map(el => {
        const css = getComputedStyle(el)
        return { text: el.textContent, size: parseFloat(css.fontSize), weight: css.fontWeight, clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 }
      }),
      scoped: roots.length > 0,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }
  })
  assert.ok(metrics.scoped, stage)
  assert.equal(metrics.h1s, 1, `${stage}: exactly one visible main title`)
  for (const heading of metrics.headings) {
    assert.equal(heading.actual, heading.expected, `${stage}: shared heading size ${heading.text}`)
    const hero = stage === 'home' && heading.text?.includes('Build a Door Made for')
    assert.match(heading.font, hero ? /Caladea/ : /PT Sans/, 'Shared app font with home hero exception')
    assert.ok((hero ? ['400'] : ['600', '700']).includes(heading.weight))
  }
  assert.ok(metrics.inputs.every(size => size >= 16), `${stage}: readable form text, no mobile zoom`)
  assert.ok(metrics.titles.every(title => title.size >= 16 && title.size <= 18 && title.weight === '600' && !title.clipped), `${stage}: naturally wrapped, readable card titles: ${JSON.stringify(metrics.titles.filter(title => title.clipped))}`)
  assert.equal(metrics.overflow, false, `${stage}: no horizontal overflow`)
  await page.screenshot({ path: `/tmp/builder-type-${page.viewportSize()!.width}-${stage}.png` })
}
