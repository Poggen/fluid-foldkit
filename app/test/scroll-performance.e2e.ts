import { expect, test } from '@playwright/test'

test('mounting a distant preview does not measure unchanged card layout', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
  const first = page.locator('[data-component="fluid/input-message"]')
  await expect(first.locator('textarea')).toBeVisible()
  // Start after initial admission and projection have settled.
  await expect.poll(() => first.evaluate((element) => element.getAnimations().length)).toBe(0)
  const observation = await first.evaluateHandle((element) => {
    const nodes = [element, ...element.querySelectorAll('.preview-stage,.preview-footer')]
    let reads = 0
    const restore = nodes.map((node) => {
      const read = node.getBoundingClientRect
      node.getBoundingClientRect = function () {
        reads += 1
        return read.call(this)
      }
      return () => {
        node.getBoundingClientRect = read
      }
    })
    return { read: () => reads, restore: () => restore.forEach((reset) => reset()) }
  })
  try {
    const chart = page.locator('[data-component="charts/line"]')
    await expect(chart.locator('svg')).toHaveCount(0)
    await chart.scrollIntoViewIfNeeded()
    await expect(chart.locator('svg').first()).toBeAttached()
    expect(await observation.evaluate((value) => value.read())).toBe(0)
  } finally {
    await observation.evaluate((value) => value.restore())
  }
})

test('carousel clock plays visibly, pauses offscreen and resumes without skipping', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
  const tile = page.locator('[data-component="fluid/carousel-dots"]')
  await tile.scrollIntoViewIfNeeded()
  await page.mouse.move(15, 15)
  await tile.getByRole('button', { name: 'Show Inbox', exact: true }).click()
  const current = tile.locator('button[aria-current=true]')
  const fill = current.locator('> span > span')
  const initial = await fill.getAttribute('style')
  await expect.poll(() => fill.getAttribute('style')).not.toBe(initial)
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(300)
  const value = await current.getAttribute('aria-label')
  const before = await fill.getAttribute('style')
  await page.waitForTimeout(2600)
  expect(await fill.getAttribute('style')).toBe(before)
  expect(await current.getAttribute('aria-label')).toBe(value)
  await tile.scrollIntoViewIfNeeded()
  await page.mouse.move(15, 15)
  await expect.poll(() => fill.getAttribute('style')).not.toBe(before)
  expect(await current.getAttribute('aria-label')).toBe(value)
})
