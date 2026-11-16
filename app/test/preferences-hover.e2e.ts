import { expect, test, type Locator, type Page } from '@playwright/test'

const highlight = (owner: Locator) => owner.locator('[data-slot="fluid-hover-highlight"]')
const row = (owner: Locator, index: number) => owner.locator(`[data-fluid-hover-item="${index}"]`)
const follows = async (owner: Locator, target: Locator) => {
  await target.hover({ position: { x: 4, y: 10 } })
  await expect(highlight(owner)).toHaveCount(1)
  await expect
    .poll(async () => {
      const [paint, stop] = await Promise.all([
        highlight(owner).boundingBox(),
        target.boundingBox(),
      ])
      return (
        paint !== null &&
        stop !== null &&
        Math.abs(paint.y - stop.y) < 1 &&
        Math.abs(paint.height - stop.height) < 1 &&
        Math.abs(paint.width - stop.width) < 1
      )
    })
    .toBe(true)
}
const leave = async (page: Page) => {
  await page.mouse.move(2, 2)
}

test('settings share one gliding highlight and suppress it until the menu closes and pointer moves', async ({
  page,
}) => {
  await page.goto('/components/button')
  const owner = page.locator('#customize-desktop-rows')
  await follows(owner, row(owner, 0))
  const first = await highlight(owner).elementHandle()
  await follows(owner, row(owner, 1))
  expect(await highlight(owner).evaluate((element, previous) => element === previous, first)).toBe(
    true,
  )
  await owner.getByRole('combobox', { name: 'Accent', exact: true }).click()
  await expect(page.getByRole('listbox', { name: 'Accent', exact: true })).toBeVisible()
  await expect(highlight(owner)).toHaveCount(0)
  await row(owner, 1).hover({ position: { x: 4, y: 10 } })
  await expect(highlight(owner)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox', { name: 'Accent', exact: true })).toBeHidden()
  await expect(highlight(owner)).toHaveCount(0)
  await follows(owner, row(owner, 2))
})

test('mobile settings use their own hover owner and preserve shape and standard mode', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/components/button?shape=rounded&hover=standard')
  await page.getByRole('button', { name: 'Pages', exact: true }).click()
  const owner = page.locator('#customize-mobile-rows')
  await follows(owner, row(owner, 0))
  await expect(highlight(owner)).toHaveCSS('border-radius', '8px')
  await follows(
    owner,
    owner.locator('[data-fluid-hover-item]').filter({
      has: page.getByRole('combobox', { name: 'Radius', exact: true }),
    }),
  )
  await leave(page)
  await expect(highlight(owner)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(highlight(page.locator('#customize-desktop-rows'))).toHaveCount(0)
  await follows(
    page.locator('#customize-desktop-rows'),
    row(page.locator('#customize-desktop-rows'), 1),
  )
})

for (const mode of ['fluid', 'standard']) {
  test(`playground ${mode} highlight spans Select and Switch rows with reduced motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/components/button?hover=${mode}`)
    const owner = page.locator('#docs-controls-rows')
    await follows(owner, row(owner, 0))
    await follows(owner, row(owner, 3))
    await owner.getByLabel('Label', { exact: true }).hover()
    await expect(highlight(owner)).toHaveCount(0)
    await follows(owner, row(owner, 4))
    const toggle = owner.getByRole('switch', { name: 'Leading icon', exact: true })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await leave(page)
    await expect(highlight(owner)).toHaveCount(0)
  })
}
