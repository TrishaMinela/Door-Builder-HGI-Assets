import assert from 'node:assert/strict'
import type { Page } from 'playwright-core'

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
    assert.match(heading.font, /Montserrat/, 'Existing brand font')
    assert.ok(['600', '700'].includes(heading.weight))
  }
  assert.ok(metrics.inputs.every(size => size >= 16), `${stage}: readable form text, no mobile zoom`)
  assert.ok(metrics.titles.every(title => title.size >= 16 && title.size <= 18 && title.weight === '600' && !title.clipped), `${stage}: naturally wrapped, readable card titles: ${JSON.stringify(metrics.titles.filter(title => title.clipped))}`)
  assert.equal(metrics.overflow, false, `${stage}: no horizontal overflow`)
  await page.screenshot({ path: `/tmp/builder-type-${page.viewportSize()!.width}-${stage}.png` })
}
