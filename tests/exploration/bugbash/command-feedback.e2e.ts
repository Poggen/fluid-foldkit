import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'CommandMenu selections show visible action feedback',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/command-menu')
    const basic = screen.getByRole('region', 'Basic')
    await basic.getByRole('option', 'New file').tap()

    await expect
      .poll(() =>
        browser.evaluate(() =>
          [...document.querySelectorAll('[role="status"]')].some((node) => {
            if (!node.textContent?.includes('Ran “New file”')) return false
            const rect = node.getBoundingClientRect()
            const style = getComputedStyle(node)
            return (
              rect.width > 80 &&
              rect.height >= 24 &&
              rect.bottom > window.innerHeight - 100 &&
              rect.bottom < window.innerHeight - 8 &&
              Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) < 100 &&
              style.visibility === 'visible'
            )
          }),
        ),
      )
      .toBe(true)
  },
)
