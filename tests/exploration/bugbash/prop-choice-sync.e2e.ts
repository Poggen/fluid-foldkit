import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Playground choice controls acknowledge pointer selections after Reset',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/calendar')
    await screen.getByRole('button', 'Reset').tap()
    const type = screen.getByRole('combobox', 'Type')
    for (const value of ['Single', 'Range', 'Single']) {
      await type.tap()
      await screen.getByRole('option', value).tap()
      await expect(type).not.toBeExpanded()
      await expect(type).toContainText(value)
    }
  },
)

test(
  'Playground numeric choices update the rendered month count after Shuffle and Reset',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/calendar')
    for (let index = 0; index < 8; index++) await screen.getByRole('button', 'Shuffle').tap()
    await screen.getByRole('button', 'Reset').tap()
    const months = screen.getByRole('combobox', 'Number of months')
    const preview = screen.getByRole('region', 'Playground')
    for (const value of [1, 2, 1]) {
      await months.tap()
      await screen.getByRole('option', String(value), { exact: true }).tap()
      await expect(months).not.toBeExpanded()
      await expect(months).toContainText(String(value))
      await expect(preview.getByRole('grid')).toHaveCount(value)
    }
  },
)

test(
  'Playground choices acknowledge keyboard selections after Reset',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/calendar')
    await screen.getByRole('button', 'Reset').tap()
    const type = screen.getByRole('combobox', 'Type')
    for (const value of ['Single', 'Range', 'Single']) {
      await type.press('Enter')
      await expect(type).toBeExpanded()
      await browser.keyboard.press(value === 'Single' ? 'Home' : 'End')
      await browser.keyboard.press('Enter')
      await expect(type).not.toBeExpanded()
      await expect(type).toContainText(value)
    }
  },
)
