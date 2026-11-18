import { expect, test } from '@playwright/test'

for (const width of [1280, 1440, 1920]) {
  test(`showcase chart axes keep readable labels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    for (const name of ['line', 'area', 'bar', 'composed', 'live-line']) {
      const preview = page.locator(`[data-component="charts/${name}"]`)
      await preview.scrollIntoViewIfNeeded()
      const labels = preview.locator(
        '[data-ts-key^="x-tick-label:"], [data-bkm-bar-category-x-axis] span',
      )
      await expect
        .poll(() => labels.count(), { message: `${name} axis admission` })
        .toBeGreaterThan(1)
      await expect
        .poll(async () =>
          labels.evaluateAll((nodes) => {
            const visible = nodes
              .filter((node) => {
                const style = getComputedStyle(node)
                return (
                  node.textContent && Number(style.opacity) > 0 && style.visibility !== 'hidden'
                )
              })
              .map((node) => node.getBoundingClientRect())
              .filter((box) => box.width > 0)
              .sort((a, b) => a.left - b.left)
            return visible.length < 2
              ? -Infinity
              : Math.min(
                  ...visible.slice(1).map((box, index) => box.left - (visible[index]?.right ?? 0)),
                )
          }),
        )
        .toBeGreaterThanOrEqual(4)
    }
  })
}
