import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Checkbox playground shows its configured label beside the control',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/checkbox')
    const playground = screen.getByRole('region', 'Playground')
    await expect(playground.getByRole('checkbox', 'Notifications')).toBeChecked()

    const width = await browser.evaluate(() => {
      const section = document.querySelector('section[aria-label="Playground"]')

      if (section === null) {
        return 0
      }

      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
      let node: Node | null
      let widest = 0

      while ((node = walker.nextNode()) !== null) {
        if (node.textContent?.trim() === 'Notifications' && node.parentElement !== null) {
          widest = Math.max(widest, node.parentElement.getBoundingClientRect().width)
        }
      }

      return widest
    })

    expect(width).toBeGreaterThan(40)
  },
)
