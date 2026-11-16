import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'hiding the eyedropper preserves independently configured color swatches',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/color-picker')
    const preview = screen.getByRole('region', 'Playground')
    const red = preview.getByRole('button', 'Red')
    await expect(red).toBeVisible()
    await screen.getByRole('switch', 'Hide eyedropper').check()
    await expect(preview.getByRole('button', 'Pick color from screen')).toHaveCount(0)
    await expect(red).toBeVisible()
    await expect(preview.getByRole('button', 'Rose')).toBeVisible()
  },
)
