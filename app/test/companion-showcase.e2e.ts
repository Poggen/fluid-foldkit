import { expect, test } from '@playwright/test'

for (const theme of ['light', 'dark']) {
  test(`companion previews remain visible and contained in ${theme} theme`, async ({ page }) => {
    await page.goto(`/?theme=${theme}`)
    const brush = page.locator('#charts-brush')
    await brush.scrollIntoViewIfNeeded()
    await expect(brush.locator('[data-chart-brush-selection]')).toBeVisible()
    await expect(brush.locator('[data-chart-brush-selection]')).toHaveCSS(
      'fill',
      'rgba(0, 0, 0, 0)',
    )
    await expect(brush.locator('svg rect[fill^="url(#"]')).toBeVisible()
    const brushBounds = await brush.boundingBox()
    const stripBounds = await brush.locator('.bk-brush-strip').boundingBox()
    if (brushBounds === null || stripBounds === null) throw new Error('Brush must be visible')
    expect(stripBounds.y + stripBounds.height).toBeLessThan(brushBounds.y + brushBounds.height)

    const tooltip = page.locator('#charts-tooltip-box')
    await tooltip.scrollIntoViewIfNeeded()
    const panel = tooltip.locator('fk-bklit-tooltip-box')
    await expect(panel).toBeVisible()
    await expect
      .poll(async () => {
        const container = await tooltip.boundingBox()
        const box = await panel.boundingBox()
        return box !== null && container !== null && box.x >= container.x
      })
      .toBe(true)
    await tooltip.getByRole('button', { name: 'Follow the detail' }).click()
    await expect(panel).toBeVisible()

    for (const [slug, name] of [
      ['series-point-marker', 'Animated series marker'],
      ['bar-skeleton', 'Loading chart'],
    ] as const) {
      const card = page.locator(`#charts-${slug}`)
      await card.scrollIntoViewIfNeeded()
      const svg = card.getByRole('img', { name })
      await expect(svg).toBeVisible()
      await expect(svg).toHaveAttribute('width', /\d+/)
      await expect(svg).toHaveAttribute('height', /\d+/)
      const box = await svg.boundingBox()
      if (box === null) throw new Error('Companion SVG must be visible')
      expect(box.width).toBeGreaterThan(100)
      expect(box.height).toBeGreaterThan(50)
      if (slug === 'bar-skeleton') {
        const background = svg.locator('mask > rect')
        await expect(background).toHaveAttribute('fill-opacity', '0.35')
        await expect(background).toHaveAttribute('width', '280')
        await expect(background).toHaveAttribute('height', '160')
      }
    }
  })
}
