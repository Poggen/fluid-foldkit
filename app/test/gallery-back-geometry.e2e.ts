import { expect, test } from '@playwright/test'
import { admitAllPreviews } from './fixtures/gallery-admission'
import {
  observeGalleryReturn,
  readGalleryReturn,
  readSettledGalleryReturn,
  stopGalleryReturn,
} from './fixtures/gallery-return'

for (const target of [
  { slug: 'input-group', label: 'InputGroup' },
  { slug: 'input', label: 'Input' },
]) {
  test(`mobile Back returns a fresh usable ${target.label} card without losing it after admission`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    await admitAllPreviews(page)
    const selector = `.site-content:not(.detail-page) .showcase-grid [data-component="fluid/${target.slug}"]`
    const card = page.locator(selector)
    await card.scrollIntoViewIfNeeded()
    const input = card.getByRole('textbox').first()
    await input.fill('Retire this draft on Back')
    const before = await card.boundingBox()
    if (before === null) throw new Error('Expected a visible target card')
    const beforeScrollY = await page.evaluate(() => scrollY)
    expect(before.x).toBeGreaterThanOrEqual(0)
    expect(before.x + before.width).toBeLessThanOrEqual(390)
    expect(before.y).toBeGreaterThanOrEqual(0)
    expect(before.y + before.height).toBeLessThanOrEqual(844)
    await card
      .getByRole('link', {
        name: `View ${target.label} documentation`,
        exact: true,
      })
      .click()
    await expect(page.locator('[data-reference-page]')).toHaveAttribute(
      'data-reference-page',
      `fluid/${target.slug}`,
    )
    await observeGalleryReturn(page, selector)
    try {
      await page.goBack()
      const frames = await readGalleryReturn(page)
      const firstUsable = frames.findIndex((frame) => frame.usable)
      expect(firstUsable).toBeGreaterThanOrEqual(0)
      const usablePhase = frames.slice(firstUsable)
      expect(usablePhase).toHaveLength(13)
      for (const frame of usablePhase) {
        expect(frame.usable, JSON.stringify(frame)).toBe(true)
        expect(frame.geometry?.fullyVisible, JSON.stringify(frame)).toBe(true)
        expect(frame.value).toBe('')
      }
      const settledFrames = await readSettledGalleryReturn(page)
      const firstRendered = settledFrames
        .slice(firstUsable)
        .findIndex((frame) => frame.appearance.rendered)
      expect(firstRendered).toBeGreaterThanOrEqual(0)
      for (const frame of settledFrames.slice(firstUsable)) {
        expect(frame.usable, JSON.stringify(frame)).toBe(true)
        expect(frame.geometry?.fullyVisible, JSON.stringify(frame)).toBe(true)
        expect(frame.value).toBe('')
      }
      for (const frame of settledFrames.slice(firstUsable + firstRendered))
        expect(frame.appearance.rendered, JSON.stringify(frame)).toBe(true)
      const lastFrame = settledFrames.at(-1)
      expect(lastFrame?.settlementReady).toBe(true)
      expect(lastFrame?.appearance.rendered).toBe(true)
      await expect(input).toHaveValue('')
      await expect(input).toBeEditable()
      const settled = await card.boundingBox()
      if (settled === null) throw new Error('Expected the returned target card')
      expect(settled.x).toBeGreaterThanOrEqual(0)
      expect(settled.x + settled.width).toBeLessThanOrEqual(390)
      expect(settled.y).toBeGreaterThanOrEqual(0)
      expect(settled.y + settled.height).toBeLessThanOrEqual(844)
      await input.fill('A new draft after Back')
      await expect(input).toHaveValue('A new draft after Back')
    } finally {
      const frames = await stopGalleryReturn(page)
      await testInfo.attach(`return-${target.slug}.json`, {
        body: JSON.stringify(
          {
            target,
            before: { ...before, scrollY: beforeScrollY, documentY: before.y + beforeScrollY },
            frames: frames.map((frame) => ({
              ...frame,
              signedDelta:
                frame.geometry === null
                  ? null
                  : {
                      viewportY: frame.geometry.y - before.y,
                      documentY: frame.geometry.documentY - (before.y + beforeScrollY),
                      scrollY: frame.geometry.scrollY - beforeScrollY,
                      height: frame.geometry.height - before.height,
                    },
            })),
          },
          null,
          2,
        ),
        contentType: 'application/json',
      })
    }
  })
}
