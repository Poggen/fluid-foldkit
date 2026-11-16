import { expect, test } from '@playwright/test'

test('paused LiveLine showcase geometry stays within its snapshot window as calendar time advances', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-15T00:00:00Z'))
  await page.goto('/?theme=light')
  const card = page.locator('[data-component="charts/live-line"]')
  await card.scrollIntoViewIfNeeded()
  const svg = card.getByRole('img', { name: 'Live line chart', exact: true })
  await expect(svg).toBeVisible()
  await expect
    .poll(async () =>
      svg.evaluate((element) => {
        if (!(element instanceof SVGSVGElement)) throw new Error('Expected the real LiveLine SVG')
        const width = element.getBoundingClientRect().width
        return element.getBBox().width / width
      }),
    )
    .toBeLessThan(8)
  await expect(svg.locator('path,polyline').first()).toBeAttached()
})
