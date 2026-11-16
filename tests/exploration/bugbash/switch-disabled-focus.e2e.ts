import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'Disabled Switch is skipped by keyboard Tab navigation',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/switch')
    const example = screen.getByRole('region', 'Disabled')
    const code = example.getByRole('button', 'Code')
    const disabled = example.getByRole('switch')

    await code.press('Tab')
    await expect(disabled).not.toBeFocused()
  },
)
