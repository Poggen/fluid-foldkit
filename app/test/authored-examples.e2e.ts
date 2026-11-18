import { expect, test } from '@playwright/test'

test('authored drafts survive presentation edits and Code/Preview', async ({ page }) => {
  await page.goto('/components/input')
  const basic = page.getByRole('region', { name: 'Basic', exact: true })
  const draft = basic.getByRole('textbox', { name: 'Email', exact: true })
  await draft.fill('An unfinished authored draft')
  await draft.evaluate((node) => node.setAttribute('data-draft-owner', 'retained'))
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Radius', exact: true })
    .click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await basic.getByRole('tab', { name: 'Code', exact: true }).click()
  await basic.getByRole('tab', { name: 'Preview', exact: true }).click()
  await expect(draft).toHaveValue('An unfinished authored draft')
  await expect(draft).toHaveAttribute('data-draft-owner', 'retained')
})

test('queued chat retains its frame, transcript and draft through live presentation changes', async ({
  page,
}) => {
  await page.goto('/components/input-message')
  const queue = page.getByRole('region', { name: 'Queued messages', exact: true })
  await expect(
    queue.getByText('Help me polish the dashboard design', { exact: true }),
  ).toBeVisible()
  const composer = queue.getByRole('textbox', { name: 'Queued messages message', exact: true })
  await composer.fill('Keep this while another reply streams')
  await composer.evaluate((node) => node.setAttribute('data-composer-owner', 'retained'))
  const frame = queue.locator('[data-demo-transcript]').locator('..')
  expect(await frame.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(380)
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Radius', exact: true })
    .click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await queue.getByRole('tab', { name: 'Code', exact: true }).click()
  await queue.getByRole('tab', { name: 'Preview', exact: true }).click()
  await expect(composer).toHaveValue('Keep this while another reply streams')
  await expect(composer).toHaveAttribute('data-composer-owner', 'retained')
  await expect(
    queue.getByText('Help me polish the dashboard design', { exact: true }),
  ).toBeVisible()
  const boxes = await frame.evaluate((node) => ({
    frame: node.getBoundingClientRect().toJSON(),
    composer: node.querySelector('[data-demo-composer]')?.getBoundingClientRect().toJSON(),
  }))
  expect(boxes.composer?.bottom).toBeCloseTo(boxes.frame.bottom, 0)
})

test('authored menus preserve the query and keyboard behavior through live appearance edits', async ({
  page,
}) => {
  await page.goto('/components/command-menu')
  const basic = page.getByRole('region', { name: 'Basic', exact: true })
  const query = basic.getByRole('combobox')
  await query.fill('dark')
  await expect(basic.getByRole('option', { name: /Toggle dark mode/ })).toBeVisible()
  await query.evaluate((node) => node.setAttribute('data-menu-owner', 'retained'))
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Radius', exact: true })
    .click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect(query).toHaveValue('dark')
  await expect(query).toHaveAttribute('data-menu-owner', 'retained')
  await query.press('ArrowDown')
  await query.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Ran “Toggle dark mode”' })).toHaveText(
    'Ran “Toggle dark mode”',
  )
})

test('Bklit loading and pulse controls update the same chart owners', async ({ page }) => {
  await page.goto('/charts/line')
  const loading = page
    .locator('section[aria-label="Examples"]')
    .getByText('Loading state', { exact: true })
    .locator('..')
  const svg = loading.locator('svg[role="img"]').first()
  const originalSvg = await svg.evaluateHandle((node) => node)
  await loading.getByRole('button', { name: 'Load data', exact: true }).click()
  await expect(loading.getByRole('button', { name: 'Show loading', exact: true })).toBeVisible()
  await loading.getByRole('tab', { name: 'Code', exact: true }).click()
  await loading.getByRole('tab', { name: 'Preview', exact: true }).click()
  expect(await svg.evaluate((node, original) => node === original, originalSvg)).toBe(true)
  await originalSvg.dispose()
  await page.goto('/charts/bar')
  const pulse = page.getByRole('region', { name: 'Pulse', exact: true })
  const loadingBar = page
    .locator('section[aria-label="Examples"]')
    .getByText('Loading state', { exact: true })
    .locator('..')
  await expect(loadingBar.locator('[data-bkm-native-chart]')).toHaveCount(1)
  await expect(pulse.locator('[data-bkm-native-chart]')).toHaveCount(1)
  const chartIds = await page
    .locator('[data-bkm-native-chart]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-bkm-native-chart')))
  expect(chartIds.length).toBeGreaterThanOrEqual(2)
  expect(chartIds.every((id) => id !== null && id.length > 0)).toBe(true)
  expect(new Set(chartIds).size).toBe(chartIds.length)
  const pulseSvg = pulse.locator('svg[role="img"]').first()
  const originalPulse = await pulseSvg.evaluateHandle((node) => node)
  await pulse.getByRole('button', { name: 'Pause pulse', exact: true }).click()
  await expect(pulse.getByRole('button', { name: 'Play pulse', exact: true })).toBeVisible()
  expect(await pulseSvg.evaluate((node, original) => node === original, originalPulse)).toBe(true)
  await originalPulse.dispose()
})

test('authored Sidebar fits its footer inside the example frame', async ({ page }) => {
  await page.goto('/components/sidebar')
  const layout = page.getByRole('region', { name: 'Layouts', exact: true })
  const sidebar = layout.locator('[data-slot="sidebar"]')
  const frame = layout.locator('.authored-preview')
  const user = layout.getByRole('button', { name: 'Open user menu' })
  await expect(user).toBeVisible()
  const shellBox = await sidebar.boundingBox()
  const frameBox = await frame.boundingBox()
  const userBox = await user.boundingBox()
  expect(shellBox?.height).toBe(640)
  expect(userBox!.y + userBox!.height).toBeLessThan(frameBox!.y + frameBox!.height)
})

test('authored previews retain the source alignment when reserving popover and question space', async ({
  page,
}) => {
  await page.goto('/components/date-picker')
  const date = page.getByRole('region', { name: 'Date', exact: true })
  const dateFrame = date.locator('.authored-preview')
  const frame = await dateFrame.boundingBox()
  const trigger = await date.getByRole('button', { name: 'Pick a date' }).boundingBox()
  // The original's inline trigger starts 3px below its 48px-padded wrapper baseline.
  expect(trigger!.y - frame!.y).toBeCloseTo(51, 0)
  await page.goto('/components/ask-user-questions')
  const question = page.getByRole('region', { name: 'Multiple questions', exact: true })
  const questionFrame = question.locator('.authored-preview')
  const geometry = await questionFrame.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    gap:
      node.getBoundingClientRect().bottom - node.firstElementChild!.getBoundingClientRect().bottom,
  }))
  expect(geometry.height).toBeGreaterThanOrEqual(560)
  expect(geometry.gap).toBeCloseTo(48, 0)
})

test('Gauge foreground and inactive track follow the nearest light or dark theme', async ({
  page,
}) => {
  for (const theme of ['light', 'dark']) {
    await page.goto(`/charts/gauge?theme=${theme}`)
    const variants = page.getByRole('region', { name: 'Gauge variants', exact: true })
    const value = variants.locator('.ts-bkm-center-stat-value')
    await expect(value).toBeVisible()
    const colors = await value.evaluate((node) => ({
      actual: getComputedStyle(node).color,
      foreground: getComputedStyle(document.querySelector('.site')!).color,
      border: getComputedStyle(node).getPropertyValue('--bkm-border').trim(),
      themeBorder: getComputedStyle(document.querySelector('.site')!)
        .getPropertyValue('--border')
        .trim(),
    }))
    expect(colors.actual).toBe(colors.foreground)
    expect(colors.border).toBe(colors.themeBorder)
  }
})
