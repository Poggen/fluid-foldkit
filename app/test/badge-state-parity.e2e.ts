import { expect, test } from '@playwright/test'
import { defaults } from '../src/playground/configs/badge'

const badgeUrl = (overrides: Partial<typeof defaults>) =>
  `/components/badge?props=${encodeURIComponent(JSON.stringify({ ...defaults, ...overrides }))}`

test('a constrained Badge keeps its dot visible and truncates its label', async ({ page }) => {
  await page.goto(
    badgeUrl({
      variant: 'dot',
      label: 'A very long status label that must stay inside its column',
    }),
  )
  const preview = page.locator('#docs-playground-view-panel-0')
  const badge = preview
    .locator('span')
    .filter({ hasText: /^A very long status label that must stay inside its column$/u })
    .first()
  await badge.evaluate((element) => {
    element.style.width = '110px'
    element.style.maxWidth = '110px'
  })
  const label = badge.locator('span').last()
  await expect(label).toHaveCSS('text-overflow', 'ellipsis')
  await expect(label).toHaveCSS('overflow-x', 'clip')
  await expect
    .poll(() => label.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(true)
  const dot = badge.locator('span').first()
  await expect(dot).toHaveCSS('width', '7px')
  const badgeBox = await badge.boundingBox()
  const labelBox = await label.boundingBox()
  expect(labelBox?.x ?? Infinity).toBeGreaterThan(badgeBox?.x ?? 0)
  expect((labelBox?.x ?? Infinity) + (labelBox?.width ?? Infinity)).toBeLessThanOrEqual(
    (badgeBox?.x ?? 0) + (badgeBox?.width ?? 0),
  )
})

test('ghost Badge follows the text color without a frame or side padding', async ({ page }) => {
  for (const [size, shape] of [
    ['default', 'rounded'],
    ['compact', 'pill'],
  ] as const) {
    await page.goto(badgeUrl({ variant: 'ghost', label: 'Published', appearance: { size, shape } }))
    const badge = page
      .locator('#docs-playground-view-panel-0 span')
      .filter({ hasText: /^Published$/u })
      .first()
    await badge.evaluate((element) => {
      const parent = element.parentElement
      if (parent === null) throw new Error('Badge needs a containing element')
      parent.style.color = 'rgb(13, 87, 121)'
    })
    await expect(badge).toHaveCSS('color', 'rgb(13, 87, 121)')
    const dot = badge.locator('span').first()
    await expect(dot).toBeVisible()
    await expect(dot).toHaveCSS('width', size === 'compact' ? '6px' : '7px')
    await expect(badge).toHaveCSS('padding-left', '0px')
    await expect(badge).toHaveCSS('padding-right', '0px')
    await expect(badge).toHaveCSS('border-top-width', '0px')
    await expect(badge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(badge).toHaveCSS('height', size === 'compact' ? '20px' : '24px')
  }
})
