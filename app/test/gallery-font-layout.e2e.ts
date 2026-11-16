import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const card = (page: Page, slug: string) => page.locator(`[data-component="fluid/${slug}"]`)
const sampleCards =
  '[data-component="fluid/input-message"], [data-component="fluid/color-picker"], [data-component="fluid/switch"]'

const sizes = (page: Page) =>
  page.locator(sampleCards).evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected a gallery card')
      return { width: element.offsetWidth, height: element.offsetHeight }
    }),
  )

const expectCardFlow = async (page: Page) => {
  await expect
    .poll(() =>
      page.locator(sampleCards).evaluateAll((elements) => {
        const boxes = elements.map((element) => element.getBoundingClientRect())
        return (
          boxes.length === 3 &&
          boxes.every(
            (box, index) =>
              box.width > 0 &&
              box.height > 0 &&
              box.left >= -1 &&
              box.right <= innerWidth + 1 &&
              boxes
                .slice(index + 1)
                .every(
                  (other) =>
                    Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 ||
                    Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1,
                ),
          )
        )
      }),
    )
    .toBe(true)
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`heading font changes preserve gallery flow and draft at ${viewport.width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    const hero = page.getByRole('heading', { level: 1, name: 'Fluid Functionalism', exact: true })
    const originalFont = await hero.evaluate((element) => getComputedStyle(element).fontFamily)
    for (const slug of ['input-message', 'color-picker', 'switch']) {
      await card(page, slug).scrollIntoViewIfNeeded()
      await expect(card(page, slug)).toHaveAttribute('data-deferred', 'false')
    }
    const before = await sizes(page)
    const inputCard = card(page, 'input')
    await inputCard.scrollIntoViewIfNeeded()
    const input = inputCard.getByRole('textbox').first()
    await input.fill('Keep this draft when the heading font changes')

    if (viewport.width < 1280)
      await page.getByRole('button', { name: 'Pages', exact: true }).click()
    const settings =
      viewport.width < 1280
        ? page.getByRole('dialog', { name: 'Pages', exact: true })
        : page.locator('#site-customizer [data-customizer-content]')
    await settings.getByRole('combobox', { name: 'Heading font', exact: true }).click()
    const fontOption = page.getByRole('option', { name: 'Geist Serif', exact: true })
    await fontOption.click()
    await expect(fontOption).toBeHidden()
    if (viewport.width < 1280) {
      await page.keyboard.press('Escape')
      await expect(settings).toBeHidden()
    }
    await page.evaluate(() => document.fonts.ready)
    await expect(hero).toHaveCSS('font-family', '"Geist Serif", serif')
    expect(await hero.evaluate((element) => getComputedStyle(element).fontFamily)).not.toBe(
      originalFont,
    )
    await expect(input).toHaveValue('Keep this draft when the heading font changes')
    await expect.poll(() => sizes(page)).toEqual(before)
    await expectCardFlow(page)

    await inputCard.getByRole('link', { name: 'View Input documentation', exact: true }).click()
    await expect(page.locator('[data-reference-page]')).toHaveAttribute(
      'data-reference-page',
      'fluid/input',
    )
    if (viewport.width < 1280)
      await page.getByRole('button', { name: 'Pages', exact: true }).click()
    await page.getByRole('link', { name: 'Showcase', exact: true }).click()
    await expect(hero).toHaveCSS('font-family', '"Geist Serif", serif')
    await inputCard.scrollIntoViewIfNeeded()
    await expect(input).toHaveValue('')

    await input.fill('New visit draft through viewport changes')
    await page.setViewportSize({
      width: viewport.width < 1280 ? 460 : 1360,
      height: viewport.height,
    })
    for (const slug of ['input-message', 'color-picker', 'switch']) {
      await card(page, slug).scrollIntoViewIfNeeded()
      await expect(card(page, slug)).toHaveAttribute('data-deferred', 'false')
    }
    await expectCardFlow(page)
    await inputCard.scrollIntoViewIfNeeded()
    await expect(input).toHaveValue('New visit draft through viewport changes')
    expect(errors).toEqual([])
  })
}
