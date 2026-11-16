import { expect, test } from '@playwright/test'

test('site search follows sidebar spacing and supports pointer, keyboard and empty results', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Search', exact: true })
  await expect(trigger).toBeVisible({ timeout: 2500 })
  await expect(trigger).toHaveCSS('height', '32px')
  const searchBox = await trigger.boundingBox()
  const firstLinkBox = await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Showcase', exact: true })
    .boundingBox()
  expect(searchBox).not.toBeNull()
  expect(firstLinkBox).not.toBeNull()
  if (!searchBox || !firstLinkBox) throw new Error('Expected visible sidebar controls')
  expect(firstLinkBox.y - (searchBox.y + searchBox.height)).toBe(16)
  expect(searchBox.width).toBe(firstLinkBox.width)
  const caps = trigger.locator('..').locator(':scope > [data-sidebar=menu-badge] > kbd')
  await expect(caps).toHaveCount(2)
  for (const cap of await caps.all()) {
    await expect(cap).toHaveCSS('height', '18px')
    await expect(cap).toHaveCSS('border-radius', '2px')
  }
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Site menu', exact: true })
  const query = dialog.getByRole('combobox')
  await expect(query).toBeFocused()
  await expect(
    dialog.getByRole('option', { name: 'Showcase', exact: true }).locator('svg'),
  ).toBeVisible()
  const footer = dialog.locator('[data-slot=command-menu-footer]')
  await expect(footer).toHaveCSS('height', '40px')
  await expect(footer.getByText('Select', { exact: true })).toBeVisible()
  await expect(footer.getByText('Close', { exact: true })).toBeVisible()
  await expect(footer.getByText('Open Showcase', { exact: true })).toBeVisible()
  await query.fill('calendar')
  await expect(query).toHaveValue('calendar')
  await expect(footer.getByText('Open Calendar', { exact: true })).toBeVisible()
  await dialog.getByRole('option', { name: 'Calendar', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/calendar$/)
  await expect(dialog).toBeHidden()
  await page.keyboard.press('ControlOrMeta+k')
  await expect(query).toBeFocused()
  await query.fill('no such component anywhere')
  await expect(dialog).toContainText('No results found.')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await trigger.focus()
  await page.keyboard.press('ControlOrMeta+k')
  await expect(query).toHaveValue('')
  await query.fill('scatter')
  await expect(query).toHaveValue('scatter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/charts\/scatter$/)
})

test('accent choices display names and matching source color tiles', async ({ page }) => {
  await page.goto('/?accent=violet')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const accent = page.getByRole('combobox', { name: 'Accent', exact: true })
  await expect(accent).toContainText('Violet', { timeout: 2500 })
  const tile = accent.locator('span.inline-block.relative.shrink-0.overflow-hidden')
  await expect(tile).toBeVisible()
  await accent.click()
  const blue = page.getByRole('option', { name: 'Blue', exact: true })
  await expect(blue.locator('span.inline-block.relative.shrink-0.overflow-hidden')).toBeVisible()
  await blue.click()
  await expect(accent).toContainText('Blue')
  await expect(tile.locator(':scope > span')).toHaveCSS('background-color', 'rgb(107, 151, 255)')
  await expect(tile).toHaveCSS('border-radius', '1px')
  await expect(tile).toHaveCSS('width', '20px')
  await expect(tile).toHaveCSS('height', '20px')
  await expect(page).toHaveURL('http://127.0.0.1:5382/')
  await page.reload()
  await expect(accent).toContainText('Blue')
  await expect(tile).toBeVisible()
})

test('showcase cards and their contents reveal with scroll and honor reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const frame = page.locator('#fluid-checkbox')
  const opacity = () => frame.evaluate((element) => Number(getComputedStyle(element).opacity))
  await expect.poll(opacity, { timeout: 2500 }).toBeLessThan(0.01)
  const top = await frame.evaluate((element) => element.getBoundingClientRect().top + scrollY)
  await page.evaluate(
    (y) => window.scrollTo({ top: y - innerHeight + 20, behavior: 'instant' }),
    top,
  )
  await expect.poll(opacity).toBeGreaterThan(0.05)
  await expect.poll(opacity).toBeLessThan(0.95)
  const content = frame.locator('.preview-content')
  await expect
    .poll(() => content.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeLessThan(0.05)
  const contentTop = await content.evaluate(
    (element) => element.getBoundingClientRect().top + scrollY,
  )
  await page.evaluate(
    (y) => window.scrollTo({ top: y - innerHeight + 140, behavior: 'instant' }),
    contentTop,
  )
  await expect.poll(opacity).toBeGreaterThan(0.99)
  await expect(content).toHaveCSS('opacity', '1')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(opacity).toBeLessThan(0.01)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(opacity).toBeGreaterThan(0.99)
  await expect(frame).toHaveCSS('transform', 'none')
})

test('site menu filters settings without stealing input focus and applies owned settings and actions', async ({
  page,
}) => {
  await page.goto('/components/button?theme=light&accent=green')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  await page
    .locator('#site-navigation')
    .getByRole('button', { name: 'Search', exact: true })
    .click()
  const menu = page.getByRole('dialog').filter({ has: page.getByRole('combobox') })
  const query = menu.getByRole('combobox')
  await expect(menu.getByRole('tab')).toHaveCount(4)
  for (const name of ['All', 'Pages', 'Settings', 'Actions'])
    await expect(menu.getByRole('tab', { name, exact: true })).toBeVisible()
  await query.fill('rounded')
  await menu.getByRole('tab', { name: 'Settings', exact: true }).click()
  await expect(query).toBeFocused()
  await expect(query).toHaveValue('rounded')
  await expect(menu.getByRole('option', { name: 'Radius: Rounded', exact: true })).toBeVisible()
  await query.press('Enter')
  await expect(menu).toBeHidden()
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'rounded')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')).toBe('green')
  await expect.poll(() => new URL(page.url()).searchParams.get('theme')).toBe('light')

  await page.keyboard.press('ControlOrMeta+k')
  await expect(query).toBeFocused()
  await expect(query).toHaveValue('')
  await menu.getByRole('tab', { name: 'Pages', exact: true }).click()
  await query.fill('breadcrumb')
  await query.press('Enter')
  await expect.poll(() => new URL(page.url()).pathname).toBe('/components/breadcrumb')
  await expect.poll(() => new URL(page.url()).searchParams.get('shape')).toBe('rounded')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')).toBe('green')

  await page.keyboard.press('ControlOrMeta+k')
  await expect(query).toBeFocused()
  await menu.getByRole('tab', { name: 'Actions', exact: true }).click()
  await query.fill('reset')
  await expect(menu.getByRole('option', { name: 'Reset settings', exact: true })).toBeVisible()
  await query.press('Enter')
  await expect(menu).toBeHidden()
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'sharp')
  for (const key of ['theme', 'accent', 'font', 'shape', 'size', 'hover'])
    await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBeNull()
})
