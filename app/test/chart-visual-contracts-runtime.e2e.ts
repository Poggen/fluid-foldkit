import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers.js'

let runtimeCode = ''
test.beforeAll(async () => {
  runtimeCode = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-visual-contracts-runtime-fixture.ts', import.meta.url)),
  )
})

test('Ring SVG clips its painted layer and retains layout style paint containment on focus', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/ring',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="ring"></main>',
  )
  const svg = page.locator('[data-bkm-chart="ring"] svg').filter({ has: page.locator('path') })
  await expect(svg).toBeVisible()
  await expect(svg).toHaveCSS('overflow', 'hidden')
  await expect(svg).toHaveCSS('contain', 'content')
  await page.getByRole('button', { name: 'Focus ring', exact: true }).click()
  await expect(svg).toHaveCSS('overflow', 'hidden')
  await expect(svg).toHaveCSS('contain', 'content')
  await page.getByRole('button', { name: 'Dispose ring', exact: true }).click()
  await expect(svg).toHaveCount(0)
})

test('Heatmap public host consumes panel override precedence and clears removed keys', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/heatmap',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="heatmap"></main>',
  )
  await expect(page.locator('#style-contract-root')).toHaveAttribute('data-ready', 'true')
  const svg = page.locator('svg.ts-chart')
  await expect(svg).toBeVisible()
  await svg.focus()
  await page.keyboard.press('Home')
  const shell = page.locator('#visual-heatmap-tooltip')
  const body = shell.locator(':scope > [inert]')
  const panel = body.locator(':scope > .bkm-tooltip-panel')
  await expect(shell).toHaveAttribute('role', 'status')
  await expect(shell).toHaveAttribute('aria-live', 'polite')
  await expect(shell).toHaveCSS('position', 'absolute')
  await expect(shell).toHaveCSS('pointer-events', 'none')
  await expect(shell).toHaveCSS('width', '180px')
  await expect(panel).toHaveCSS('background-color', 'rgb(0, 128, 0)')
  await expect(panel).toHaveCSS('padding', '9px')
  await expect(panel).toHaveCSS('width', '180px')
  await expect(panel).toHaveCSS('margin-top', '0px')
  await expect(panel).toHaveCSS('opacity', '0.35')
  expect(
    await panel.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a),
  ).toBeCloseTo(Math.cos((7 * Math.PI) / 180), 5)
  expect(
    await panel.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--tooltip-accent').trim(),
    ),
  ).toBe('6')
  await expect(shell).not.toHaveCSS('background-color', 'rgb(0, 128, 0)')
  await expect(shell).not.toHaveCSS('opacity', '0.35')
  expect(
    await shell.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--tooltip-accent'),
    ),
  ).toBe('')
  await expect(panel.locator('.bkm-tooltip-content > *')).toHaveText([
    'November 8th 2026',
    'Sunday',
    '',
    '1 contribution',
  ])
  await shell.evaluate((element) => {
    element.setAttribute('data-retained-shell', '')
  })
  await body.evaluate((element) => {
    element.setAttribute('data-retained-body', '')
  })
  await panel.evaluate((element) => {
    element.setAttribute('data-old-panel', '')
  })
  await page.getByRole('button', { name: 'Remove panel styles' }).click()
  await svg.focus()
  await page.keyboard.press('ArrowDown')
  await expect(shell).toHaveAttribute('data-retained-shell', '')
  await expect(body).toHaveAttribute('data-retained-body', '')
  await expect(panel).not.toHaveAttribute('data-old-panel')
  await expect(panel.locator('.ts-bkm-heatmap-tooltip-value')).toHaveText('Count 2')
  await expect(panel).not.toHaveClass(/authored-tooltip/u)
  await expect(panel).not.toHaveCSS('padding', '9px')
  await expect(panel).toHaveCSS('opacity', '1')
  await expect(panel).toHaveCSS('transform', 'none')
  expect(
    await panel.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--tooltip-accent'),
    ),
  ).toBe('')
  await expect(panel).not.toHaveCSS('background-color', 'rgb(128, 0, 128)')
  await page.getByRole('button', { name: 'Set blue background' }).click()
  await svg.focus()
  await page.keyboard.press('Home')
  await expect(panel).toHaveCSS('background-color', 'rgb(0, 0, 255)')
  await page.getByRole('button', { name: 'Dispose heatmap' }).click()
  await expect(shell).toHaveCount(0)
})

for (const initiallyReduced of [false, true]) {
  test(`Radar real reduced motion settles geometry (${initiallyReduced ? 'initial' : 'live change'})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: initiallyReduced ? 'reduce' : 'no-preference' })
    await mountRuntimeFixture(
      page,
      '/charts/radar',
      runtimeCode,
      '<main id="style-contract-root" data-fixture="radar"></main>',
    )
    const area = page.locator('[data-bkm-radar] svg path').first()
    if (!initiallyReduced) {
      await expect(page.locator('[data-bkm-enter]')).toHaveCount(1)
      await expect(area).not.toHaveAttribute('d', /-50/u)
      await page.emulateMedia({ reducedMotion: 'reduce' })
    }
    await expect(area).toHaveAttribute('d', /-50/u)
    await expect(area).toHaveCSS('fill-opacity', '0.15')
    await expect(area.locator('..')).toHaveCSS('opacity', '1')
    await expect(page.locator('[data-bkm-enter]')).toHaveCount(0)
    const label = page.getByText('Alpha', { exact: true })
    const position = await label.locator('..').evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)
      return { x: matrix.m41, y: matrix.m42 }
    })
    expect(Math.hypot(position.x, position.y)).toBeGreaterThan(50)
    expect(position.y).toBeLessThan(0)
    await page.getByRole('button', { name: 'Dispose radar' }).click()
    await expect(area).toHaveCount(0)
  })
}

test('Funnel beyond 24 stages and 8 layers consumes hover paint and spring interruption', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/funnel',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="funnel"></main>',
  )
  const stages = page.locator('.bkm-stages > *')
  await expect(stages).toHaveCount(25)
  const last = stages.nth(24)
  const label = last.locator('.bkm-fl')
  const ring = last.locator('.bkm-l9')
  await expect(ring).toHaveCount(1)
  await expect(label).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Focus first stage' }).click()
  await expect(label).toHaveCSS('opacity', '0.4')
  await page.getByRole('button', { name: 'Focus final stage' }).click()
  const springSample = await ring.evaluate((element) => {
    const animation = element.getAnimations()[0]
    if (animation === undefined) throw new Error('Missing real deep-layer hover animation')
    animation.pause()
    animation.currentTime = 50
    const value = new DOMMatrix(getComputedStyle(element).transform).d
    animation.play()
    return value
  })
  expect(springSample).toBeGreaterThan(1)
  expect(springSample).toBeLessThan(1.12)
  await page.getByRole('button', { name: 'Focus first stage' }).click()
  await page.getByRole('button', { name: 'Focus final stage' }).click()
  await expect(label).toHaveCSS('opacity', '1')
  await expect
    .poll(() => ring.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).d))
    .toBeCloseTo(1.12, 4)
  await expect(page.locator('[data-bkm-chart="funnel"]')).toHaveAttribute('data-hover', '24')
  await page.getByRole('button', { name: 'Clear funnel focus' }).click()
  await expect
    .poll(() => ring.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).d))
    .toBeCloseTo(1, 4)
  await page.getByRole('button', { name: 'Dispose funnel' }).click()
  await expect(page.locator('[data-bkm-chart="funnel"]')).toHaveCount(0)
})

test('native tooltip keeps synchronous hidden placement and pin/reentry interaction styles', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/bar',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="native-tooltip"></main>',
  )
  const tooltip = page.locator('#visual-native-tooltip')
  await page.getByRole('button', { name: 'Focus native tooltip', exact: true }).click()
  await expect(tooltip).toHaveCSS('visibility', 'hidden')
  await expect(tooltip).toHaveAttribute('data-synchronous-opacity', '0')
  await expect(tooltip).toHaveAttribute('data-synchronous-top', '40px')
  expect(
    Number.parseFloat((await tooltip.getAttribute('data-synchronous-left')) ?? ''),
  ).toBeGreaterThan(16)
  await page.getByRole('button', { name: 'Reveal native tooltip' }).click()
  await expect(tooltip).toHaveCSS('visibility', 'visible')
  await expect(tooltip).toHaveCSS('pointer-events', 'none')
  await page.getByRole('button', { name: 'Pin native tooltip' }).click()
  await expect(tooltip).toHaveAttribute('data-sticky', 'true')
  await expect(tooltip).toHaveCSS('pointer-events', 'auto')
  await expect(tooltip).toHaveCSS('user-select', 'text')
  await page.getByRole('button', { name: 'Leave native tooltip' }).click()
  await expect(tooltip).toBeHidden()
  await page.getByRole('button', { name: 'Focus native tooltip', exact: true }).click()
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveAttribute('data-synchronous-opacity', '0')
  await expect(tooltip).toHaveCSS('pointer-events', 'none')
  await expect(tooltip).toHaveCSS('user-select', 'none')
  await expect(tooltip).toHaveText('Week 1: 32 active users')
  await page.getByRole('button', { name: 'Dispose native tooltip' }).click()
  await expect(tooltip).toBeHidden()
})

for (const initiallyReduced of [false, true]) {
  test(`Heatmap loading pulse respects reduced motion (${initiallyReduced ? 'initial' : 'live change'})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: initiallyReduced ? 'reduce' : 'no-preference' })
    await mountRuntimeFixture(
      page,
      '/charts/heatmap',
      runtimeCode,
      '<main id="style-contract-root" data-fixture="heatmap-loading"></main>',
    )
    const cells = page.locator('g[data-ts-key="heatmap-loading-shimmer"] > rect')
    await expect(cells).toHaveCount(7)
    if (!initiallyReduced) {
      for (const cell of await cells.all())
        await expect(cell).toHaveCSS('animation-name', 'bkm-hm-pulse')
      await page.emulateMedia({ reducedMotion: 'reduce' })
    }
    for (const cell of await cells.all()) {
      await expect(cell).toHaveCSS('animation-name', 'none')
      await expect(cell).toHaveCSS('opacity', '0.2')
    }
    expect(
      await cells.evaluateAll((nodes) => nodes.flatMap((node) => node.getAnimations()).length),
    ).toBe(0)
    await page.getByRole('button', { name: 'Dispose heatmap' }).click()
    await expect(cells).toHaveCount(0)
  })
}
