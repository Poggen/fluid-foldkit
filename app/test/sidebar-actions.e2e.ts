import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { defaults as sidebarDefaults } from '../src/playground/configs/sidebar'

const distinctTargets = async (buttons: Locator) => {
  await expect(buttons).toHaveCount(3)
  const boxes = await buttons.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    }),
  )
  for (const [index, box] of boxes.entries()) {
    expect(box.width).toBeGreaterThanOrEqual(20)
    expect(box.height).toBeGreaterThanOrEqual(20)
    const previous = boxes[index - 1]
    if (previous !== undefined) {
      expect(box.x).toBeGreaterThanOrEqual(previous.x + previous.width - 0.5)
      expect(Math.abs(box.y - previous.y)).toBeLessThan(1)
    }
  }
}

const shortcutOpacity = (button: Locator) =>
  button.locator('kbd').evaluate((element) => {
    let opacity = 1
    for (let node: Element | null = element; node !== null; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity)
    }
    return opacity
  })

for (const [side, size] of [
  ['left', 'default'],
  ['right', 'compact'],
] as const) {
  test(`Sidebar composed actions retain separate hit targets and owners (${side}, ${size})`, async ({
    page,
  }) => {
    const errors: Array<string> = []
    page.on('pageerror', (error) => errors.push(error.message))
    const props = encodeURIComponent(
      JSON.stringify({
        ...sidebarDefaults,
        side,
        l1Actions: 3,
        sectionActions: 3,
        headerActions: 2,
        footerActions: 2,
        footerStack: 'vertical',
      }),
    )
    await page.goto(`/components/sidebar?size=${size}&props=${props}`)
    const preview = page.getByRole('region', { name: 'Playground', exact: true })
    const header = preview.locator('[data-sidebar="header"]')
    const footer = preview.locator('[data-sidebar="footer"]')
    const newAction = header.getByRole('button', { name: /^New(?:\s|$)/u })
    await page.mouse.move(0, 0)
    for (const [action, label] of [
      [newAction, 'New'],
      [header.getByRole('button', { name: /^Invite(?:\s|$)/u }), 'Invite'],
      [footer.getByRole('button', { name: 'Settings', exact: true }), 'Settings'],
      [footer.getByRole('button', { name: 'Theme', exact: true }), 'Theme'],
    ] as const) {
      const box = await action.boundingBox()
      const icon = await action.locator('svg').first().boundingBox()
      if (box === null || icon === null) throw new Error('Labeled action and icon must be rendered')
      expect(box.width).toBeGreaterThan(100)
      expect(Math.abs(icon.y + icon.height / 2 - box.y - box.height / 2)).toBeLessThan(2)
      await action.click()
      await expect(preview.locator('[aria-live="polite"]')).toHaveText(label)
    }
    await page.mouse.move(0, 0)
    await expect.poll(() => shortcutOpacity(newAction)).toBe(0)
    await newAction.hover()
    await expect.poll(() => shortcutOpacity(newAction)).toBe(1)
    const threads = preview.getByRole('navigation', { name: 'Threads', exact: true })
    const row = threads.locator('[data-sidebar="menu-item"]').nth(1)
    const anchor = row.locator('[data-sidebar="menu-button"]')
    await expect(anchor).toHaveAttribute('data-active', 'false')
    await row.hover()
    const actions = row.locator('[data-sidebar="menu-action"]')
    await distinctTargets(actions)
    for (const name of ['Add', 'Rename']) {
      await row.getByRole('button', { name, exact: true }).click()
      await expect(preview.locator('[aria-live="polite"]')).toHaveText(name)
      await expect(anchor).toHaveAttribute('data-active', 'false')
    }
    await row.getByRole('button', { name: 'More options', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Duplicate', exact: true })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click()
    await expect(preview.locator('[aria-live="polite"]')).toHaveText('Menu item 2')
    await expect(anchor).toHaveAttribute('data-active', 'false')

    const group = preview.locator('[data-sidebar="group"]').first()
    const disclosure = group.locator('button[data-sidebar="group-label"]').first()
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    const groupActions = group.locator('[data-sidebar="group-action"]')
    await distinctTargets(groupActions)
    for (const action of await groupActions.all()) {
      await expect(action).toHaveCSS('width', '24px')
      await expect(action).toHaveCSS('height', '24px')
      await expect(action).toHaveCSS('z-index', 'auto')
      await expect(action).toHaveCSS('flex-shrink', '1')
      await expect(action).toHaveCSS('transition-duration', '0.08s')
      const properties = await action.evaluate((element) =>
        getComputedStyle(element)
          .transitionProperty.split(',')
          .map((property) => property.trim()),
      )
      expect(properties).toContain('color')
      expect(properties).toContain('background-color')
      expect(properties).not.toContain('opacity')
    }
    await group.getByRole('button', { name: 'Add item', exact: true }).click()
    await expect(preview.locator('[aria-live="polite"]')).toHaveText('Add item')
    await group.getByRole('button', { name: 'Section settings', exact: true }).click()
    await expect(preview.locator('[aria-live="polite"]')).toHaveText('Section settings')
    await groupActions.last().focus()
    await groupActions.last().press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Archive', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(groupActions.last()).toBeFocused()
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true')

    const nestedProps = encodeURIComponent(
      JSON.stringify({
        ...sidebarDefaults,
        side,
        l1Primary: 'menu',
        l1Children: true,
        l2Actions: 3,
        l2Badges: true,
      }),
    )
    await page.goto(`/components/sidebar?size=${size}&props=${nestedProps}`)
    const home = preview.getByRole('button', { name: 'Home', exact: true }).first()
    await home.click()
    await expect(home).toHaveAttribute('aria-expanded', 'true')
    const subRow = preview.locator('[data-sidebar="menu-sub-item"]').first()
    await subRow.hover()
    await distinctTargets(subRow.locator('[data-sidebar="menu-action"]'))
    await subRow.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(preview.locator('[aria-live="polite"]')).toHaveText('Add')
    await expect(home).toHaveAttribute('aria-expanded', 'true')
    for (const name of ['Settings', 'Theme']) {
      const control = preview
        .locator('[data-sidebar="footer"]')
        .getByRole('button', { name, exact: true })
      await expect(control).toHaveCSS('width', '24px')
      await expect(control).toHaveCSS('height', '24px')
    }
    expect(errors).toEqual([])
  })
}

test('Tooltip and Dropdown actions share one hover cluster without covering each other', async ({
  page,
}) => {
  await page.goto('/components/sidebar')
  const example = page.getByRole('region', { name: 'Actions & badges', exact: true })
  const row = example
    .locator('[data-sidebar="menu-item"]')
    .filter({
      has: page.getByRole('button', { name: 'Branch thread', exact: true }),
    })
    .first()
  await row.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  const actions = row.locator('[data-sidebar="menu-action"]')
  const cluster = row.locator('[data-sidebar="menu-actions"]')
  await expect(cluster).toHaveCSS('opacity', '0')
  await row.hover()
  await expect(cluster).toHaveCSS('opacity', '1')
  await distinctTargets(actions)
  const branch = row.getByRole('button', { name: 'Branch thread', exact: true })
  await branch.hover()
  await expect(branch).toHaveAttribute('aria-describedby', /\S/u)
  const tooltipId = await branch.getAttribute('aria-describedby')
  if (tooltipId === null) throw new Error('Branch action must describe its own tooltip')
  const tooltip = page.locator(`[id=${JSON.stringify(tooltipId)}]`)
  await expect(tooltip).toHaveRole('tooltip')
  await expect(tooltip).toHaveText('Branch thread')
  await expect(tooltip).toBeVisible()
  const menu = row.getByRole('button', { name: 'More options', exact: true })
  await menu.click()
  await page.mouse.move(0, 0)
  await expect(cluster).toHaveCSS('opacity', '1')
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(menu).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Rename', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
})

test('configured Sidebar scrolls its own navigation while retaining header and footer', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.goto(
    `/components/sidebar?props=${encodeURIComponent(
      JSON.stringify({
        ...sidebarDefaults,
        l1Primary: 'menu',
        l1Children: true,
        footerCallout: 'none',
      }),
    )}`,
  )
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const header = preview.locator('[data-sidebar="header"]')
  const footer = preview.locator('[data-sidebar="footer"]')
  const viewport = preview.locator('[data-slot="scroll-area-viewport"]').filter({
    has: page.getByRole('navigation', { name: 'Threads', exact: true }),
  })
  await preview.scrollIntoViewIfNeeded()
  const threads = preview.getByRole('navigation', { name: 'Threads', exact: true })
  const branches = threads
    .getByRole('button', { expanded: false })
    .and(threads.locator('button[aria-controls]:not([aria-haspopup])'))
  await expect(branches.first()).toBeVisible()
  while ((await branches.count()) > 0) {
    const controls = await branches.first().getAttribute('aria-controls')
    if (controls === null) throw new Error('Expected a branch with an owned panel')
    const branch = threads.locator(`button[aria-controls=${JSON.stringify(controls)}]`)
    await branch.click()
    await expect(branch).toHaveAttribute('aria-expanded', 'true')
  }
  await expect(viewport).toBeVisible()
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(0)
  const headerTop = await header.evaluate((element) => element.getBoundingClientRect().top)
  const footerTop = await footer.evaluate((element) => element.getBoundingClientRect().top)
  await viewport.hover()
  await page.mouse.wheel(0, 600)
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(
    headerTop,
    1,
  )
  expect(await footer.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(
    footerTop,
    1,
  )
  expect(errors).toEqual([])
})
