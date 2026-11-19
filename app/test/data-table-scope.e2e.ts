import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./data-table-scope-fixture.ts', import.meta.url)),
  )
})

test('a scope action still updates its parent after returning from signal detail', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/data-table', fixture)
  await page.getByRole('button', { name: 'Battery temperature' }).click()
  await page.getByRole('button', { name: 'Back to signals' }).click()
  await expect(page.getByRole('heading', { name: 'Vehicle signals' })).toBeVisible()
  const active = page.getByRole('switch', { name: 'Active signals only' })
  await active.click()
  await expect(active).toBeChecked()
  await page.getByRole('button', { name: 'Clear vehicle scope' }).click()
  await expect(page.getByRole('heading', { name: 'All signals' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear vehicle scope' })).toHaveCount(0)
})

for (const state of ['empty dataset', 'unmatched filter'] as const) {
  test(`wide DataTable centers its ${state} guidance in the visible scrollport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mountRuntimeFixture(
      page,
      '/components/data-table',
      fixture,
      `<section data-table-host style="margin:16px"><main id="style-contract-root" ${state === 'empty dataset' ? 'data-no-descriptors' : ''}></main></section>`,
    )
    const scroll = page.locator('[data-grid-scroll]')
    const populated = page.getByRole('button', { name: 'Battery temperature' })
    const filter = page.getByRole('textbox', { name: 'Message contains' })
    if (state === 'unmatched filter') {
      await expect(populated).toBeInViewport()
      await scroll.evaluate((el) => {
        el.scrollLeft = el.scrollWidth
      })
      await expect(page.getByRole('cell', { name: 'No', exact: true })).toBeInViewport()
      await filter.fill('no matching descriptor')
    }
    const sourceCopy = ['No descriptor fields', 'No fields are present for this message.']
    const content = state === 'empty dataset' ? sourceCopy : ['No results']
    if (state === 'unmatched filter') {
      for (const text of sourceCopy) await expect(scroll.getByText(text)).toHaveCount(0)
    }
    const hostWidth = await page.locator('[data-table-host]').evaluate((el) => el.clientWidth)
    for (const end of [false, true]) {
      const viewport = await scroll.evaluate((el, right) => {
        el.scrollLeft = right ? el.scrollWidth : 0
        const rect = el.getBoundingClientRect()
        return { left: rect.left, width: el.clientWidth, scrollLeft: el.scrollLeft }
      }, end)
      expect(viewport.width).toBe(hostWidth)
      if (end) expect(viewport.scrollLeft).toBeGreaterThan(0)
      for (const text of content) {
        const label = scroll.getByText(text, { exact: true })
        await expect(label).toBeVisible()
        const box = await label.boundingBox()
        if (!box) throw new Error('Missing rendered empty-state text')
        expect(box.x).toBeGreaterThanOrEqual(viewport.left)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.left + viewport.width)
        expect(Math.abs(box.x + box.width / 2 - viewport.left - viewport.width / 2)).toBeLessThan(1)
      }
    }
    if (state === 'unmatched filter') {
      await filter.fill('')
      await scroll.evaluate((el) => {
        el.scrollLeft = 0
      })
      await expect(populated).toBeInViewport()
    }
  })
}
