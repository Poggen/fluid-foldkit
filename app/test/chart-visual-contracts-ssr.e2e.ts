import { expect, test } from '@playwright/test'
import { Effect } from 'effect'
import { renderChartVisualContracts } from './chart-visual-contracts-ssr-fixture.js'
import { loadBuiltStyles } from './style-contract-helpers.js'

test('Heatmap legend retains label styling and caller classes for default and explicit font sizes', async ({
  page,
}) => {
  const { html } = await Effect.runPromise(
    renderChartVisualContracts({ replacement: false, reduced: false, exiting: false }),
  )
  await loadBuiltStyles(page, '/charts/heatmap', html)
  const legends = page.locator('#visual-heatmap-legends .ts-bkm-heatmap-legend')
  await expect(legends).toHaveCount(2)
  for (const [index, fontSize, weight] of [
    [0, '12px', '600'],
    [1, '11px', '500'],
  ] satisfies ReadonlyArray<readonly [number, string, string]>) {
    const labels = legends.nth(index).locator('.ts-bkm-heatmap-legend-label')
    await expect(labels).toHaveText(['Less', 'More'])
    for (const label of await labels.all()) {
      await expect(label).toHaveCSS('font-size', fontSize)
      await expect(label).toHaveCSS('line-height', '16px')
      await expect(label).toHaveCSS('color', 'rgb(49, 89, 125)')
      await expect(label).toHaveCSS('font-weight', weight)
    }
  }
  await expect(legends.nth(1)).toHaveCSS('font-size', '22px')
})

for (const replacement of [false, true]) {
  test(`Stat SSR consumes ${replacement ? 'empty replacement' : 'default'} typography`, async ({
    page,
  }) => {
    const { html } = await Effect.runPromise(
      renderChartVisualContracts({ replacement, reduced: false, exiting: false }),
    )
    await loadBuiltStyles(page, '/charts/stat-flow', html)
    const value = page.locator('#visual-stat .bk-stat-value')
    const label = page.locator('#visual-stat .bk-stat-label')
    await expect(value).toHaveText('<12.35>')
    await expect(label).toHaveText('<Total>')
    await expect(page.locator('#visual-stat [data-test-icon]')).toHaveText('Icon')
    await expect(value).toHaveCSS('font-size', replacement ? '16px' : '24px')
    await expect(value).toHaveCSS('font-weight', replacement ? '400' : '700')
    await expect(label).toHaveCSS('font-size', replacement ? '16px' : '12px')
  })
}

test('native SSR loading label consumes delays, exit paint and reduced motion', async ({
  page,
}) => {
  const { html } = await Effect.runPromise(
    renderChartVisualContracts({ replacement: false, reduced: false, exiting: true }),
  )
  await loadBuiltStyles(page, '/charts/bar', html)
  const label = page.getByRole('status').filter({ has: page.locator('.ts-bkm-loading-label-text') })
  await expect(label).toHaveAttribute('aria-live', 'polite')
  await expect(label).toHaveCSS('display', 'flex')
  await expect(label).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 30)')
  await expect(label).toHaveCSS('filter', 'blur(2px)')
  await expect(label).toHaveCSS('opacity', '0')
  await expect(label).toHaveCSS('transition-duration', '0.45s, 0.45s, 0.45s')
  const chars = label.locator('[aria-hidden="true"]')
  await expect(chars).toHaveText(['A', 'B', 'C', 'D'])
  expect(
    await chars.evaluateAll((nodes) =>
      nodes.map((node) => ({
        delay: getComputedStyle(node).animationDelay,
        duration: getComputedStyle(node).animationDuration,
        name: getComputedStyle(node).animationName,
        iterations: getComputedStyle(node).animationIterationCount,
      })),
    ),
  ).toEqual(
    ['0s', '0.25s', '0.5s', '0.75s'].map((delay) => ({
      delay,
      duration: '1.2s',
      name: 'bkm-label-char-4',
      iterations: 'infinite',
    })),
  )
  const shimmerColors = await chars.first().evaluate((element) => {
    const animation = element.getAnimations()[0]
    if (animation === undefined) throw new Error('Missing real shimmer animation')
    animation.pause()
    return [0, 500].map((time) => {
      animation.currentTime = time
      return getComputedStyle(element).color
    })
  })
  expect(shimmerColors[0]).not.toBe(shimmerColors[1])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const character of await chars.all())
    await expect(character).toHaveCSS('animation-name', 'none')
})

test('real reveal CSS consumes tween and spring timing with padded geometry', async ({ page }) => {
  const { html } = await Effect.runPromise(
    renderChartVisualContracts({ replacement: false, reduced: false, exiting: false }),
  )
  await loadBuiltStyles(page, '/charts/bar', html)
  const tween = page.locator('#visual-tween rect')
  const spring = page.locator('#visual-spring rect')
  await expect(tween).toHaveCSS('animation-duration', '0.3s')
  await expect(tween).toHaveCSS('animation-timing-function', 'cubic-bezier(0.1, 0.2, 0.3, 0.4)')
  await expect(spring).toHaveCSS('animation-duration', '0.7s')
  await expect(spring).toHaveCSS('animation-timing-function', 'cubic-bezier(0.85, 0, 0.15, 1)')
  const sampled = await tween.evaluate((element) => {
    const animation = element.getAnimations()[0]
    if (animation === undefined) throw new Error('Missing real reveal animation')
    animation.pause()
    animation.currentTime = 150
    return Number.parseFloat(getComputedStyle(element).width)
  })
  expect(sampled).toBeCloseTo(84 * 0.562464, 1)
  await tween.evaluate((element) => {
    for (const animation of element.getAnimations()) animation.finish()
  })
  await expect(tween).toHaveCSS('width', '84px')
  await expect(tween).toHaveCSS('x', '-2px')
  await expect(page.locator('#visual-negative rect')).toHaveCSS('width', '0px')
  await spring.evaluate((element) => {
    for (const animation of element.getAnimations()) animation.finish()
  })
  await expect(spring).toHaveCSS('width', '0px')
  await expect(spring).toHaveCSS('x', '20px')
})

for (const reduced of [false, true]) {
  test(`standalone skeleton consumes ${reduced ? 'static reduced' : 'animated mask'} paint`, async ({
    page,
  }) => {
    const { html } = await Effect.runPromise(
      renderChartVisualContracts({ replacement: false, reduced, exiting: false }),
    )
    await loadBuiltStyles(page, '/charts/bar', html)
    const svg = page.locator('#visual-skeleton')
    await expect(svg.locator('rect')).toHaveCount(reduced ? 12 : 13)
    const bars = svg.locator(':scope > g > g > rect')
    await expect(bars).toHaveCount(12)
    for (const bar of await bars.all()) {
      await expect(bar).toHaveCSS('fill-opacity', '0.45')
      await expect(bar).toHaveCSS('rx', '2px')
    }
    if (reduced) {
      await expect(svg.locator('mask')).toHaveCount(0)
    } else {
      const sweep = svg.locator('mask rect')
      await expect(sweep).toHaveCSS('animation-name', 'bkm-sweep-travel')
      await expect(sweep).toHaveCSS('animation-duration', '2s')
      await expect(sweep).toHaveCSS('animation-timing-function', 'linear')
      await expect(sweep).toHaveCSS('animation-iteration-count', 'infinite')
      const translations = await sweep.evaluate((element) => {
        const animation = element.getAnimations()[0]
        if (animation === undefined) throw new Error('Missing skeleton animation')
        animation.pause()
        return [0, 1000].map((time) => {
          animation.currentTime = time
          return new DOMMatrix(getComputedStyle(element).transform).m41
        })
      })
      expect(translations).toEqual([-400, 200])
    }
  })
}

test('PatternArea SSR retains its diagonal SVG mask from the normal production stylesheet', async ({
  page,
}) => {
  const { html } = await Effect.runPromise(
    renderChartVisualContracts({ replacement: false, reduced: false, exiting: false }),
  )
  await loadBuiltStyles(page, '/charts/area', html)
  const area = page.locator('#visual-pattern .ts-chart__area[data-ts-key^="pattern-"]')
  await expect(area).toHaveCount(1)
  await expect(area).toHaveCSS('mask-size', '6px 6px')
  await expect(area).toHaveCSS('mask-repeat', 'repeat')
  await expect(area).toHaveCSS('mask-origin', 'view-box')
  await expect(area).toHaveCSS('mask-position', '40px 40px')
  const mask = await area.evaluate((element) => {
    const style = getComputedStyle(element)
    const image = style.maskImage
    const url = image.match(/^url\(["']?(.*?)["']?\)$/u)?.[1]
    if (url === undefined || !url.startsWith('data:image/svg+xml,')) {
      throw new Error(`Expected a data SVG mask, received ${image}`)
    }
    const svg = new DOMParser().parseFromString(
      decodeURIComponent(url.slice('data:image/svg+xml,'.length)),
      'image/svg+xml',
    )
    const path = svg.querySelector('path')
    return {
      prefixed: style.getPropertyValue('-webkit-mask-image') === image,
      parseError: svg.querySelector('parsererror') !== null,
      width: svg.documentElement.getAttribute('width'),
      height: svg.documentElement.getAttribute('height'),
      rendering: svg.documentElement.getAttribute('shape-rendering'),
      path: path?.getAttribute('d'),
      stroke: path?.getAttribute('stroke'),
      strokeWidth: path?.getAttribute('stroke-width'),
      fill: path?.getAttribute('fill'),
    }
  })
  expect(mask).toEqual({
    prefixed: true,
    parseError: false,
    width: '6',
    height: '6',
    rendering: 'crispEdges',
    path: 'M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3',
    stroke: 'black',
    strokeWidth: '1',
    fill: 'none',
  })
})

test('normal production stylesheet emits the dependency Brush fallback diagonal mask', async ({
  page,
}) => {
  await page.goto('/charts/brush')
  const masks = await page.evaluate(() => {
    const collect = (rules: CSSRuleList): string[] =>
      Array.from(rules).flatMap((rule) => {
        if (rule instanceof CSSGroupingRule) return collect(rule.cssRules)
        if (
          !(rule instanceof CSSStyleRule) ||
          !rule.selectorText.includes('.ts-chart__brush-x-fallback .selection')
        ) {
          return []
        }
        return ['mask-image', '-webkit-mask-image'].flatMap((property) => {
          const image = rule.style.getPropertyValue(property)
          if (image === '') return []
          const url = image.match(/^url\(["']?(.*?)["']?\)$/u)?.[1]
          if (url === undefined || !url.startsWith('data:image/svg+xml,')) {
            throw new Error(`Expected emitted fallback SVG mask, received ${image}`)
          }
          const svg = new DOMParser().parseFromString(
            decodeURIComponent(url.slice('data:image/svg+xml,'.length)),
            'image/svg+xml',
          )
          const path = svg.querySelector('path')
          return [
            JSON.stringify({
              property,
              parseError: svg.querySelector('parsererror') !== null,
              width: svg.documentElement.getAttribute('width'),
              height: svg.documentElement.getAttribute('height'),
              path: path?.getAttribute('d'),
              stroke: path?.getAttribute('stroke'),
              strokeWidth: path?.getAttribute('stroke-width'),
              linecap: path?.getAttribute('stroke-linecap'),
              fill: path?.getAttribute('fill'),
            }),
          ]
        })
      })
    return [
      ...new Set(Array.from(document.styleSheets).flatMap((sheet) => collect(sheet.cssRules))),
    ]
  })
  expect(masks.sort()).toEqual(
    ['mask-image', '-webkit-mask-image']
      .map((property) =>
        JSON.stringify({
          property,
          parseError: false,
          width: '6',
          height: '6',
          path: 'M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3',
          stroke: 'black',
          strokeWidth: '1',
          linecap: 'square',
          fill: 'none',
        }),
      )
      .sort(),
  )
})
