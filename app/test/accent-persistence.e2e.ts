import { expect, test } from '@playwright/test'

test('live accent persistence debounces input, settles during a held drag, and yields to navigation', async ({
  page,
}) => {
  const clockStart = new Date()
  await page.clock.install({ time: clockStart })
  await page.addInitScript(() => {
    const replace = history.replaceState.bind(history)
    history.replaceState = (data, unused, url) => {
      replace(data, unused, url)
      const root = document.documentElement
      root.dataset.testSettingsUrlWrites = String(
        Number(root.dataset.testSettingsUrlWrites ?? '0') + 1,
      )
      root.dataset.testSettingsUrlWriteHref = location.href
    }
  })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const square = page.getByRole('application', { name: 'Saturation and brightness', exact: true })
  const hex = page.getByRole('textbox', { name: 'Hex value', exact: true })
  await square.scrollIntoViewIfNeeded()
  const box = await square.boundingBox()
  if (!box) throw new Error('Expected visible color square')

  // Startup uses the running clock. Input and idle intervals below advance only through runFor.
  await page.clock.pauseAt(new Date(clockStart.getTime() + 60_000))
  await page.evaluate(() => {
    document.documentElement.dataset.testSettingsUrlWrites = '0'
    delete document.documentElement.dataset.testSettingsUrlWriteHref
  })
  const writes = () =>
    page.evaluate(() => Number(document.documentElement.dataset.testSettingsUrlWrites ?? '0'))

  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.clock.runFor(20)
  for (let step = 1; step <= 12; step++) {
    await page.mouse.move(box.x + box.width * (0.2 + step / 24), box.y + box.height * 0.4)
    await page.clock.runFor(20)
  }
  expect(await writes()).toBe(0)

  const value = await hex.inputValue()
  const accent = `#${value.replace(/^#/, '').toLowerCase()}`
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--fluid-accent')
          .trim()
          .toLowerCase(),
      ),
    )
    .toBe(accent)

  // Last input already advanced 20 ms. This stays below the 250 ms idle deadline.
  await page.clock.runFor(200)
  expect(await writes()).toBe(0)
  // Cross the idle deadline while the pointer remains held. All frame callbacks still run.
  await page.clock.runFor(50)
  await expect.poll(writes).toBe(1)
  expect(new URL(page.url()).searchParams.get('accent')?.toLowerCase()).toBe(accent)
  const writtenHref = await page.locator('html').getAttribute('data-test-settings-url-write-href')
  if (writtenHref === null) throw new Error('Expected a successful settings URL replacement')
  expect(new URL(writtenHref).searchParams.get('accent')?.toLowerCase()).toBe(accent)

  await page.mouse.up()
  await page.clock.runFor(250)
  expect(await writes()).toBe(1)

  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6)
  await page.clock.runFor(20)
  await expect(hex).not.toHaveValue(value)
  const next = await hex.inputValue()
  expect(await writes()).toBe(1)
  await page.locator('#site-navigation').getByRole('link', { name: 'Button', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/button\?/)
  const writesAtNavigation = await writes()
  expect(writesAtNavigation).toBe(1)
  await page.clock.runFor(250)
  expect(new URL(page.url()).pathname).toBe('/components/button')
  expect(new URL(page.url()).searchParams.get('accent')?.toLowerCase()).toBe(
    `#${next.replace(/^#/, '').toLowerCase()}`,
  )
  expect(await writes()).toEqual(writesAtNavigation)
})
