import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'ColorPicker popover closes on Escape after committing a color field',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/color-picker')
    const example = screen.getByRole('region', 'Popover')
    const trigger = example.getByRole('button', /^Fill /)
    await trigger.tap()
    await expect(trigger).toBeExpanded()
    const hex = example.getByRole('textbox', 'Hex value')
    await hex.fill('35B87A')
    await hex.press('Enter')
    await expect(trigger).toHaveAccessibleName('Fill 35B87A')
    await browser.keyboard.press('Escape')
    await expect(trigger).not.toBeExpanded()
    await expect(trigger).toBeFocused()
  },
)

test(
  'Escape closes the nested format menu but keeps the color popover open',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/color-picker')
    const example = screen.getByRole('region', 'Popover')
    const trigger = example.getByRole('button', /^Fill /)
    await trigger.tap()
    const format = example.getByRole('button', 'HEX')
    await format.tap()
    await expect(format).toBeExpanded()
    await expect(example.getByRole('menuitemradio', 'RGB')).toBeVisible()
    await browser.keyboard.press('Escape')
    await expect(format).not.toBeExpanded()
    await expect(trigger).toBeExpanded()
  },
)
