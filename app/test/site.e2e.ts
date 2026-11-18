import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { chartPages, componentPages, fluidPages } from '../../lib/catalogue'

const live = (page: Page) => expect(page.locator('[data-live-previews="true"]')).toBeVisible()

test.describe('server documents', () => {
  test.use({ javaScriptEnabled: false })
  test('renders the shell and every component card without JavaScript', async ({
    page,
    request,
  }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { name: 'Fluid Functionalism', exact: true }),
    ).toBeVisible()
    await expect(page.locator('[data-component^="fluid/"]')).toHaveCount(fluidPages.length)
    await expect(page.locator('[data-component^="charts/"]')).toHaveCount(chartPages.length)
    await expect(
      page.locator('#site-navigation').getByRole('link', { name: 'Card', exact: true }),
    ).toHaveAttribute('href', '/components/card')
    await expect(page.locator('#site-customizer')).toContainText('Make them yours')
    expect((await page.locator('main').boundingBox())?.width).toBeGreaterThan(500)
    expect((await request.get('/not-a-page')).status()).toBe(404)
    expect((await request.get('/r/fluid/registry.json')).status()).toBe(200)
    expect((await request.get('/r/charts/registry.json')).status()).toBe(200)
  })
  test('renders documentation and a deep component URL directly', async ({ page }) => {
    await page.goto('/installation')
    await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible()
    await expect(page.locator('main')).toContainText('@bklit-foldkit')
    await page.goto('/components/calendar?theme=dark&shape=rounded')
    await expect(
      page.getByRole('heading', { name: 'Calendar', exact: true, level: 1 }),
    ).toBeVisible()
    await expect(page.locator('[data-reference-page]')).toHaveAttribute(
      'data-reference-page',
      'fluid/calendar',
    )
    await expect(page.locator('.reference-preview')).toBeAttached()
    await expect(page.locator('.site')).toHaveClass(/dark/)
  })
})

test('hydrates the existing shell and retains focus on the search trigger', async ({ page }) => {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/assets/*.js', async (route) => {
    await gate
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'commit' })
  const root = await page.locator('.site').elementHandle()
  expect(root).not.toBeNull()
  await page.getByRole('button', { name: 'Search', exact: true }).focus()
  release()
  await live(page)
  expect(await root?.evaluate((element) => element === document.querySelector('.site'))).toBe(true)
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeFocused()
})

test('runs live previews and navigates through the shared document shell', async ({ page }) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await live(page)
  await expect(page.locator('[data-component]')).toHaveCount(componentPages.length)
  const composer = page.locator('[data-component="fluid/input-message"]').getByRole('textbox')
  expect((await composer.boundingBox())?.width).toBeGreaterThan(400)
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('14px "Inter Variable"')))
    .toBe(true)
  const toggle = page
    .locator('[data-component="fluid/switch"]')
    .getByRole('switch', { name: 'Notifications', exact: true })
  await toggle.scrollIntoViewIfNeeded()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Accordion', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Accordion', exact: true, level: 1 }),
  ).toBeVisible()
  const example = page.locator('.reference-preview')
  const first = example.getByRole('button', { name: 'What is Fluid Functionalism?' })
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(example).toContainText('motion is information, not decoration')
  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Showcase', exact: true })
    .click()
  await live(page)
  await page.locator('[data-component="charts/line"]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-component="charts/line"] svg').first()).toBeAttached()
  await page.locator('[data-component="charts/sankey"]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-component="charts/sankey"] svg').first()).toBeAttached()
  expect(errors).toEqual([])
})

test('customizes the real previews and restores preferences from the URL', async ({ page }) => {
  await page.goto('/')
  await live(page)
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('.site')).toHaveClass(/dark/)
  await expect(page).toHaveURL(/theme=dark/)
  await page.getByRole('combobox', { name: 'Radius', exact: true }).click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'rounded')
  await page.getByRole('combobox', { name: 'Size', exact: true }).click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await expect(page.locator('.site')).toHaveAttribute('data-size', 'compact')
  await page.getByRole('combobox', { name: 'Hover', exact: true }).click()
  await page.getByRole('option', { name: 'Standard', exact: true }).click()
  await expect(page).toHaveURL(/hover=standard/)
  await page.reload()
  await live(page)
  await expect(page.locator('.site')).toHaveClass(/dark/)
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'rounded')
  await expect(page.getByRole('combobox', { name: 'Size', exact: true })).toContainText('Compact')
  await page.getByRole('button', { name: 'Reset customization', exact: true }).click()
  await expect(page.locator('.site')).toHaveClass(/light/)
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'sharp')
  await expect(page.getByRole('combobox', { name: 'Size', exact: true })).toContainText('Default')
  await expect(page).toHaveURL('/')
})

test('uses native modal navigation and customization on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await live(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(
    page.getByRole('button', { name: 'Pages', exact: true }).locator('svg'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Pages', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Pages', exact: true })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('combobox', { name: 'Theme', exact: true })).toBeFocused()
  await navigation.getByRole('button', { name: 'Search', exact: true }).click()
  const search = page.getByRole('dialog', { name: 'Site menu', exact: true })
  await expect(search.getByRole('combobox')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).toBeHidden()
  await expect(navigation.getByRole('button', { name: 'Search', exact: true })).toBeFocused()
  await navigation.getByRole('link', { name: 'Introduction', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Introduction', level: 1, exact: true }),
  ).toBeVisible()
  await expect(navigation).toBeHidden()
  const pages = page.getByRole('button', { name: 'Pages', exact: true })
  await pages.click()
  await navigation.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(navigation).toBeVisible()
  await expect(page.getByRole('option', { name: 'Dark', exact: true })).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await expect(pages).toBeFocused()
  await pages.click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(navigation).toBeHidden()
  await expect(page.locator('#site-navigation')).toBeVisible()
  const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
    const ids = elements.map((element) => element.id)
    return ids.filter((id, index) => ids.indexOf(id) !== index)
  })
  expect(duplicateIds).toEqual([])
})

test('admits live previews near the viewport and retains them after first admission', async ({
  page,
}) => {
  await page.goto('/')
  await live(page)
  const chart = page.locator('[data-component="charts/line"]')
  await expect(chart.locator('svg')).toHaveCount(0)
  await chart.scrollIntoViewIfNeeded()
  await expect(chart.locator('svg').first()).toBeAttached()
  await page.evaluate(() => scrollTo(0, 0))
  await expect(chart.locator('svg').first()).toBeAttached()
})

test('does not repaint a paused chart when unrelated customization changes', async ({ page }) => {
  await page.goto('/')
  await live(page)
  const chart = page.locator(
    '[data-component="charts/live-line"] [data-bkm-chart="liveline"][data-uid="preview-live"]',
  )
  await page.locator('[data-component="charts/live-line"]').scrollIntoViewIfNeeded()
  await expect(chart.locator('svg path').first()).toBeAttached()
  const observation = await chart.evaluateHandle((element) => {
    const sheet = element.querySelector(':scope > style')
    if (!sheet) throw new Error('Expected the live drawing stylesheet')
    let writes = 0
    const observer = new MutationObserver((records) => {
      writes += records.length
    })
    observer.observe(sheet, { childList: true })
    return { read: () => writes, disconnect: () => observer.disconnect() }
  })
  try {
    await page.getByRole('combobox', { name: 'Hover', exact: true }).click()
    await page.getByRole('option', { name: 'Standard', exact: true }).click()
    await expect(page).toHaveURL(/hover=standard/)
    expect(await observation.evaluate((value) => value.read())).toBe(0)
  } finally {
    await observation.evaluate((value) => value.disconnect())
  }
})
