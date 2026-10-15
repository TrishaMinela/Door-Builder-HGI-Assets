import assert from 'node:assert/strict'
import type { Page } from 'playwright-core'
import { doorStyles } from '../src/data/options'
import { doorStyleDisplayName } from '../src/data/productDisplayNames'

export async function assertDoorStyleCards(page: Page) {
  const cards = page.locator('.door-image-card')
  await cards.first().waitFor()
  await page.waitForTimeout(150)
  assert.equal(await cards.count(), doorStyles.length, 'Full existing catalog remains browsable')
  assert.equal(await cards.locator('.option-copy strong,.option-copy small,.option-copy>span').count(), 0, 'No visible product names or descriptions')
  assert.equal(await cards.locator('.door-image-check').count(), 1, 'Selected door has a checkmark')
  const sizes = await cards.evaluateAll(elements => elements.map(el => ({ height: el.getBoundingClientRect().height, image: el.querySelector('.option-visual')!.getBoundingClientRect().height })))
  assert.ok(Math.max(...sizes.map(x => x.height)) - Math.min(...sizes.map(x => x.height)) < 1, 'Equal card heights')
  assert.ok(Math.max(...sizes.map(x => x.image)) - Math.min(...sizes.map(x => x.image)) < 1, 'Consistent thumbnail region')
  const actions = await cards.locator('.door-details-trigger').evaluateAll(elements => elements.map(el => {
    const css = getComputedStyle(el), rect = el.getBoundingClientRect(), card = el.closest('article')!.getBoundingClientRect()
    return { height: rect.height, border: css.borderTopWidth, background: css.backgroundColor, shadow: css.boxShadow, color: css.color, centered: Math.abs(rect.x + rect.width / 2 - card.x - card.width / 2) < 1, size: css.fontSize, chevrons: el.querySelectorAll('svg.lucide-chevron-right').length, info: el.querySelectorAll('svg.lucide-info').length }
  }))
  assert.ok(actions.every(x => x.height >= 44 && x.border === '0px' && x.background === 'rgba(0, 0, 0, 0)' && x.shadow === 'none' && x.color === 'rgb(13, 102, 108)' && x.centered && x.size === '14px' && x.chevrons === 1 && x.info === 0), 'Centered teal text/chevron action, shared typography, no chrome, 44px target')
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.styleId as string)
  const original = await saved()
  const width = page.viewportSize()!.width
  for (const style of [doorStyles.find(item => item.code === 'S4')!, doorStyles.find(item => item.code === 'F')!]) {
    const name = doorStyleDisplayName(style)
    const card = cards.filter({ has: page.getByRole('button', { name: `Select ${name}`, exact: true }) })
    const details = card.getByRole('button', { name: `View details for ${name}`, exact: true })
    await details.click()
    const modal = page.getByRole('dialog', { name, exact: true })
    await modal.waitFor()
    assert.equal(await saved(), original, 'Opening details does not select the door')
    assert.equal(await modal.locator('img').getAttribute('src'), style.image, 'Larger image reuses catalog artwork')
    assert.equal(await modal.getByRole('heading', { name, exact: true }).innerText(), name)
    const close = modal.getByRole('button', { name: 'Close door details' })
    assert.ok(await close.evaluate(el => el === document.activeElement), 'Initial close-button focus')
    await page.keyboard.press('Shift+Tab')
    const action = modal.getByRole('button', { name: style.id === original ? 'Selected' : 'Select this door', exact: true })
    if (style.id !== original) assert.ok(await action.evaluate(el => el === document.activeElement), 'Backward focus wrap')
    await page.keyboard.press('Tab')
    assert.ok(await close.evaluate(el => el === document.activeElement), 'Forward focus wrap')
    const bounds = (await modal.boundingBox())!
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= page.viewportSize()!.height, 'Dialog fits the screen')
    assert.equal(await modal.locator('img').evaluate(el => getComputedStyle(el).objectFit), 'contain')
    await page.screenshot({ path: `/tmp/door-details-${width}-${style.code}.png` })
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'hidden' })
    assert.ok(await details.evaluate(el => el === document.activeElement), 'Escape restores trigger focus')
    // Native close and React's onClose focus restoration run in separate tasks.
    await page.waitForTimeout(50)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    assert.ok(await details.evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none'), 'Visible keyboard focus indicator')
    await details.click()
    await page.mouse.click(2, 2)
    await modal.waitFor({ state: 'hidden' })
    assert.equal(await saved(), original, 'Backdrop dismissal preserves selection')
    assert.ok(await details.evaluate(el => el === document.activeElement), 'Backdrop restores trigger focus')
    await details.click()
    await close.click()
    assert.equal(await saved(), original, 'Close preserves selection')
  }
  const alternative = doorStyles.find(style => style.id !== original)!
  const name = doorStyleDisplayName(alternative)
  const details = page.getByRole('button', { name: `View details for ${name}`, exact: true })
  await details.click()
  await page.getByRole('dialog', { name, exact: true }).getByRole('button', { name: 'Select this door', exact: true }).click()
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.styleId === id, alternative.id)
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Selecting applies and closes')
  assert.ok(await details.evaluate(el => el === document.activeElement), 'Selection restores trigger focus')
  await details.click()
  assert.ok(await page.getByRole('dialog', { name, exact: true }).getByRole('button', { name: 'Selected', exact: true }).isDisabled())
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: `Select ${doorStyleDisplayName(doorStyles.find(style => style.id === original)!)}`, exact: true }).click()
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.styleId === id, original)
  assert.equal(await cards.locator('.door-image-select[aria-pressed=true]').count(), 1)
  await page.locator('.builder-options-scroll').evaluate(el => el.scrollTo(0, 0))
  await page.screenshot({ path: `/tmp/door-image-cards-${width}.png` })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow')
}
