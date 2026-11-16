import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Calendar preserves the single-day selection when switching modes',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/calendar')
    const preview = screen.getByRole('region', 'Playground')
    await screen.getByRole('combobox', 'Type').tap()
    await screen.getByRole('option', 'Single').tap()
    await expect(preview.getByRole('gridcell', /Today, .* selected/)).toHaveCount(1)
  },
)

test(
  'Calendar keeps partial ranges and cleared single dates independent through Shuffle and Reset',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/calendar')
    const preview = screen.getByRole('region', 'Playground')
    const chooseType = async (value: string) => {
      const control = screen.getByRole('combobox', 'Type')
      await expect(control).not.toBeExpanded()
      await control.tap()
      await expect(control).toBeExpanded()
      await screen.getByRole('option', value).tap()
      await expect(control).not.toBeExpanded()
      await expect(control).toContainText(value)
    }

    // Range starts empty; the first click records an unfinished range.
    await expect(preview.getByRole('gridcell', /selected/)).toHaveCount(0)
    await preview
      .getByRole('gridcell', /Today,/)
      .getByRole('button')
      .tap()
    await expect(preview.getByRole('gridcell', /Today, .* selected/)).toHaveCount(1)

    await chooseType('Single')
    await preview
      .getByRole('gridcell', /Today,/)
      .getByRole('button')
      .tap()
    await expect(preview.getByRole('gridcell', /selected/)).toHaveCount(0)
    await chooseType('Range')
    await expect(preview.getByRole('gridcell', /Today, .* selected/)).toHaveCount(1)
    await chooseType('Single')
    await expect(preview.getByRole('gridcell', /selected/)).toHaveCount(0)

    for (let index = 0; index < 8; index++) await screen.getByRole('button', 'Shuffle').tap()
    await screen.getByRole('button', 'Reset').tap()
    await chooseType('Range')
    await expect(preview.getByRole('gridcell', /Today, .* selected/)).toHaveCount(1)
    await chooseType('Single')
    await expect(preview.getByRole('gridcell', /selected/)).toHaveCount(0)
  },
)
