import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'
let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-geometry-contracts-scatter-fixture.ts', import.meta.url)),
  )
})

test('Scatter applies full-precision transforms and shares unscaled gradient paint with the focused copy', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/charts/scatter', fixture)
  const root = page.locator('[data-bkm-native-chart="geometry-scatter"]')
  const circles = root.locator('svg.bkm-scatter-island circle')
  await expect(circles).toHaveCount(2)
  const base = circles.first()
  const frame = await base.evaluate((element) => {
    const parent = element.closest('[class*=bkm-scatter-frame-]')
    if (!(element instanceof SVGCircleElement) || !(parent instanceof SVGGraphicsElement))
      throw new Error('Real Scatter point and frame required')
    const matrix = parent.getCTM()
    if (matrix === null) throw new Error('Mounted Scatter transform required')
    return {
      transport: getComputedStyle(parent).getPropertyValue('--bkm-scatter-transform').trim(),
      radius: getComputedStyle(element).getPropertyValue('--bkm-scatter-radius').trim(),
      actualRadius: element.getBBox().width / 2,
      x: matrix.e,
      y: matrix.f,
      fill: getComputedStyle(element).fill,
    }
  })
  expect(frame.transport).toBe('translate(14.828897338403042px,31.818181818181827px)')
  expect(frame.radius).toBe('5px')
  expect(frame.actualRadius).toBe(5)
  expect(Math.abs(frame.x - 14.828897338403042)).toBeLessThan(0.0001)
  expect(Math.abs(frame.y - 350 * (1 - 10 / 11))).toBeLessThan(0.0001)
  const gradient = root.locator('linearGradient[id^="bkm-scatter-"]')
  await expect(gradient).toHaveCount(1)
  await expect(gradient).toHaveAttribute('y1', '35.5')
  await expect(gradient.locator('stop').first()).toHaveCSS('stop-color', 'rgb(0, 0, 0)')
  await expect(gradient.locator('stop').last()).toHaveCSS('stop-color', 'rgb(0, 128, 0)')
  await page.getByRole('button', { name: 'Focus scatter', exact: true }).click()
  const focused = root.locator('.bkm-hov circle').first()
  await expect(focused).toBeVisible()
  await expect(focused).toHaveCSS('fill', frame.fill)
  await expect(focused).toHaveAttribute('r', '5')
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-geometry-fixture')))
  await expect(root).toHaveCount(0)
})
