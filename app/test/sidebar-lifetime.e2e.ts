import { expect, test } from '@playwright/test'
import { defaults } from '../src/playground/configs/sidebar'

test('configured Sidebar retains same-page state and resets local search on route re-entry', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`/components/sidebar?props=${encodeURIComponent(JSON.stringify(defaults))}`)
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const controls = page.locator('#site-customizer')
  const state = controls.getByRole('combobox', { name: 'State', exact: true })
  const toggle = preview.getByRole('button', { name: 'Toggle sidebar', exact: true })
  const search = preview.getByRole('textbox', { name: 'Search threads', exact: true })
  await toggle.hover()
  const tooltip = page.getByRole('tooltip').filter({ hasText: 'Collapse sidebar' })
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('kbd')).toHaveText('[')
  await expect(toggle).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id')) ?? '')
  await expect(toggle).not.toHaveAttribute('title')
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await search.fill('sidebar')
  const viewport = preview
    .locator('[data-slot="scroll-area-viewport"]')
    .filter({ has: page.getByRole('navigation', { name: 'Threads', exact: true }) })
  await expect(viewport).toHaveCount(1)
  const retainedViewport = await viewport.elementHandle()
  if (retainedViewport === null) throw new Error('Missing sidebar scroll viewport')
  const retained = await search.elementHandle()
  if (retained === null) throw new Error('Missing configured Sidebar search')
  try {
    await toggle.click()
    await expect(state).toHaveText('Closed')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await controls.getByRole('spinbutton', { name: 'Width', exact: true }).fill('260')
    await expect(state).toHaveText('Closed')
    await controls.getByRole('combobox', { name: 'Header actions', exact: true }).click()
    const count = page.getByRole('option', { name: '2', exact: true })
    await count.click()
    await expect(count).toBeHidden()
    await expect(state).toHaveText('Closed')
    await toggle.click()
    await expect(state).toHaveText('Opened')
    await expect(search).toHaveValue('sidebar')

    await preview.getByRole('tab', { name: 'Code', exact: true }).click()
    expect(await retained.evaluate((element) => element.isConnected)).toBe(true)
    await expect(search).toBeHidden()
    await preview.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(search).toHaveValue('sidebar')
    expect(await search.evaluate((element, previous) => element === previous, retained)).toBe(true)
    expect(
      await viewport.evaluate((element, previous) => element === previous, retainedViewport),
    ).toBe(true)
    const header = preview.getByRole('navigation', { name: 'Header actions', exact: true })
    await header.getByRole('button', { name: /^Invite(?:\s|$)/u }).click()
    await expect(preview.locator('[aria-live="polite"]')).toHaveText('Invite')

    const navigation = page.locator('#site-navigation')
    await navigation.getByRole('link', { name: 'Showcase', exact: true }).click()
    await expect(page.locator('[data-reference-page]')).toHaveCount(0)
    expect(await retained.evaluate((element) => element.isConnected)).toBe(false)
    await navigation.getByRole('link', { name: 'Sidebar', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(state).toHaveText('Opened')
    const threads = preview.getByRole('navigation', { name: 'Threads', exact: true })
    const first = threads
      .getByRole('button', { name: 'Sidebar component height in demo', exact: true })
      .first()
    const second = threads
      .getByRole('button', { name: 'Sidebar component creation', exact: true })
      .first()
    await first.press('Home')
    await first.press('ArrowDown')
    await expect(second).toBeFocused()
    expect(errors).toEqual([])
  } finally {
    await retained.dispose()
    await retainedViewport.dispose()
  }
})
