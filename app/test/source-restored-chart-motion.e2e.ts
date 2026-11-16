import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let runtimeCode = ''
test.beforeAll(async () => {
  runtimeCode = await bundleRuntimeFixture(
    fileURLToPath(new URL('./fixtures/source-restored-chart-motion.ts', import.meta.url)),
  )
})
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('public Gauge caller utility overrides the restored stylesheet default under production cascade layers', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/bar',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="utility"></main>',
  )
  const defaults = page.locator('#motion-gauge-default .bk-gauge')
  const overridden = page.locator('#motion-gauge-override .bk-gauge')
  await expect(defaults.locator('svg.ts-chart')).toBeVisible()
  await expect(overridden.locator('svg.ts-chart')).toBeVisible()
  await expect(defaults).toHaveCSS('position', 'relative')
  await expect(overridden).toHaveCSS('position', 'static')
})

test('restored source CSS preserves native tooltip entry, interrupted reentry and keyboard focus dismissal', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/bar',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="tooltip"></main>',
  )
  const stage = page.locator('#motion-bar-stage')
  const svg = stage.locator('svg.ts-chart')
  const precedingControl = page.getByRole('button', { name: 'Dispose charts', exact: true })
  await expect(svg).toBeVisible()
  await page.mouse.move(1300, 900)

  const record = (frames: number) =>
    stage.evaluate(async (element, count) => {
      const samples: { hidden: boolean; opacity: number; panelOpacity: number; scale: number }[] =
        []
      for (let index = 0; index < count; index += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const shell = element.querySelector<HTMLElement>('.ts-chart-tooltip')
        const panel = shell?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
        if (shell === null || panel === undefined || panel === null) continue
        const style = getComputedStyle(shell)
        const panelStyle = getComputedStyle(panel)
        samples.push({
          hidden:
            shell.hidden === true || shell.hidden === 'until-found' || style.display === 'none',
          opacity: Number(style.opacity),
          panelOpacity: Number(panelStyle.opacity),
          scale: new DOMMatrix(panelStyle.transform).a,
        })
      }
      return samples
    }, frames)

  // Seek the real native opacity animation so a 100ms entrance cannot escape frame sampling.
  const quarterEntry = (hold = false) =>
    stage.evaluate(
      (element, paused) =>
        new Promise<{
          opacity: number
          hidden: boolean
          animationTime: number | null
          inlineOpacity: string
        }>((resolve, reject) => {
          let captured = false
          let frame = 0
          const timeout = setTimeout(() => {
            observer.disconnect()
            cancelAnimationFrame(frame)
            reject(new Error('No native tooltip opacity animation was created'))
          }, 3000)
          const inspect = () => {
            if (captured) return
            const shell = element.querySelector<HTMLElement>('.ts-chart-tooltip')
            if (shell === null || shell.hidden !== false) return
            const animation = shell
              .getAnimations()
              .find(
                (candidate) =>
                  !(candidate instanceof CSSAnimation) &&
                  !(candidate instanceof CSSTransition) &&
                  candidate.effect instanceof KeyframeEffect &&
                  candidate.effect.target === shell &&
                  candidate.effect.getKeyframes().some((frame) => frame.opacity !== undefined),
              )
            if (animation === undefined) return
            captured = true
            cancelAnimationFrame(frame)
            observer.disconnect()
            clearTimeout(timeout)
            void (async () => {
              await animation.ready
              animation.pause()
              animation.currentTime = 25
              await new Promise<void>((done) => requestAnimationFrame(() => done()))
              if (!(animation.effect instanceof KeyframeEffect))
                throw new Error('Expected native keyframes')
              const timing = animation.effect.getComputedTiming()
              const sample = {
                animationType: animation.constructor.name,
                timing: {
                  duration: String(timing.duration),
                  progress: timing.progress,
                  delay: timing.delay,
                  endTime: String(timing.endTime),
                },
                keyframes: animation.effect.getKeyframes().map((frame) => ({
                  offset: frame.offset,
                  opacity: frame.opacity,
                  easing: frame.easing,
                })),
                opacity: Number(getComputedStyle(shell).opacity),
                hidden: shell.hidden !== false,
                animationTime:
                  typeof animation.currentTime === 'number' ? animation.currentTime : null,
                inlineOpacity: shell.style.opacity,
              }
              if (!paused) animation.play()
              resolve(sample)
            })().catch(reject)
          }
          const observer = new MutationObserver(inspect)
          observer.observe(element, { childList: true, subtree: true, attributes: true })
          const poll = () => {
            inspect()
            if (!captured) frame = requestAnimationFrame(poll)
          }
          poll()
        }),
      hold,
    )

  const initialQuarter = quarterEntry()
  const entering = record(45)
  await svg.focus()
  await expect(svg).toBeFocused()
  await page.keyboard.press('Home')
  const frames = await entering
  const initial = await initialQuarter
  expect(initial, JSON.stringify(initial)).toMatchObject({ hidden: false, animationTime: 25 })
  expect(initial.opacity, JSON.stringify(initial)).toBeGreaterThan(0)
  expect(initial.opacity, JSON.stringify(initial)).toBeLessThan(0.98)
  expect(
    frames.some(
      (frame) =>
        !frame.hidden && frame.panelOpacity > 0 && frame.panelOpacity < 0.98 && frame.scale < 0.99,
    ),
  ).toBe(true)

  const tooltip = stage.locator('.ts-chart-tooltip')
  const panel = tooltip.locator(':scope > .ts-chart-tooltip__body')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveCSS('opacity', '1')
  await expect(panel).toHaveCSS('opacity', '1')
  await expect
    .poll(() => panel.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a))
    .toBeCloseTo(1, 2)
  await expect(tooltip).toContainText('Alpha')
  const originalPanel = await panel.elementHandle()
  if (originalPanel === null) throw new Error('Missing retained tooltip panel')

  await page.keyboard.press('End')
  await expect(tooltip).toContainText('Gamma')
  await expect(tooltip).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(tooltip).toContainText('Beta')
  await page.keyboard.press('Shift+Tab')
  await expect(precedingControl).toBeFocused()
  await expect(tooltip).toBeHidden()

  // The fixture's final nav button precedes the chart; focus leave owns native dismissal.
  // Install the observer before Tab creates the next native entrance.
  const interrupted = quarterEntry(true)
  await page.keyboard.press('Tab')
  await expect(svg).toBeFocused()
  await page.keyboard.press('Home')
  const interruptedSample = await interrupted
  expect(interruptedSample.opacity, JSON.stringify(interruptedSample)).toBeGreaterThan(0)
  expect(interruptedSample.opacity, JSON.stringify(interruptedSample)).toBeLessThan(0.98)
  await page.keyboard.press('Shift+Tab')
  await expect(precedingControl).toBeFocused()
  await expect(tooltip).toBeHidden()
  expect(await tooltip.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  )

  const reentryQuarter = quarterEntry()
  const reentering = record(45)
  await page.keyboard.press('Tab')
  await expect(svg).toBeFocused()
  await page.keyboard.press('Home')
  const reentryFrames = await reentering
  const reentry = await reentryQuarter
  expect(reentry.opacity, JSON.stringify(reentry)).toBeGreaterThan(0)
  expect(reentry.opacity, JSON.stringify(reentry)).toBeLessThan(0.98)
  expect(
    reentryFrames.some(
      (frame) => !frame.hidden && frame.panelOpacity > 0 && frame.panelOpacity < 1,
    ),
  ).toBe(true)
  await expect(tooltip).toHaveCSS('opacity', '1')
  expect(await panel.evaluate((element, previous) => element === previous, originalPanel)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Dispose charts', exact: true }).click()
  await expect(stage).toHaveCount(0)
  expect(await originalPanel.evaluate((element) => element.isConnected)).toBe(false)
  expect(
    await originalPanel.evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0)
})

test('restored Sankey fallback CSS leaves native physical entrance and hover animation in control', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/sankey',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="sankey"></main>',
  )
  const stage = page.locator('#motion-sankey-stage')
  const rects = stage.locator('g[data-ts-key^="sankey:sankey-node-"] > rect')
  await expect(rects).toHaveCount(4)
  const first = rects.first()
  const samples = await first.evaluate(async (element) => {
    const frames: { height: number; opacity: number; competingCss: boolean }[] = []
    for (let index = 0; index < 90; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      frames.push({
        height: element.getBoundingClientRect().height,
        opacity: Number(getComputedStyle(element).opacity),
        competingCss: element
          .getAnimations()
          .some((animation) => animation instanceof CSSAnimation),
      })
    }
    return frames
  })
  const settledHeight = samples.at(-1)?.height ?? 0
  expect(settledHeight).toBeGreaterThan(40)
  expect(samples.some((sample) => sample.height > 1 && sample.height < settledHeight * 0.9)).toBe(
    true,
  )
  expect(samples.some((sample) => sample.opacity > 0 && sample.opacity < 0.98)).toBe(true)
  expect(samples.some((sample) => sample.competingCss)).toBe(false)
  await expect(first).toHaveCSS('opacity', '1')
  const nativeRect = await first.elementHandle()
  if (nativeRect === null) throw new Error('Missing physical Sankey node')
  await first.hover()
  await expect
    .poll(() => rects.nth(1).evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeLessThan(0.8)
  await expect(first).toHaveCSS('opacity', '1')
  await page.mouse.move(1300, 900)
  await expect(rects.nth(1)).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Dispose charts', exact: true }).click()
  await expect(stage).toHaveCount(0)
  expect(await nativeRect.evaluate((element) => element.isConnected)).toBe(false)
  expect(
    await nativeRect.evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0)
})

test('restored Pie styling keeps large-count translation and donut growth isolated between real instances', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/charts/pie',
    runtimeCode,
    '<main id="style-contract-root" data-fixture="pie"></main>',
  )
  const left = page.locator('#motion-pie-left')
  const right = page.locator('#motion-pie-right')
  await expect(left.locator('g.bkm-pie-arc')).toHaveCount(40)
  await expect(right.locator('g.bkm-pie-arc')).toHaveCount(40)
  const translated = left.locator('g.bkm-pie-role33')
  const rightTranslated = right.locator('g.bkm-pie-role33')
  const growPath = right.locator('g.bkm-pie-role0 path').first()
  const geometry = () =>
    growPath.evaluate((element) => {
      if (!(element instanceof SVGGraphicsElement)) throw new Error('Missing painted Pie path')
      const box = element.getBBox()
      return {
        extent: box.width + box.height,
        path: element.getAttribute('d'),
        cssPath: getComputedStyle(element).d,
      }
    })
  const travel = () =>
    translated.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)
      return Math.hypot(matrix.m41, matrix.m42)
    })
  await expect.poll(async () => (await geometry()).extent).toBeGreaterThan(5)
  await expect(growPath).toHaveCSS('opacity', '1')
  const resting = await geometry()
  await page.getByRole('button', { name: 'Translate slice 33 on left', exact: true }).click()
  await expect.poll(travel).toBeGreaterThan(15)
  await expect(translated).toHaveCSS('opacity', '1')
  await expect(left.locator('g.bkm-pie-role0')).toHaveCSS('opacity', '0.4')
  await expect(rightTranslated).toHaveCSS('opacity', '1')
  expect(
    await rightTranslated.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)
      return Math.hypot(matrix.m41, matrix.m42)
    }),
  ).toBeLessThan(0.1)
  expect(await geometry()).toEqual(resting)

  await page.getByRole('button', { name: 'Grow slice 0 on right', exact: true }).click()
  await expect.poll(async () => (await geometry()).extent).toBeGreaterThan(resting.extent + 2)
  const grown = await geometry()
  expect(grown.path !== resting.path || grown.cssPath !== resting.cssPath).toBe(true)
  await expect.poll(travel).toBeGreaterThan(15)
  await expect(rightTranslated).toHaveCSS('opacity', '0.4')
  await page.getByRole('button', { name: 'Clear left selection', exact: true }).click()
  await expect.poll(travel).toBeLessThan(0.1)
  await expect(left.locator('g.bkm-pie-role0')).toHaveCSS('opacity', '1')
  await expect(right.locator('g.bkm-pie-role0')).toHaveCSS('opacity', '1')
  await expect.poll(async () => (await geometry()).extent).toBeGreaterThan(resting.extent + 2)
  await page.getByRole('button', { name: 'Dispose charts', exact: true }).click()
  await expect(left).toHaveCount(0)
  await expect(right).toHaveCount(0)
})
