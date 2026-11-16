import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Brush page shows the main chart linked to its range strip',
  { tags: ['bugbash', 'charts'] },
  async ({ app, browser }) => {
    await app.open('/charts/brush')
    const preview = browser.locator('.reference-preview [data-component="charts/brush"]')
    await preview.scrollIntoView()
    await expect(preview).toBeVisible()
    await expect(
      browser.locator(
        '.reference-preview [data-component="charts/brush"] .bk-brush-main svg.ts-chart',
      ),
    ).toBeVisible()
    await expect(
      browser.locator(
        '.reference-preview [data-component="charts/brush"] .bk-brush-strip svg.ts-chart',
      ),
    ).toBeVisible()
  },
)

test(
  'dragging a Brush handle changes the main chart viewport',
  { tags: ['bugbash', 'charts'] },
  async ({ app, browser }) => {
    await app.open('/charts/brush')
    const main = browser.locator(
      '.reference-preview [data-component="charts/brush"] .bk-brush-main svg.ts-chart',
    )
    await main.scrollIntoView()
    await expect(main).toBeVisible()
    const pathData = () =>
      browser.evaluate(() =>
        [
          ...document.querySelectorAll(
            '.reference-preview [data-component="charts/brush"] .bk-brush-main svg.ts-chart path',
          ),
        ]
          .map((path) => path.getAttribute('d'))
          .filter(Boolean)
          .join('|'),
      )
    const before = await pathData()
    if (before.length === 0) throw new Error('Main chart has no plotted path')
    const handle = await browser.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll(
          '.reference-preview [data-component="charts/brush"] .bk-brush-strip [data-chart-brush-handle]',
        ),
      ]
      const box = nodes.at(-1)?.getBoundingClientRect()
      return box === undefined
        ? null
        : { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
    })
    if (handle === null) throw new Error('Brush strip has no draggable handle')
    await browser.mouse.move(handle.x, handle.y)
    await browser.mouse.down()
    await browser.mouse.move(handle.x - 90, handle.y)
    await browser.mouse.up()
    await expect.poll(pathData).not.toBe(before)
  },
)
