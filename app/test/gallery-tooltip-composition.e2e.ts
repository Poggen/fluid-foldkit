import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const card = (page: Page, slug: string) => page.locator(`[data-component="fluid/${slug}"]`)

const openCards = async (page: Page) => {
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  for (const slug of ['input-message', 'input-copy', 'tooltip', 'calendar', 'date-picker']) {
    await card(page, slug).scrollIntoViewIfNeeded()
    await expect(card(page, slug)).toHaveAttribute('data-deferred', 'false')
  }
}

const changeAccent = async (page: Page) => {
  const accent = page.locator('#site-customizer').getByRole('combobox', {
    name: 'Accent',
    exact: true,
  })
  await accent.click()
  await page.getByRole('option', { name: 'Green', exact: true }).click()
  await expect(accent).toContainText('Green')
}

const associatedTooltip = async (page: Page, trigger: Locator, text: string) => {
  await trigger.hover()
  const tooltip = page.getByRole('tooltip', { name: text, exact: true })
  await expect(tooltip).toBeVisible()
  const id = await tooltip.getAttribute('id')
  expect(id).toBeTruthy()
  expect((await trigger.getAttribute('aria-describedby'))?.split(/\s+/)).toContain(id)
  await trigger.press('Escape')
  await expect(tooltip).toBeHidden()
  await page.mouse.move(0, 0)
}

const expectUniqueIds = async (page: Page) => {
  const duplicates = await page.locator('[id]').evaluateAll((elements) => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const element of elements) {
      if (element.id && seen.has(element.id)) duplicates.add(element.id)
      seen.add(element.id)
    }
    return [...duplicates]
  })
  expect(duplicates).toEqual([])
}

test('gallery tooltip providers coexist through accent changes and retain composer and copy actions', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCards(page)
  const composer = card(page, 'input-message').getByRole('textbox', {
    name: 'Try the message composer',
    exact: true,
  })
  await composer.fill('Preserve this draft across the accent change')
  const basic = card(page, 'tooltip').getByRole('button', { name: 'Hover me', exact: true })
  await associatedTooltip(page, basic, 'Copy to clipboard')
  await basic.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(basic).toBeFocused()
  const tooltip = page.getByRole('tooltip', { name: 'Copy to clipboard', exact: true })
  await expect(tooltip).toBeVisible()
  expect((await basic.getAttribute('aria-describedby'))?.split(/\s+/)).toContain(
    await tooltip.getAttribute('id'),
  )
  await basic.press('Escape')
  await expect(tooltip).toBeHidden()
  await expectUniqueIds(page)

  await changeAccent(page)
  await expect(composer).toHaveValue('Preserve this draft across the accent change')
  await associatedTooltip(page, basic, 'Copy to clipboard')
  const copy = card(page, 'input-copy').getByRole('button', { name: /^Copy(?: Copy)?$/ })
  await associatedTooltip(page, copy, 'Copy to clipboard')
  await copy.click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('bunx shadcn@4.23.0 add @fluid-foldkit/button')
  await card(page, 'input-message')
    .getByRole('button', { name: 'Send message', exact: true })
    .click()
  await expect(composer).toHaveValue('')
  await expectUniqueIds(page)
  expect(errors).toEqual([])
})

test('calendar and date picker retain independent navigation, selection and tooltip associations', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openCards(page)
  const calendar = card(page, 'calendar')
  const next = calendar.getByRole('button', { name: 'Go to the Next Month', exact: true })
  const month = calendar.getByRole('grid').first()
  const initialMonth = await month.getAttribute('aria-label')
  expect(initialMonth).toBeTruthy()
  await associatedTooltip(page, next, 'Next month')
  await next.click()
  await expect.poll(() => month.getAttribute('aria-label')).not.toBe(initialMonth)
  const navigatedMonth = await month.getAttribute('aria-label')

  const picker = card(page, 'date-picker').getByRole('button', { name: /^Choose a date:/ })
  await picker.click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  await associatedTooltip(
    page,
    popup.getByRole('button', { name: 'Go to the Next Month', exact: true }),
    'Next month',
  )
  // Escape also belongs to the containing date picker; reopen if that dismissed it.
  if (await popup.isHidden()) await picker.click()
  const date = popup
    .locator(
      '[role="gridcell"]:not([aria-selected="true"]):not([data-hidden="true"]) button:not([disabled])',
    )
    .first()
  const dateLabel = await date.getAttribute('aria-label')
  expect(dateLabel).toBeTruthy()
  await date.click()
  await expect(popup).toBeHidden()
  const selectedLabel = await picker.getAttribute('aria-label')
  await changeAccent(page)
  expect(await picker.getAttribute('aria-label')).toBe(selectedLabel)
  expect(await month.getAttribute('aria-label')).toBe(navigatedMonth)

  await picker.click()
  await expect(popup).toBeVisible()
  await expect(
    popup.getByRole('button', { name: `${dateLabel}, selected`, exact: true }),
  ).toBeVisible()
  await expectUniqueIds(page)
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  await associatedTooltip(page, next, 'Next month')
  await expectUniqueIds(page)
  expect(errors).toEqual([])
})
