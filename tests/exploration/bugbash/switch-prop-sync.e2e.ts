import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Switch playground Checked control follows preview toggles',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/switch')
    const preview = screen.getByRole('region', 'Playground')
    const notifications = preview.getByRole('switch', 'Notifications')
    const checked = screen.getByRole('switch', 'Checked')

    await expect(notifications).toBeChecked()
    await checked.uncheck()
    await expect(notifications).not.toBeChecked()

    await notifications.tap()
    await expect(notifications).toBeChecked()
    await expect(checked).toBeChecked()
  },
)
