import { expect, test } from '@playwright/test'

test('DataTable combines range, date, text and option filters and restores the matching rows', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const example = page.getByRole('region', { name: 'Filters', exact: true })
  const rows = example.locator('tbody tr[data-grid-row]')
  const cell = (column: string) => rows.locator('td[data-grid-column="' + column + '"]')
  await expect(cell('id').first()).toBeVisible()
  const original = await cell('id').allTextContents()
  const firstInvoice = original[0]!
  const due = example.getByRole('combobox', { name: 'Add a filter' })
  await example.getByRole('spinbutton', { name: 'Amount min' }).fill('999999')
  await expect(example.getByRole('cell', { name: 'No results', exact: true })).toBeVisible()
  await example.getByRole('spinbutton', { name: 'Amount min' }).fill('')
  await expect(cell('id')).toHaveText(original)
  await due.selectOption('due')
  await example.getByRole('combobox', { name: 'Due operator' }).selectOption('after')
  await example.getByLabel('Due from', { exact: true }).fill('2099-01-01')
  await expect(example.getByRole('cell', { name: 'No results', exact: true })).toBeVisible()
  await example.getByRole('button', { name: 'Remove Due filter' }).click()
  await due.selectOption('id')
  await example.getByRole('combobox', { name: 'Invoice operator' }).selectOption('is')
  await example.getByRole('textbox', { name: 'Invoice is', exact: true }).fill(firstInvoice)
  await expect(cell('id')).toHaveText([firstInvoice])
  await example.getByRole('button', { name: 'Remove Invoice filter' }).click()
  await example.getByLabel('Status values').click()
  await example.getByRole('checkbox', { name: 'Open', exact: true }).uncheck()
  await expect(cell('status').first()).toBeVisible()
  expect(new Set(await cell('status').allTextContents())).toEqual(new Set(['Paid']))
  await example.getByRole('checkbox', { name: 'Open', exact: true }).check()
  await expect(cell('id')).toHaveText(original)
})
