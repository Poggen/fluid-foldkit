import { expect, test, type Locator, type Page } from '@playwright/test'
import { admitAllPreviews } from './fixtures/gallery-admission'

const afterTwoFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )

const height = async (card: Locator) => {
  const bounds = await card.boundingBox()
  if (bounds === null) throw new Error('Expected a rendered preview card')
  return bounds.height
}

const roundTripBeforeCommit = (page: Page, anchorSelector: string | null = null) =>
  page.evaluate(
    (anchorSelector) =>
      new Promise<
        | { sameGrid: boolean; removedGrids: number }
        | {
            sameGrid: boolean
            removedGrids: number
            anchors: ({ top: number; bottom: number; left: number; right: number } | null)[]
          }
      >((resolve) => {
        const grid = document.querySelector('.showcase-grid')
        if (grid === null) throw new Error('Expected the landing gallery')
        const anchors: ({ top: number; bottom: number; left: number; right: number } | null)[] = []
        const sampleAnchor = () => {
          if (anchorSelector === null) return
          const anchor = document.querySelector(anchorSelector)
          const bounds = anchor?.getBoundingClientRect()
          anchors.push(
            bounds === undefined
              ? null
              : { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right },
          )
        }
        let removedGrids = 0
        const observer = new MutationObserver((records) => {
          for (const record of records)
            for (const node of record.removedNodes)
              if (node === grid || node.contains(grid)) removedGrids++
        })
        observer.observe(document.body, { subtree: true, childList: true })
        const landing = location.pathname + location.search + location.hash
        const detail = '/components/input' + location.search
        requestAnimationFrame(() => {
          sampleAnchor()
          // Both native URL-change facts enter before another animation-frame commit.
          history.pushState(null, '', detail)
          dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
          history.pushState(null, '', landing)
          dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
          requestAnimationFrame(() => {
            sampleAnchor()
            requestAnimationFrame(() => {
              sampleAnchor()
              observer.disconnect()
              const result = {
                sameGrid: document.querySelector('.showcase-grid') === grid,
                removedGrids,
              }
              resolve(anchorSelector === null ? result : { ...result, anchors })
            })
          })
        })
      }),
    anchorSelector,
  )

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`same-commit route return re-admits bodies without replacing the gallery at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    await admitAllPreviews(page)
    const card = page.locator('[data-component="fluid/input"]')
    await card.scrollIntoViewIfNeeded()
    const input = card.getByRole('textbox').first()
    await input.fill('Keep this draft through the coalesced return')
    await afterTwoFrames(page)

    expect(await roundTripBeforeCommit(page)).toEqual({ sameGrid: true, removedGrids: 0 })
    await expect(card).toHaveAttribute('data-deferred', 'false')
    await expect(input).toHaveValue('')
  })
}

test('coalesced reset uses fresh empty geometry and naturally re-admits compact previews', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?size=compact')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const card = page.locator('[data-component="fluid/input"]')
  await expect(card).toHaveAttribute('data-deferred', 'true')
  await expect(card.getByRole('textbox')).toHaveCount(0)
  const freshEmptyHeight = await height(card)
  const freshStageHeight = await height(card.locator('.preview-content'))
  expect(freshStageHeight).toBeGreaterThanOrEqual(200)
  await expect(card.locator('.preview-content')).toHaveCSS('min-height', '200px')
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  await admitAllPreviews(page)
  await card.scrollIntoViewIfNeeded()
  const originalHeight = await height(card)
  // Use the native URL-change input, retaining the same gallery throughout the size change.
  await page.evaluate(() => {
    const next = new URL(location.href)
    next.searchParams.set('size', 'compact')
    history.pushState(null, '', next)
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  })
  await expect(page.locator('.site')).toHaveAttribute('data-size', 'compact')
  await card.scrollIntoViewIfNeeded()
  await afterTwoFrames(page)
  await expect.poll(async () => Math.abs((await height(card)) - originalHeight)).toBeGreaterThan(1)
  const compactHeight = await height(card)
  await card.getByRole('textbox').first().fill('Retire this compact draft')
  await page.evaluate(() => scrollTo(0, 0))
  await afterTwoFrames(page)
  await expect
    .poll(async () => {
      const bounds = await card.boundingBox()
      if (bounds === null) throw new Error('Expected the offscreen input card')
      return bounds.y
    })
    .toBeGreaterThan(844 + 1200)

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('h1')).toBeInViewport()
  const reset = await roundTripBeforeCommit(page, 'h1')
  expect(reset).toMatchObject({ sameGrid: true, removedGrids: 0 })
  if (!('anchors' in reset)) throw new Error('Expected coalesced anchor samples')
  expect(reset.anchors).toHaveLength(3)
  const [initialAnchor] = reset.anchors
  if (initialAnchor === undefined || initialAnchor === null)
    throw new Error('Expected the initial anchor position')
  for (const anchor of reset.anchors) {
    if (anchor === null) throw new Error('The visible anchor disappeared during reset')
    expect(anchor.left).toBeLessThan(390)
    expect(anchor.right).toBeGreaterThan(0)
    expect(anchor.top).toBeLessThan(844)
    expect(anchor.bottom).toBeGreaterThan(0)
    expect(Math.abs(anchor.top - initialAnchor.top)).toBeLessThanOrEqual(1)
  }
  await expect(card).toHaveAttribute('data-deferred', 'true')
  await expect(card.getByRole('textbox')).toHaveCount(0)
  await expect
    .poll(async () => Math.abs((await height(card)) - freshEmptyHeight))
    .toBeLessThanOrEqual(1)
  expect(await height(card.locator('.preview-content'))).toBeGreaterThanOrEqual(200)
  await expect(card.locator('.preview-content')).toHaveCSS('min-height', '200px')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-deferred', 'false')
  await expect(card.getByRole('textbox').first()).toBeVisible()
  await expect(card.getByRole('textbox').first()).toBeEditable()
  await expect(card.getByRole('textbox').first()).toHaveValue('')
  await expect
    .poll(async () => Math.abs((await height(card)) - compactHeight))
    .toBeLessThanOrEqual(1)
})
