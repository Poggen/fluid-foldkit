import { expect, test, type Page } from '@playwright/test'

const choose = async (page: Page, label: string, value: string) => {
  const trigger = page
    .locator('#site-customizer')
    .getByRole('combobox', { name: label, exact: true })
    .and(page.locator('[id^="customize-desktop-"]'))
  await trigger.click()
  await page.getByRole('option', { name: value, exact: true }).click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
}

const rootAccent = (page: Page) =>
  page
    .locator('html')
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--fluid-accent').trim().toLowerCase(),
    )

test('accepted picker values retain coordinates and alpha while external presets and themes still configure it', async ({
  page,
}) => {
  await page.goto('/?theme=light')
  const card = page.locator('[data-component="fluid/color-picker"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-deferred', 'false')
  const square = card.getByRole('application', { name: 'Saturation and brightness', exact: true })
  const hex = card.getByRole('textbox', { name: 'Hex value', exact: true })
  const alpha = card.getByRole('textbox', { name: 'Alpha', exact: true })
  const thumb = square.locator(':scope > div').nth(1)
  const box = await square.boundingBox()
  if (box === null) throw new Error('Expected the color square')
  await page.mouse.move(box.x + box.width * 0.37123, box.y + box.height * 0.42876)
  await page.mouse.down()
  await page.mouse.up()
  await expect
    .poll(() =>
      thumb.evaluate((element) => {
        if (!(element instanceof HTMLElement)) throw new Error('Expected the color thumb')
        const plane = element.parentElement
        if (plane === null) throw new Error('Expected the color square')
        const thumbBox = element.getBoundingClientRect()
        const planeBox = plane.getBoundingClientRect()
        return ((thumbBox.x + thumbBox.width / 2 - planeBox.x) / planeBox.width) * 100
      }),
    )
    .toBeCloseTo(37.123, 0)
  const coordinates = await thumb.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected the color thumb')
    const computed = getComputedStyle(element)
    return {
      left: computed.left,
      top: computed.top,
      preciseLeft: element.style.getPropertyValue('--fluid-left'),
      preciseTop: element.style.getPropertyValue('--fluid-top'),
    }
  })
  await alpha.fill('37')
  await alpha.press('Tab')
  await expect(alpha).toHaveValue('37%')
  await expect.poll(async () => (await rootAccent(page)).slice(-2)).toBe('5e')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')?.slice(-2)).toBe('5e')
  expect(
    await thumb.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected the color thumb')
      const computed = getComputedStyle(element)
      return {
        left: computed.left,
        top: computed.top,
        preciseLeft: element.style.getPropertyValue('--fluid-left'),
        preciseTop: element.style.getPropertyValue('--fluid-top'),
      }
    }),
  ).toEqual(coordinates)
  const accepted = await hex.inputValue()
  expect(await rootAccent(page)).toBe(`#${accepted.replace(/^#/, '').toLowerCase()}`)
  await choose(page, 'Accent', 'Red')
  await expect.poll(() => hex.inputValue()).toMatch(/^#?e7000b$/i)
  await expect(alpha).toHaveValue('100%')
  await choose(page, 'Theme', 'Dark')
  await expect.poll(() => hex.inputValue()).toMatch(/^#?ff6467$/i)
  await expect.poll(() => rootAccent(page)).toBe('#ff6467')
  await page
    .locator('#site-customizer')
    .getByRole('button', { name: 'Reset customization', exact: true })
    .click()
  await expect(alpha).toHaveValue('100%')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')).toBeNull()
})

test('accepted accent persists through immediate navigation without changing reference drafts', async ({
  page,
}) => {
  await page.goto('/?theme=light')
  const card = page.locator('[data-component="fluid/color-picker"]')
  await card.scrollIntoViewIfNeeded()
  const alpha = card.getByRole('textbox', { name: 'Alpha', exact: true })
  await alpha.fill('61')
  await alpha.press('Tab')
  await page.locator('#site-navigation').getByRole('link', { name: 'Input', exact: true }).click()
  const input = page.locator('.reference-preview #preview-input').first()
  await input.fill('Reference draft after accent acceptance')
  await expect.poll(() => rootAccent(page)).toMatch(/9c$/)
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')).toMatch(/9c$/)
  await expect(input).toHaveValue('Reference draft after accent acceptance')
  expect(new URL(page.url()).pathname).toBe('/components/input')
})
