import { expect, test, type Locator } from '@playwright/test'
import { componentPages } from '../../lib/catalogue'

const firstFive = ['input-message', 'thinking-indicator', 'color-picker', 'switch', 'combobox']
const emptyStage = async (card: Locator) => {
  await expect(card).toHaveAttribute('data-deferred', 'true')
  const stage = card.locator('.preview-stage > .preview-content')
  await expect(stage).toHaveCount(1)
  await expect(stage.locator(':scope > *')).toHaveCount(0)
  await expect(stage).toHaveText('')
}
const noOuterHeight = async (cards: Locator) => {
  expect(await cards.count()).toBe(componentPages.length)
  expect(
    await cards.evaluateAll(
      (elements) =>
        elements.filter((element) =>
          /(?:^|;)\s*height\s*:/.test(element.getAttribute('style') ?? ''),
        ).length,
    ),
  ).toBe(0)
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`actual Gallery SSR keeps all pre-ready stages empty at ${viewport.width}px`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: 'no-preference',
      viewport,
    })
    try {
      if (baseURL === undefined) throw new Error('Gallery source-flow test requires baseURL')
      const page = await context.newPage()
      await page.goto(new URL('/', baseURL).href)
      const grid = page.locator('.showcase-grid')
      await expect(grid).toHaveAttribute('data-live-previews', 'false')
      const cards = grid.locator('[data-preview-href]')
      await noOuterHeight(cards)
      for (const card of await cards.all()) await emptyStage(card)
      const markedLinks = grid.locator('.preview-footer > a').filter({
        has: page.getByText('New', { exact: true }),
      })
      await expect(markedLinks).toHaveCount(7)
      expect(
        await markedLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
      ).toEqual([
        '/components/breadcrumb',
        '/components/data-table',
        '/components/checkbox',
        '/components/input',
        '/components/textarea',
        '/components/field',
        '/components/context-menu',
      ])
      const badge = markedLinks.first().getByText('New', { exact: true }).locator('..')
      await expect(badge).toHaveCSS('height', '20px')
      await expect(badge.locator(':scope > span').first()).toHaveCSS('width', '6px')
      await expect(badge.locator(':scope > span').first()).toHaveCSS('height', '6px')
      if (viewport.width >= 768) {
        await expect(grid.locator('#fluid-data-table')).toHaveCSS('grid-row', 'span 2 / span 2')
        await expect(grid.locator('#fluid-data-table .preview-stage')).toHaveCSS(
          'padding-top',
          '24px',
        )
        await expect(grid.locator('#fluid-table')).toHaveCSS('grid-column', 'span 2 / span 2')
        for (const slug of ['input', 'textarea']) {
          await expect(grid.locator(`#fluid-${slug}`)).toHaveCSS('grid-column', 'span 1 / span 1')
        }
      }
      if (viewport.width < 768) {
        await expect(cards.first().locator('.preview-content')).toHaveCSS('min-height', '200px')
        const reveals = grid.locator('.preview-reveal')
        await expect(reveals).toHaveCount(componentPages.length)
        // Reveal transforms the painted box; offset metrics retain the source grid layout.
        const { gridBounds, frames } = await grid.evaluate((element) => {
          if (!(element instanceof HTMLElement)) throw new Error('Expected an HTML gallery grid')
          const layoutBounds = (node: HTMLElement) => {
            let left = 0
            let top = 0
            let current: HTMLElement | null = node
            while (current !== null) {
              left += current.offsetLeft
              top += current.offsetTop
              const offsetParent: Element | null = current.offsetParent
              current = offsetParent instanceof HTMLElement ? offsetParent : null
            }
            return {
              left,
              top,
              width: node.offsetWidth,
              height: node.offsetHeight,
              bottom: top + node.offsetHeight,
            }
          }
          return {
            gridBounds: layoutBounds(element),
            frames: Array.from(element.querySelectorAll('.preview-reveal'), (node) => {
              if (!(node instanceof HTMLElement)) throw new Error('Expected an HTML reveal frame')
              return { row: getComputedStyle(node).gridRow, ...layoutBounds(node) }
            }),
          }
        })
        for (const [index, frame] of frames.entries()) {
          expect(frame.row).toBe('auto')
          expect(frame.left).toBeCloseTo(gridBounds.left, 1)
          expect(frame.width).toBeCloseTo(gridBounds.width, 1)
          expect(frame.height).toBeGreaterThan(0)
          const previous = frames[index - 1]
          if (previous !== undefined) expect(frame.top).toBeGreaterThanOrEqual(previous.bottom)
        }
        const offscreen = reveals.last()
        await expect(offscreen).not.toBeInViewport()
        await expect(offscreen).toHaveCSS('opacity', '0')
        const initialTransform = await offscreen.evaluate((node) => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform)
          return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
        })
        expect(initialTransform).toEqual([0.98, 0, 0, 0.98, 0, 8])
      }
    } finally {
      await context.close()
    }
  })

  test(`actual Gallery admits inner stages and re-admits after a UI return at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize(viewport)
    await page.goto('/')
    const grid = page.locator('.showcase-grid')
    await expect(grid).toHaveAttribute('data-live-previews', 'true')
    expect(
      await grid
        .locator('[data-preview-href]')
        .evaluateAll((cards) =>
          cards.slice(0, 5).map((card) => card.getAttribute('data-component')),
        ),
    ).toEqual(firstFive.map((slug) => `fluid/${slug}`))
    for (const slug of firstFive) {
      const card = grid.locator(`[data-component="fluid/${slug}"]`)
      await expect(card).toHaveAttribute('data-deferred', 'false')
      await expect(card.locator('.preview-content > *').first()).toBeAttached()
    }
    const far = grid.locator('[data-component="charts/bar-skeleton"]')
    await emptyStage(far)
    await noOuterHeight(grid.locator('[data-preview-href]'))
    await far.scrollIntoViewIfNeeded()
    await expect(far).toHaveAttribute('data-deferred', 'false')
    await expect(far.getByRole('img', { name: 'Loading chart' })).toBeVisible()
    const input = grid.locator('[data-component="fluid/input"]')
    await input.scrollIntoViewIfNeeded()
    await input.getByRole('link', { name: 'View Input documentation', exact: true }).click()
    await expect(page.locator('[data-reference-page]')).toHaveAttribute(
      'data-reference-page',
      'fluid/input',
    )
    if (viewport.width < 1280) await page.locator('#site-menu-button').click()
    await page.getByRole('link', { name: 'Showcase', exact: true }).click()
    await expect(grid).toHaveAttribute('data-live-previews', 'true')
    await emptyStage(far)
    await far.scrollIntoViewIfNeeded()
    await expect(far).toHaveAttribute('data-deferred', 'false')
    await expect(far.getByRole('img', { name: 'Loading chart' })).toBeVisible()
    await noOuterHeight(grid.locator('[data-preview-href]'))
  })
}
