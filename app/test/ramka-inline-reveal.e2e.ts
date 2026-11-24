import { expect, test } from '@playwright/test'

for (const javaScriptEnabled of [false, true]) {
  test.describe(
    javaScriptEnabled ? 'hydrated inline viewer' : 'server-painted inline viewer',
    () => {
      test.use({ javaScriptEnabled, viewport: { width: 402, height: 804 } })

      test('an initial deep link stays in the viewport while its document is scrolled', async ({
        page,
      }) => {
        await page.goto('/ramka/lightbox?ramka-photo=2', { waitUntil: 'domcontentloaded' })
        const region = page.getByRole('region', { name: 'URL-synced state', exact: true })
        const dialog = region.getByRole('dialog', { name: 'Gallery photos', exact: true })
        await expect(dialog).toBeVisible()
        await expect(region.locator('[data-ramka-root]')).toHaveAttribute(
          'data-ramka-container',
          '__inline__',
        )
        const frames = await dialog.evaluate(async (element, observeFrames) => {
          // A viewport-fixed sibling accounts for the space Chromium reserves for a scrollbar.
          const viewport = document.createElement('div')
          viewport.style.cssText =
            'position: fixed; inset: 0; visibility: hidden; pointer-events: none'
          document.body.append(viewport)
          window.scrollTo(0, 1800)
          const sample = () => {
            const rect = element.getBoundingClientRect()
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              viewportWidth: viewport.getBoundingClientRect().width,
              viewportHeight: innerHeight,
              scrollY,
            }
          }
          const samples = [sample()]
          for (let frame = 0; observeFrames && frame < 16; frame++) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
            samples.push(sample())
          }
          viewport.remove()
          return samples
        }, javaScriptEnabled)
        expect(frames.some((frame) => frame.scrollY >= 1000)).toBe(true)
        for (const frame of frames) {
          expect(frame.x).toBeCloseTo(0, 0)
          expect(frame.y).toBeCloseTo(0, 0)
          expect(frame.width).toBeCloseTo(frame.viewportWidth, 0)
          expect(frame.height).toBeCloseTo(frame.viewportHeight, 0)
        }
        if (javaScriptEnabled) {
          await dialog.getByRole('button', { name: 'Close', exact: true }).click()
          await expect(dialog).toBeHidden()
        }
      })
    },
  )
}
