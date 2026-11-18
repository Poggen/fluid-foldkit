import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'
import type { SankeyDocuments } from '../../registry/charts/test/sankey-iframe.fixture'
import type { SankeyProbe } from '../../registry/charts/test/sankey-presentation.fixture'
declare global {
  interface Window {
    sankeyProbe: SankeyProbe
    setupSankeyDocuments: () => Promise<SankeyDocuments>
    sankeyDocuments: SankeyDocuments
  }
}
let code = ''
test.beforeAll(async () => {
  code = await bundleRuntimeFixture(
    fileURLToPath(
      new URL('../../registry/charts/test/sankey-presentation.fixture.ts', import.meta.url),
    ),
  )
})
test('publication samples one root matrix while real SVG motion, hit geometry, retargeting and disposal stay live', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mountRuntimeFixture(page, '/charts/sankey', code)
  const immediate = await page.evaluate(() => window.sankeyProbe.immediate())
  expect(immediate?.count).toBe(11)
  expect(immediate?.reads).toBe(1)
  expect(immediate?.error).toBeLessThan(0.0001)
  await expect
    .poll(() =>
      page.evaluate(
        () => new Set(window.sankeyProbe.samples.map((sample) => sample.paintedLength)).size,
      ),
    )
    .toBeGreaterThan(5)
  const samples = await page.evaluate(() => window.sankeyProbe.samples)
  expect(samples.every((sample) => sample.reads === 1 && sample.error < 0.0001)).toBe(true)
  expect(new Set(samples.map((sample) => sample.paintedLength)).size).toBeGreaterThan(5)
  expect(await page.evaluate(() => window.sankeyProbe.hit())).toEqual([true, true, true])
  expect(await page.evaluate(() => window.sankeyProbe.currentFlowHits())).toEqual({
    wide: [true, true, false, false, false],
    narrow: [true, false],
    reversed: [true, false, false],
  })
  await page.evaluate(() => {
    window.sankeyProbe.repaintFocus()
    window.sankeyProbe.retarget()
  })
  await expect
    .poll(() => page.evaluate(() => window.sankeyProbe.samples.at(-1)?.error))
    .toBeLessThan(0.0001)
  expect(await page.evaluate(() => window.sankeyProbe.hit())).toEqual([true, true, true])
  await page.evaluate(() => window.sankeyProbe.collapse())
  await expect
    .poll(() => page.evaluate(() => window.sankeyProbe.samples.at(-1)?.interactiveCount))
    .toBe(0)
  const beforeMove = await page.evaluate(() => {
    const count = window.sankeyProbe.samples.length
    window.sankeyProbe.relocate()
    return count
  })
  await expect
    .poll(() => page.evaluate(() => window.sankeyProbe.samples.length))
    .toBeGreaterThan(beforeMove)
  await expect
    .poll(() => page.evaluate(() => window.sankeyProbe.samples.at(-1)?.error))
    .toBeLessThan(0.0001)
  await expect.poll(() => page.evaluate(() => window.sankeyProbe.samples.at(-1)?.count)).toBe(11)
  await page.evaluate(() => window.sankeyProbe.replay())
  await expect.poll(() => page.evaluate(() => window.sankeyProbe.samples.at(-1)?.count)).toBe(11)
  await page.screenshot({ path: test.info().outputPath('sankey-live-geometry.png') })
  const disposed = await page.evaluate(() => ({
    ...window.sankeyProbe.dispose(),
    count: window.sankeyProbe.samples.length,
  }))
  expect(disposed.points).toEqual([])
  expect(disposed.animations).toBe(0)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  expect(await page.evaluate(() => window.sankeyProbe.samples.length)).toBe(disposed.count)
  expect(errors).toEqual([])
})

test('native host admits an undrawn full flow and retains its stationary pointer and keyboard focus', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const native = await bundleRuntimeFixture(
    fileURLToPath(new URL('./fixtures/source-restored-chart-motion.ts', import.meta.url)),
  )
  await mountRuntimeFixture(
    page,
    '/charts/sankey',
    native,
    '<main id="style-contract-root" data-fixture="sankey"></main>',
  )
  const stage = page.locator('#motion-sankey-stage')
  await expect(stage.locator('svg').first()).toHaveAttribute('viewBox', '0 0 800 400')
  const path = stage.locator('g[data-ts-key^="sankey:flow"] > path').first()
  const target = await path.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) throw new Error('Expected native flow')
    const matrix = element.getScreenCTM()
    if (matrix === null) throw new Error('Expected connected flow')
    const length = element.getTotalLength()
    const point = element.getPointAtLength(length * 0.8).matrixTransform(matrix)
    return {
      x: point.x,
      y: point.y,
      remaining: Number(element.style.strokeDashoffset) / length,
      paintedHit: element.isPointInStroke(element.getPointAtLength(length * 0.8)),
      singularNodes: [...(element.ownerSVGElement?.querySelectorAll('rect') ?? [])].filter(
        (rect) => {
          const matrix = rect.getScreenCTM()
          return matrix !== null && matrix.a * matrix.d - matrix.b * matrix.c === 0
        },
      ).length,
    }
  })
  expect(target.remaining).toBeGreaterThan(0.98)
  expect(target.paintedHit).toBe(false)
  expect(target.singularNodes).toBeGreaterThan(0)
  await page.mouse.move(target.x, target.y)
  const tooltip = page.locator('#source-motion-sankey-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('Source A')
  await expect
    .poll(() =>
      path.evaluate((element) =>
        element instanceof SVGPathElement ? Number(element.style.strokeDashoffset) : -1,
      ),
    )
    .toBe(0)
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('Source A')
  await page.mouse.move(1300, 900)
  const svg = stage.locator('svg').first()
  await svg.focus()
  await page.keyboard.press('Home')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('Source A')
  await page.keyboard.press('ArrowRight')
  await expect(tooltip).toBeVisible()
  await page.getByRole('button', { name: 'Dispose charts', exact: true }).click()
  await expect(stage).toHaveCount(0)
  await expect(tooltip).toHaveCount(0)
  expect(errors).toEqual([])
})

test('native surfaces retain live geometry across main and iframe document realms', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('../../registry/charts/test/sankey-iframe.fixture.ts', import.meta.url)),
  )
  await mountRuntimeFixture(page, '/charts/sankey', fixture)
  const initial = await page.evaluate(async () => {
    window.sankeyDocuments = await window.setupSankeyDocuments()
    return window.sankeyDocuments.snapshot()
  })
  expect(initial.map((snapshot) => snapshot.sameRealm)).toEqual([true, false])
  for (const snapshot of initial) {
    expect(snapshot.total).toBe(7)
    expect(snapshot.interactive).toBe(3)
    expect(snapshot.reads).toBe(1)
    expect(snapshot.error).toBeLessThan(0.0001)
  }
  const moved = await page.evaluate(() => window.sankeyDocuments.advance())
  for (const snapshot of moved) {
    expect(snapshot.total).toBe(7)
    expect(snapshot.interactive).toBe(3)
    expect(snapshot.reads).toBe(1)
    expect(snapshot.error).toBeLessThan(0.0001)
  }
  const disposed = await page.evaluate(() => window.sankeyDocuments.dispose())
  expect(disposed.before.map((state) => state.points)).toEqual([[], []])
  expect(disposed.after.map((state) => state.notifications)).toEqual(
    disposed.before.map((state) => state.notifications),
  )
  expect(disposed.after.map((state) => state.total)).toEqual([0, 0])
  await expect(page.locator('#style-contract-root svg, #style-contract-root iframe')).toHaveCount(0)
  expect(errors).toEqual([])
})
