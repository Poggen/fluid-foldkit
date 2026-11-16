import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const open = async (page: Page, path = '/') => {
  await page.goto(path === '/' ? path : `${path}?embed=1`)
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
}
const tile = (page: Page, slug: string) => page.locator(`[data-component="fluid/${slug}"]`)

test('retains the authored bento proportions, source order and complete footer targets', async ({
  page,
}) => {
  await open(page)
  const first = tile(page, 'input-message'),
    color = tile(page, 'color-picker'),
    small = tile(page, 'switch')
  const frames = await Promise.all(
    [first, color, small].map((element) =>
      element.evaluate((node) => {
        if (!(node instanceof HTMLElement)) throw new Error('Expected a showcase card')
        // Reveal deliberately transforms the visual box during admission.
        return { width: node.offsetWidth, height: node.offsetHeight }
      }),
    ),
  )
  expect(frames[0]?.height).toBeCloseTo(300, 0)
  expect(frames[1]?.height).toBeCloseTo(612, 0)
  expect(frames[1]?.width).toBeCloseTo(frames[0]?.width ?? 0, 0)
  expect(frames[1]?.width).toBeGreaterThan((frames[2]?.width ?? 0) * 2)
  const order = await page
    .locator('[data-component^="fluid/"]')
    .evaluateAll((elements) =>
      elements.slice(0, 7).map((element) => element.getAttribute('data-component')),
    )
  expect(order).toEqual([
    'fluid/input-message',
    'fluid/thinking-indicator',
    'fluid/color-picker',
    'fluid/switch',
    'fluid/combobox',
    'fluid/card',
    'fluid/select',
  ])
  const footer = first.locator('.preview-footer > a')
  const footerWidth = await footer.evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw new Error('Expected a footer link')
    return node.offsetWidth
  })
  expect(footerWidth).toBeGreaterThan((frames[0]?.width ?? 0) - 4)
  await expect(footer).toHaveAttribute('href', '/components/input-message')
})

test('shows the original authored options and acknowledges controlled edits', async ({ page }) => {
  await open(page)
  const composer = tile(page, 'input-message').getByRole('textbox')
  await composer.focus()
  await page.keyboard.press('Tab')
  await expect(composer).toHaveValue('Why is every other input box so stiff?')
  await composer.fill('A message that should remain editable')
  await expect(composer).toHaveValue('A message that should remain editable')
  await tile(page, 'input-message')
    .getByRole('button', { name: 'Send message', exact: true })
    .click()
  await expect(composer).toHaveValue('')
  for (const [slug, role, count] of [
    ['switch', 'switch', 2],
    ['radio-group', 'radio', 5],
    ['checkbox-group', 'checkbox', 5],
  ] as const) {
    await tile(page, slug).scrollIntoViewIfNeeded()
    await expect(tile(page, slug).getByRole(role)).toHaveCount(count)
  }
  await tile(page, 'card').scrollIntoViewIfNeeded()
  await expect(tile(page, 'card')).toContainText('Yours to theme')
  await expect(tile(page, 'card').getByRole('button')).toHaveCount(4)
  const firstCard = tile(page, 'card').getByRole('button', { name: 'Fluid motion', exact: true })
  await firstCard.focus()
  await page.keyboard.press('Enter')
  await expect(firstCard).toBeFocused()
  await tile(page, 'table').scrollIntoViewIfNeeded()
  await expect(tile(page, 'table')).toContainText('Alice')
  await tile(page, 'input-group').scrollIntoViewIfNeeded()
  await expect(tile(page, 'input-group').getByRole('textbox')).toHaveCount(3)
  const email = tile(page, 'input-group').getByRole('textbox', { name: 'Email', exact: true })
  await email.fill('hello@example.com')
  await expect(email).toHaveValue('hello@example.com')
})

test('advances authored single-choice and multiple-choice questions', async ({ page }) => {
  await page.goto('/components/ask-user-questions')
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
  const questions = page.locator('.reference-preview')
  await expect(questions).toContainText('Question 1 of 3')
  await questions.getByRole('radio', { name: /Designer/ }).click()
  await expect(questions).toContainText('What drew you to Fluid Functionalism?')
  await questions.getByRole('radio', { name: /Motion/ }).click()
  await expect(questions).toContainText('Would you recommend Fluid Functionalism to a teammate?')
  await page.reload()
  await page.getByRole('switch', { name: 'Multi-select', exact: true }).click()
  await expect(questions).toContainText('Question 1 of 3')
  const designer = questions.getByRole('checkbox', { name: /Designer/ })
  const engineer = questions.getByRole('checkbox', { name: /Engineer/ })
  await expect(questions.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await designer.click()
  await engineer.click()
  await expect(designer).toBeChecked()
  await expect(engineer).toBeChecked()
  await questions.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(questions).toContainText('What drew you to Fluid Functionalism?')
})

test('keeps selectable chips, authored dialog focus and the dismissible banner reset', async ({
  page,
}) => {
  await open(page, '/components/combobox')
  const combo = page.locator('.embedded-preview')
  await expect(combo).toContainText('Button')
  await expect(combo).toContainText('Combobox')
  await combo.getByRole('button', { name: /Remove Button/ }).click()
  await expect(combo.getByRole('button', { name: /Remove Button/ })).toHaveCount(0)
  await open(page, '/components/dialog')
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'A little focus', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await open(page, '/components/banner')
  const banner = page.locator('.embedded-preview')
  await banner.getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(banner.getByText('Fluid Functionalism is installed')).toBeHidden()
  await open(page)
  const homeBanner = tile(page, 'banner')
  await homeBanner.scrollIntoViewIfNeeded()
  await homeBanner.getByRole('button', { name: 'Later', exact: true }).click()
  await expect(homeBanner.getByText('The registry has new components')).toBeHidden()
  await expect(homeBanner.getByText('The registry has new components')).toBeVisible({
    timeout: 4000,
  })
})

test('pauses and resumes the four-slide carousel and honors reduced motion', async ({ page }) => {
  await open(page, '/components/carousel-dots')
  const carousel = page.locator('.embedded-preview')
  await expect(carousel.getByRole('button', { name: /^Show / })).toHaveCount(4)
  await carousel.getByRole('button', { name: 'Show Go to slide 2', exact: true }).click()
  await carousel.locator('div.grid.h-16.w-48.place-items-center.overflow-hidden').hover()
  const active = () =>
    carousel
      .getByRole('button', { name: 'Show Go to slide 2', exact: true })
      .getAttribute('aria-current')
  await expect.poll(active).toBe('true')
  // Longer than a full autoplay interval, to establish hover pauses the clock.
  await page.waitForTimeout(2600)
  expect(await active()).toBe('true')
  await page.mouse.move(0, 0)
  await expect.poll(active, { timeout: 4000 }).toBe(null)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await carousel.getByRole('button', { name: 'Show Go to slide 4', exact: true }).click()
  await expect(
    carousel.getByRole('button', { name: 'Show Go to slide 4', exact: true }),
  ).toHaveAttribute('aria-current', 'true')
})

test('renders inline menu selection and tracks pointer hover on its real rows', async ({
  page,
}) => {
  await open(page)
  const menu = tile(page, 'dropdown')
  await menu.scrollIntoViewIfNeeded()
  const selected = page.locator('#preview-dropdown-selected [data-slot="fluid-hover-highlight"]')
  await expect(selected).toBeVisible()
  await expect(menu.getByRole('menuitemradio', { name: 'Spring animations' })).toBeChecked()
  const hover = menu.getByRole('menuitemradio', { name: 'Fluid hover' })
  await expect(hover.locator('svg').last()).toHaveCSS('opacity', '0')
  await hover.hover()
  await expect(hover).toHaveAttribute('data-fluid-hover-active', '')
  await hover.click()
  await expect(hover).toBeChecked()
  await expect(hover.locator('svg').last()).toHaveCSS('opacity', '1')
  await menu.getByRole('menuitemradio', { name: 'Spring animations' }).click()
  await expect(hover.locator('svg').last()).toHaveCSS('opacity', '0')
  await open(page)
  await tile(page, 'breadcrumb').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /Show .* hidden steps/ }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
})

test('shows Sidebar shortcut hints on hover and keyboard focus', async ({ page }) => {
  await open(page)
  await tile(page, 'sidebar').scrollIntoViewIfNeeded()
  const preview = tile(page, 'sidebar')
  const search = preview.getByRole('textbox', { name: 'Search threads', exact: true })
  const searchHint = preview.getByText('⌘K', { exact: true })
  const create = preview.getByRole('button', { name: /New thread/ })
  const createHint = preview.getByText('⌘N', { exact: true })
  await expect(searchHint).toHaveCSS('opacity', '0')
  await search.hover()
  await expect(searchHint).toHaveCSS('opacity', '1')
  await create.hover()
  await expect(searchHint).toHaveCSS('opacity', '0')
  await expect(createHint).toHaveCSS('opacity', '1')
  await page.mouse.move(0, 0)
  await search.focus()
  await expect(searchHint).toHaveCSS('opacity', '1')
  await create.focus()
  await expect(createHint).toHaveCSS('opacity', '1')
})

test('sizes mobile cards to their content and restores fixed desktop rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  const height = (slug: string) =>
    tile(page, slug).evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw new Error('Expected a showcase card')
      return node.offsetHeight
    })
  await expect.poll(() => height('input-message')).toBeLessThan(300)
  await expect.poll(() => height('thinking-indicator')).toBeLessThan(230)
  await page.locator('[data-component="fluid/carousel-dots"]').scrollIntoViewIfNeeded()
  await expect(tile(page, 'carousel-dots')).toHaveAttribute('data-deferred', 'false')
  await expect.poll(() => height('carousel-dots')).toBeLessThan(300)
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect.poll(() => height('input-message')).toBe(300)
  await expect.poll(() => height('color-picker')).toBe(612)
})

test('keeps repeated disclosure activations correct before the next DOM commit', async ({
  page,
}) => {
  await open(page, '/components/accordion')
  const trigger = page.getByRole('button', { name: 'What is Fluid Functionalism?', exact: true })
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await trigger.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error('Expected a disclosure button')
    element.click()
    element.click()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
})

test('lets the Switch example shrink with compact density', async ({ page }) => {
  await open(page)
  await tile(page, 'switch').scrollIntoViewIfNeeded()
  const stack = tile(page, 'switch').locator('div.flex.flex-col.gap-3')
  const initialWidth = await stack.evaluate((element) => element.getBoundingClientRect().width)
  await page.getByRole('combobox', { name: 'Size', exact: true }).click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await expect(page).toHaveURL(/size=compact/)
  await expect
    .poll(() => stack.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(initialWidth - 1)
})

test('reports unavailable documentation attachments as an accessible alert', async ({ page }) => {
  await page.route(/\.(?:png|pdf)(?:\?|$)/, (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  )
  await page.goto('/components/input-message')
  await expect(
    page.getByRole('alert').filter({ hasText: 'Example attachments could not load' }),
  ).toHaveText(
    'Example attachments could not load: The documentation image or PDF could not be loaded.',
  )
})

test('authored cursor-following Tooltips register both axes and show their content', async ({
  page,
}) => {
  await page.goto('/components/tooltip')
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
  const section = page.getByRole('region', { name: 'Follow cursor', exact: true })
  const triggers = section.getByText('Move along me', { exact: true })
  await expect(triggers).toHaveCount(2)
  for (const [index, content] of ['Following x', 'Following y'].entries()) {
    await triggers.nth(index).hover()
    await expect(page.getByRole('tooltip').filter({ hasText: content })).toBeVisible()
    await page.mouse.move(0, 0)
    await expect(page.getByRole('tooltip').filter({ hasText: content })).toBeHidden()
  }
})
