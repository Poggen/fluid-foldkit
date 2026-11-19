import { expect, test, type Locator } from '@playwright/test'

const transparent = 'rgba(0, 0, 0, 0)'
const fill = (control: Locator) => control.evaluate((el) => getComputedStyle(el).backgroundColor)

test('inset sidebar items own current, hover and keyboard focus feedback', async ({ page }) => {
  await page.goto('/components/sidebar')
  const nav = page.locator('#docs-sidebar-inset-nav-workspace-hover').getByRole('navigation')
  const items = nav.getByRole('button')
  const chat = items.first()
  const next = items.nth(1)
  await expect(chat).toHaveAttribute('aria-pressed', 'true')
  await next.hover()
  await expect.poll(() => fill(next)).not.toBe(transparent)
  await expect.poll(() => fill(chat)).not.toBe(transparent)
  await expect(nav.locator('.absolute.bg-active')).toHaveCount(0)
  await expect(nav.locator('[data-slot="fluid-hover-highlight"]:visible')).toHaveCount(0)
  await next.click()
  await expect(next).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(0, 0)
  await next.press('ArrowUp')
  await expect(chat).toBeFocused()
  await expect(chat).toHaveCSS('box-shadow', /2px/)
  await page.keyboard.press('Enter')
  await expect(chat).toHaveAttribute('aria-pressed', 'true')
  await expect(next).toHaveAttribute('aria-pressed', 'false')
})

test('read-only row links act independently with pointer and keyboard', async ({ page }) => {
  await page.goto('/components/data-table')
  const section = page.getByRole('region', { name: 'Read-only directory' })
  const row = section.getByRole('row').filter({ hasText: 'Forms' })
  const first = row.getByRole('link', { name: 'Checkbox' })
  const second = row.getByRole('link', { name: 'Switch' })
  for (const [hovered, idle] of [
    [first, second],
    [second, first],
  ] as const) {
    await hovered.hover()
    await expect(hovered).toHaveCSS('text-decoration-line', 'underline')
    await expect(idle).toHaveCSS('text-decoration-line', 'none')
  }
  await row.getByRole('cell', { name: 'Forms', exact: true }).hover()
  await expect(first).toHaveCSS('text-decoration-line', 'none')
  await expect(second).toHaveCSS('text-decoration-line', 'none')
  await expect(section.locator('.table-row-highlight:visible')).toHaveCount(0)
  await first.focus()
  await page.keyboard.press('Tab')
  await expect(second).toBeFocused()
  await expect(second).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/components\/switch(?:[?#]|$)/)
  await page.goBack()
  await first.click()
  await expect(page).toHaveURL(/\/components\/checkbox(?:[?#]|$)/)
})

test('fixed headers reveal and activate only their own controls', async ({ page }) => {
  await page.goto('/components/data-table')
  const section = page.getByRole('region', { name: 'Read-only directory' })
  const header = section
    .getByRole('columnheader')
    .filter({ has: page.getByRole('button', { name: 'Group', exact: true }) })
  const label = header.getByRole('button', { name: 'Group', exact: true })
  const options = header.getByRole('button', { name: 'Group options' })
  const sibling = section.getByRole('button', { name: 'Related options' })
  await label.hover()
  await expect.poll(() => fill(label)).not.toBe(transparent)
  await expect.poll(() => fill(options)).toBe(transparent)
  await options.hover()
  await expect.poll(() => fill(options)).not.toBe(transparent)
  await expect.poll(() => fill(label)).toBe(transparent)
  await expect(sibling).toHaveCSS('opacity', '0')
  await options.click()
  await expect(page.getByRole('menuitem', { name: 'Sort ascending' })).toBeVisible()
  await page.keyboard.press('Escape')
  await label.focus()
  await page.mouse.move(0, 0)
  await page.keyboard.press('Tab')
  await expect(options).toBeFocused()
  await expect(options).toHaveCSS('opacity', '1')
  await expect(options).toHaveCSS('box-shadow', /2px/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Sort ascending' })).toBeVisible()
})

test('Tab leaves a portaled Columns menu in the trigger’s natural tab order', async ({ page }) => {
  await page.goto('/components/data-table')
  const columns = page
    .getByRole('region', { name: 'Saved views', exact: true })
    .getByRole('button', { name: 'Columns', exact: true })
  for (const key of ['Tab', 'Shift+Tab']) {
    await columns.focus()
    await page.keyboard.press(key)
    const neighbor = await page.evaluateHandle(() => document.activeElement)
    await columns.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitemcheckbox', { name: 'Name', exact: true })).toBeFocused()
    await page.keyboard.press(key)
    await expect
      .poll(() => neighbor.evaluate((el) => el !== document.body && el === document.activeElement))
      .toBe(true)
    await neighbor.dispose()
  }
})
