import { expect, test } from '@playwright/test'

test('an outside click dismisses the Invoices column menu and lets it reopen', async ({ page }) => {
  await page.goto('/components/data-table')
  const invoices = page.getByRole('region', { name: 'Filters', exact: true })
  const status = invoices.getByRole('button', { name: 'Status', exact: true })
  const sort = page.getByRole('menuitem', { name: 'Sort ascending', exact: true })
  await status.click()
  await expect(sort).toBeVisible()
  await invoices.getByRole('heading', { name: 'Invoices' }).click()
  await expect(sort).toHaveCount(0)
  await status.click()
  await sort.click()
  await expect(invoices.getByRole('columnheader', { name: /Status/ })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await expect(sort).toHaveCount(0)
})

test('the catalogue hover covers the same row across scrolling and pinned cells', async ({
  page,
}) => {
  await page.goto('/components/data-table?theme=dark')
  const grid = page.locator('#preview-data-table')
  for (const id of ['banner', 'badge']) {
    const row = grid.locator(`tr[data-grid-row="${id}"]`)
    await row.locator('[data-grid-column="primitives"]').hover()
    await expect(row).toHaveClass(/is-active/)
    await expect
      .poll(() =>
        row.evaluate((element) => {
          const fill = element
            .closest('table')
            ?.parentElement?.querySelector('.table-row-highlight:last-child')
          const pins = Array.from(element.querySelectorAll('[data-grid-pin-hover]'))
          const rowBox = element.getBoundingClientRect()
          const covers = (layer: Element) => {
            const box = layer.getBoundingClientRect()
            return (
              Number(getComputedStyle(layer).opacity) > 0.95 &&
              Math.abs(box.top - rowBox.top) < 1 &&
              Math.abs(box.height - rowBox.height) < 1
            )
          }
          return !!fill && covers(fill) && pins.length > 0 && pins.every(covers)
        }),
      )
      .toBe(true)
  }
})
