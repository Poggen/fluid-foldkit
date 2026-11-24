import { expect, test } from '@playwright/test'

test('square photo tiles retain their geometry and focus outline after keyboard close', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox')
  for (const example of [
    { region: 'Photos app', trigger: 'Photo 1', dialog: 'Library photos' },
    { region: 'Photos app (RTL)', trigger: 'Photo 1', dialog: 'Library photos' },
    { region: 'Infinite scroll', trigger: 'Feed photo 1', dialog: 'Feed photos' },
  ]) {
    const trigger = page
      .getByRole('region', { name: example.region, exact: true })
      .getByRole('button', { name: example.trigger, exact: true })
    await expect(trigger).toHaveCSS('border-radius', '0px')
    await page.keyboard.press('Tab')
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveCSS('border-radius', '0px')
    await expect(trigger).toHaveCSS('outline-width', '2px')

    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: example.dialog, exact: true })
    await expect(dialog).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveCSS('border-radius', '0px')
    await expect(trigger).toHaveCSS('outline-width', '2px')
  }
})
