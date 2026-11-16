import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Legend progress controls reveal progress and percentages for the showcased data',
  { tags: ['bugbash', 'charts'] },
  async ({ app, screen }) => {
    await app.open('/charts/legend')
    const preview = screen.getByRole('region', 'Playground')
    await expect(preview.getByRole('button', 'Design', { exact: false })).toBeVisible()
    await expect(preview.getByRole('progressbar')).toHaveCount(0)
    await screen.getByRole('switch', 'Show progress').check()
    await expect(preview.getByRole('progressbar')).toHaveCount(3)
    await screen.getByRole('switch', 'Show percentage').check()
    await expect(preview.getByRole('button', 'Design', { exact: false })).toContainText('84%')
  },
)
