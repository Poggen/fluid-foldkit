import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-geometry-contracts-fixture.ts', import.meta.url)),
  )
})

const geometry = (rect: Locator) =>
  rect.evaluate((element) => {
    if (!(element instanceof SVGRectElement)) throw new Error('Actual SVG front required')
    const css = getComputedStyle(element)
    const box = element.getBBox()
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      radius: Number.parseFloat(css.rx),
      fill: css.fill,
      currentX: css.getPropertyValue('--bkm-bar-current-x').trim(),
      currentHeight: css.getPropertyValue('--bkm-bar-current-height').trim(),
      targetX: css.getPropertyValue('--bkm-bar-target-x').trim(),
      targetWidth: css.getPropertyValue('--bkm-bar-target-width').trim(),
      targetHeight: css.getPropertyValue('--bkm-bar-target-height').trim(),
      rawRadius: css.getPropertyValue('--bkm-bar-radius').trim(),
    }
  })

// Chrome's SVG getBBox uses float32 coordinates; 0.0001px covers one ULP below 1024px.
const svgClose = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(0.0001)

test('fractional Bar geometry survives SDK patches, retargeting, replay and disposal under production CSS', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/bar',
    fixture,
    '<main id="style-contract-root"></main><svg id="caller-svg"><g class="ts-chart__marks"></g></svg>',
  )
  const owner = page.locator('[data-bkm-kit="precision-owner"]')
  const rect = owner.locator('rect[data-ts-key="bars:0:value"]')
  const neighbor = page.locator(
    '[data-bkm-kit="precision-neighbor"] rect[data-ts-key="bars:0:value"]',
  )
  await expect(rect).toBeVisible()
  await expect(owner.locator('.ts-chart__marks')).toHaveCSS(
    'clip-path',
    /inset\(0(?:px)?\) view-box/u,
  )
  await expect(owner.locator('.ts-chart-surface')).not.toHaveCSS('overflow', 'hidden')
  await expect(page.locator('#caller-svg .ts-chart__marks')).toHaveCSS('clip-path', 'none')
  const initialFront = await rect.elementHandle()
  if (initialFront === null) throw new Error('Actual SVG front required before replay')
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect.poll(() => initialFront.evaluate((element) => element.isConnected)).toBe(false)
  await expect.poll(async () => (await geometry(rect)).currentHeight).not.toBe('')
  await expect
    .poll(async () => {
      const frame = await geometry(rect)
      return (
        frame.currentHeight !== '' && frame.height > 0 && frame.height < (273 * 37) / 110 - 0.01
      )
    })
    .toBe(true)
  const growing = await geometry(rect)
  const original = await rect.elementHandle()
  if (original === null) throw new Error('Actual SVG front required after replay')
  expect(growing.height).toBeLessThan((273 * 37) / 110)
  expect(growing.currentHeight, JSON.stringify(growing)).not.toBe('')
  svgClose(growing.height, Number.parseFloat(growing.currentHeight))
  const firstCategoryWidth = (643.25 - 25.23456 - 29.375) / 2
  expect(growing.targetX).toBe(`${25.23456 + firstCategoryWidth / 2 - firstCategoryWidth / 2}px`)
  expect(growing.targetWidth).toBe('51.98765px')
  expect(growing.rawRadius).toBe('3.123456px')
  svgClose(growing.width, 51.98765)
  svgClose(growing.radius, 3.123456)
  expect(growing.fill).toBe('rgb(17, 83, 149)')
  const neighborBefore = await geometry(neighbor)

  await page.getByRole('button', { name: 'Patch', exact: true }).click()
  await expect(page.locator('[data-geometry-state]')).toHaveText('patched:1')
  await expect.poll(async () => (await geometry(rect)).targetWidth).toBe('170.12345px')
  expect(await rect.evaluate((element, before) => element === before, original)).toBe(true)
  const retargeted = await geometry(rect)
  expect(retargeted.height).toBeGreaterThanOrEqual(growing.height)
  expect(retargeted.height).toBeLessThan((273 * 63) / 110)
  expect(retargeted.x).toBeGreaterThan(11.98765)
  expect(Number.parseFloat(retargeted.targetX)).toBeCloseTo(11.98765, 10)
  svgClose(retargeted.x, Number.parseFloat(retargeted.currentX))
  svgClose(retargeted.height, Number.parseFloat(retargeted.currentHeight))
  await expect.poll(async () => (await geometry(rect)).currentHeight).toBe('')
  const settled = await geometry(rect)
  svgClose(settled.height, (273 * 63) / 110)
  svgClose(settled.y, 290.125 - (273 * 63) / 110)
  svgClose(settled.width, 170.12345)
  svgClose(settled.x, 11.98765)
  await expect(owner.locator('g.bkm-pulse-0-0')).toHaveCSS('clip-path', /pulse-clip-0-0/u)
  await expect(owner.locator('clipPath[id*="pulse-clip"] path')).toHaveCount(1)

  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect.poll(() => original.evaluate((element) => element.isConnected)).toBe(false)
  await expect.poll(async () => (await geometry(rect)).currentHeight).not.toBe('')
  const replayed = await geometry(rect)
  expect(replayed.height).toBeLessThan(settled.height)
  expect(await geometry(neighbor)).toEqual(neighborBefore)
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click()
  await expect(page.locator('[data-geometry-state]')).toHaveText('horizontal:3')
  const upper = owner.locator('rect[data-ts-key="bars:0:other"]')
  await expect(upper).toBeVisible()
  await expect.poll(async () => (await geometry(rect)).currentHeight).toBe('')
  const horizontal = await geometry(rect)
  svgClose(horizontal.height, 51.98765)
  svgClose(horizontal.x, 25.23456)
  svgClose(horizontal.width, ((643.25 - 25.23456 - 29.375) * 37) / 130)
  const stacked = await geometry(upper)
  svgClose(stacked.x, 25.23456 + ((643.25 - 25.23456 - 29.375) * 37) / 130)
  expect(stacked.fill).toBe('rgb(173, 61, 29)')

  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(owner).toHaveCount(0)
  expect(await geometry(neighbor)).toEqual(neighborBefore)
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-geometry-fixture')))
  await expect(page.locator('[data-bkm-bar-current-geometry]')).toHaveCount(0)
})
