import { expect, type Page } from '@playwright/test'

/** Upstream bento-previews.tsx DataTablePreview: eight newest components, name-only search. */
export async function expectUpstreamHomeTable(page: Page) {
  const home = page.locator('[data-component="fluid/data-table"]')
  await home.scrollIntoViewIfNeeded()
  const rows = home.locator('tbody [data-grid-body-row]')
  await expect(rows).toHaveCount(8)
  const firstSelection = home.getByRole('checkbox', { name: 'Select row code-block', exact: true })
  await firstSelection.click()
  await expect(firstSelection).toBeChecked()
  await firstSelection.click()
  await expect(firstSelection).not.toBeChecked()
  await expect(home.getByRole('button', { name: /^(Undo|Redo)$/ })).toHaveCount(0)
  await expect(home).toContainText(/8\s*\/\s*37 rows/)
  await expect(home.locator('thead th[data-grid-column="added"]')).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  const pageSize = home.getByRole('combobox', { name: 'Rows per page', exact: true })
  await expect(pageSize.locator('option')).toHaveText(['8', '16', '32'])
  await pageSize.selectOption('16')
  await expect(rows).toHaveCount(16)
  await pageSize.selectOption('8')
  await expect(rows).toHaveCount(8)
  await expect(home.getByRole('button', { name: 'Columns', exact: true })).toBeVisible()
  await home.getByRole('button', { name: 'Search components', exact: true }).click()
  const search = home.getByRole('searchbox', { name: 'Search components', exact: true })
  await search.fill('Radix')
  await expect(rows).toHaveCount(0)
  await search.fill('CodeBlock')
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('td[data-grid-column="name"]')).toHaveText('CodeBlock')
}
