import { expect, test } from '@playwright/test'

for (const example of [
  { slug: 'banner', section: 'Fixed', action: 'Replay', tooltip: 'Replay animation' },
  {
    slug: 'ask-user-questions',
    section: 'Multiple questions',
    action: 'Replay',
    tooltip: 'Replay',
  },
  { slug: 'input-message', section: 'Queued messages', action: 'Resume', tooltip: 'Resume' },
]) {
  test(`${example.slug} header action exposes a dismissible native tooltip and retains activation`, async ({
    page,
  }) => {
    await page.goto(`/components/${example.slug}`)
    const section = page.getByRole('region', { name: example.section, exact: true })
    const action = section.locator('.reference-toolbar').getByRole('button', {
      name: example.action,
      exact: true,
    })
    const tooltip = page.getByRole('tooltip', { name: example.tooltip, exact: true })
    await section.scrollIntoViewIfNeeded()
    if (example.slug === 'banner') {
      await section.getByRole('button', { name: 'Dismiss', exact: true }).click()
      await expect(
        section.getByText('Registry maintenance tonight at 22:00 UTC', { exact: true }),
      ).toBeHidden()
    } else if (example.slug === 'ask-user-questions') {
      await section.getByRole('radio', { name: /Designer/u }).click()
      await expect(section.getByText('Which tool do you use most?', { exact: true })).toBeVisible()
    }
    await action.hover()
    await expect(tooltip).toBeVisible()
    expect(await action.getAttribute('aria-describedby')).toBe(await tooltip.getAttribute('id'))
    await action.press('Escape')
    await expect(tooltip).toBeHidden()
    await page.mouse.move(0, 0)
    await action.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(action).toBeFocused()
    await expect(tooltip).toBeVisible()
    await action.press('Enter')
    await expect(tooltip).toBeHidden()
    if (example.slug === 'input-message') {
      await expect(section.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    } else if (example.slug === 'ask-user-questions') {
      await expect(section.getByText("What's your role?", { exact: true })).toBeVisible()
    } else {
      await expect(
        section.getByText('Registry maintenance tonight at 22:00 UTC', { exact: true }),
      ).toBeVisible()
    }
  })
}
