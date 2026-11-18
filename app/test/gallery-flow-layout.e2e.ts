import { expect, test } from '@playwright/test'

test('narrow gallery flow charts keep their instructions and labels readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const sun = page.locator('#charts-sunburst')
  await sun.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      sun.evaluate((card) => {
        const plot = card.querySelector('.bk-sb-stage')?.getBoundingClientRect()
        const hint = card.querySelector('.bk-sb-hint')?.getBoundingClientRect()
        const footer = card.querySelector('.preview-footer')?.getBoundingClientRect()
        return (
          plot &&
          hint &&
          footer &&
          plot.width > 120 &&
          hint.top >= plot.bottom - 1 &&
          hint.bottom <= footer.top + 1
        )
      }),
    )
    .toBe(true)

  const sankey = page.locator('#charts-sankey')
  await sankey.scrollIntoViewIfNeeded()
  const labels = sankey.locator('svg text')
  await expect(labels).toHaveCount(6)
  const positions = await labels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const { left, top, right, bottom } = node.getBoundingClientRect()
      return { text: node.textContent, left, top, right, bottom }
    }),
  )
  expect(positions.map((label) => label.text)).toEqual(
    expect.arrayContaining(['Visits', '100', 'New', '70', 'Returning', '30']),
  )
  for (const [index, label] of positions.entries()) {
    for (const other of positions.slice(index + 1)) {
      expect(
        label.right <= other.left ||
          other.right <= label.left ||
          label.bottom <= other.top ||
          other.bottom <= label.top,
        `Sankey labels ${label.text} and ${other.text} overlap`,
      ).toBe(true)
    }
  }
})
