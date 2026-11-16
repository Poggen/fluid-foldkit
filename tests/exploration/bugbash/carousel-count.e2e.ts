import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'CarouselDots keeps the selected slide in range when Count shrinks',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/carousel-dots')
    const playground = screen.getByRole('region', 'Playground')
    await screen.getByRole('switch', 'Autoplay').tap()
    const archive = playground.getByRole('button', 'Show Archive')
    await archive.tap()
    await expect(archive).toHaveAttribute('aria-current', 'true')

    await screen.getByRole('spinbutton', 'Count').fill('1')
    const inbox = playground.getByRole('button', 'Show Inbox')
    await expect(inbox).toHaveAttribute('aria-current', 'true')
  },
)
