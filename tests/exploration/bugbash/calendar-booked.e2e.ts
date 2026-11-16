import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Calendar authored booking example marks its booked nights',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/calendar')
    const booking = screen.getByRole('region', 'Booked and unavailable')
    await expect(booking.getByRole('grid')).toHaveCount(1)
    await expect
      .poll(() => browser.evaluate(() => document.querySelectorAll('[data-booked="true"]').length))
      .toBeGreaterThan(0)
    await booking.getByRole('button', 'Go to the Next Month').tap()
    await booking.getByRole('button', 'Go to the Previous Month').tap()
    await expect
      .poll(() => browser.evaluate(() => document.querySelectorAll('[data-booked="true"]').length))
      .toBeGreaterThan(0)
  },
)
