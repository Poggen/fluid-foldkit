import { expect, test, type Locator, type Page } from '@playwright/test'

const calendarState = async (calendar: Locator) => {
  const grids = calendar.getByRole('grid')
  await expect(grids.first()).toBeVisible()
  return {
    months: await grids.count(),
    range: await grids.first().getAttribute('aria-multiselectable'),
    selected: await calendar
      .locator('[role="gridcell"][aria-selected="true"]')
      .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-day'))),
    captions: await grids.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label')),
    ),
  }
}

const homeDates = async (page: Page) => {
  const calendar = page.locator('[data-component="fluid/calendar"]')
  await calendar.scrollIntoViewIfNeeded()
  await expect(calendar).toHaveAttribute('data-deferred', 'false')
  const calendarValue = await calendarState(calendar)
  expect(calendarValue).toMatchObject({ months: 2, range: 'true', selected: [] })
  const picker = page.locator('[data-component="fluid/date-picker"]')
  await picker.scrollIntoViewIfNeeded()
  await expect(picker).toHaveAttribute('data-deferred', 'false')
  const trigger = picker.locator('[data-slot="date-picker-trigger"]')
  await expect(trigger).toBeVisible()
  await expect(trigger).toContainText(/\d/u)
  await expect(trigger).not.toHaveAttribute('data-placeholder', '')
  await expect(trigger).not.toHaveAttribute('data-disabled', '')
  await expect(picker.locator('[data-slot="date-picker"]')).toHaveAttribute(
    'data-variant',
    'outline',
  )
  return { calendar: calendarValue, pickerLabel: await trigger.innerText() }
}

const componentDates = async (page: Page, target: 'calendar' | 'date-picker') => {
  const preview = page.locator('.reference-preview')
  if (target === 'calendar') {
    const controls = page.getByRole('complementary', { name: 'Calendar props' })
    await expect(controls.getByRole('combobox', { name: 'Mode', exact: true })).toContainText(
      'Range',
    )
    const value = await calendarState(preview)
    expect(value).toMatchObject({ months: 2, range: 'true', selected: [] })
    return { calendar: value }
  }
  const controls = page.getByRole('complementary', { name: 'DatePicker props' })
  await expect(controls.getByRole('combobox', { name: 'Mode', exact: true })).toContainText(
    'Single',
  )
  const trigger = preview.locator('[data-slot="date-picker-trigger"]')
  await expect(trigger).toBeVisible()
  await expect(trigger).toContainText(/\d/u)
  await expect(trigger).not.toHaveAttribute('data-placeholder', '')
  const label = await trigger.innerText()
  await trigger.click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  const value = await calendarState(popup)
  expect(value.months).toBe(2)
  expect(value.range).toBeNull()
  expect(value.selected).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  return { calendar: value, pickerLabel: label }
}

for (const first of ['date-picker', 'calendar', 'input']) {
  test(`cold ${first} preparation does not change a later plain Home's date defaults`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
    const coldHome = await context.newPage()
    try {
      await coldHome.goto('/?theme=light')
      await expect(coldHome.locator('[data-live-previews="true"]')).toBeVisible()
      const expected = await homeDates(coldHome)
      await page.goto(`/components/${first}?theme=light`)
      await expect(page.locator('.reference-preview')).toBeVisible()
      await page
        .locator('#site-navigation')
        .getByRole('link', { name: 'Showcase', exact: true })
        .click()
      await expect(page).toHaveURL(/\/(?:\?theme=light)?$/u)
      await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
      expect(await homeDates(page)).toEqual(expected)
    } finally {
      await coldHome.close()
    }
  })
}

for (const target of ['calendar', 'date-picker'] as const) {
  for (const first of ['/', `/components/${target === 'calendar' ? 'date-picker' : 'calendar'}`]) {
    test(`${first} enters ${target} with the same selected date and presentation as its cold render`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120000)
      const coldTarget = await context.newPage()
      try {
        await coldTarget.goto(`/components/${target}?theme=light`)
        const expected = await componentDates(coldTarget, target)
        await page.goto(`${first}?theme=light`)
        await page
          .locator('#site-navigation')
          .getByRole('link', {
            name: target === 'calendar' ? 'Calendar' : 'DatePicker',
            exact: true,
          })
          .click()
        await expect(page).toHaveURL(new RegExp(`/components/${target}\\?theme=light$`, 'u'))
        expect(await componentDates(page, target)).toEqual(expected)
      } finally {
        await coldTarget.close()
      }
    })
  }
}

const enterHistoryLocation = async (page: Page, href: string) => {
  // Isolated embed pages expose no site navigation. Exercise native history input.
  await page.evaluate((target) => history.pushState(null, '', target), href)
  await page.goBack()
  await page.goForward()
  await expect(page).toHaveURL(href)
}

const embeddedDates = async (page: Page, target: 'calendar' | 'date-picker') => {
  const preview = page.locator('.embedded-preview')
  await expect(preview).toBeVisible()
  if (target === 'calendar') {
    await expect(preview.getByRole('grid')).toHaveCount(1)
    await expect(preview.getByRole('grid').first()).not.toHaveAttribute(
      'aria-multiselectable',
      'true',
    )
    await expect(preview.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1)
    await expect(preview.locator('[data-slot="calendar-root"]')).toHaveAttribute(
      'data-calendar-show-week-number',
      'true',
    )
    const value = await calendarState(preview)
    expect(value.months).toBe(1)
    expect(value.range).toBeNull()
    expect(value.selected).toHaveLength(1)
    const today = await preview
      .locator('[data-today="true"]:not([data-outside="true"])')
      .first()
      .getAttribute('data-day')
    expect(value.selected).toEqual([today])
    return { calendar: value }
  }
  const trigger = preview.locator('[data-slot="date-picker-trigger"]')
  await expect(trigger).toHaveAttribute('data-placeholder', '')
  await expect(trigger).toContainText('Pick a stay')
  await expect(preview.locator('[data-slot="date-picker"]')).toHaveAttribute(
    'data-variant',
    'ghost',
  )
  await trigger.click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  await expect(popup.getByRole('grid')).toHaveCount(2)
  await expect(popup.locator('[data-slot="calendar-months"]')).toHaveAttribute(
    'data-orientation',
    'horizontal',
  )
  await expect(popup.getByRole('grid').first()).toHaveAttribute('aria-multiselectable', 'true')
  await expect(popup.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0)
  const value = await calendarState(popup)
  expect(value).toMatchObject({ months: 2, range: 'true', selected: [] })
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  return { calendar: value, pickerLabel: await trigger.innerText() }
}

for (const target of ['calendar', 'date-picker'] as const) {
  test(`native history initializes a fresh configured embedded ${target} and preserves its same-key selection`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
    const props =
      target === 'calendar'
        ? { type: 'single', numberOfMonths: 1, orientation: 'vertical', showWeekNumber: true }
        : {
            type: 'range',
            numberOfMonths: 2,
            variant: 'ghost',
            placeholder: 'Pick a stay',
            calendarOrientation: 'horizontal',
          }
    const href = `/components/${target}?embed=1&theme=light&props=${encodeURIComponent(JSON.stringify(props))}`
    const coldTarget = await context.newPage()
    try {
      await coldTarget.goto(href)
      const expected = await embeddedDates(coldTarget, target)
      await page.goto('/?embed=1&theme=light')
      await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
      await enterHistoryLocation(page, href)
      expect(await embeddedDates(page, target)).toEqual(expected)

      const preview = page.locator('.embedded-preview')
      if (target === 'calendar') {
        const day = preview
          .locator(
            '[role="gridcell"]:not([aria-selected="true"]):not([data-outside="true"]):not([data-hidden="true"]) button:not([disabled]):not([aria-disabled="true"])',
          )
          .first()
        const chosen = await day.evaluate((node) =>
          node.closest('[data-day]')?.getAttribute('data-day'),
        )
        expect(chosen).toBeTruthy()
        await day.click()
        await expect.poll(async () => (await calendarState(preview)).selected).toEqual([chosen])
        const root = preview.locator('[data-slot="calendar-root"]')
        await root.evaluate((node) => node.setAttribute('data-retained-entry', 'yes'))
        await enterHistoryLocation(page, `${href}&accent=red`)
        await expect(root).toHaveAttribute('data-retained-entry', 'yes')
        await expect.poll(async () => (await calendarState(preview)).selected).toEqual([chosen])
      } else {
        const trigger = preview.locator('[data-slot="date-picker-trigger"]')
        await trigger.click()
        const popup = page.getByRole('dialog')
        const days = popup.locator(
          '[role="gridcell"]:not([data-outside="true"]):not([data-hidden="true"]) button:not([disabled]):not([aria-disabled="true"])',
        )
        await days.nth(5).click()
        await days.nth(7).click()
        await expect(popup).toBeHidden()
        await expect(trigger).not.toHaveAttribute('data-placeholder', '')
        const chosenLabel = await trigger.innerText()
        await trigger.evaluate((node) => node.setAttribute('data-retained-entry', 'yes'))
        await enterHistoryLocation(page, `${href}&accent=red`)
        await expect(trigger).toHaveAttribute('data-retained-entry', 'yes')
        await expect(trigger).toHaveText(chosenLabel, { useInnerText: true })
        await trigger.click()
        await expect
          .poll(async () => (await calendarState(page.getByRole('dialog'))).selected.length)
          .toBeGreaterThan(0)
      }
    } finally {
      await coldTarget.close()
    }
  })
}

test('same-key embedded Input accepts real history props while preserving unrelated local edits', async ({
  page,
}) => {
  const href = (props: Record<string, string>) =>
    '/components/input?embed=1&accent=green&props=' + encodeURIComponent(JSON.stringify(props))
  const initial = href({ value: 'URI A', placeholder: 'First' })
  await page.goto(initial)
  const input = page.locator('.embedded-preview #preview-input').first()
  await expect(input).toHaveValue('URI A')
  await expect(input).toHaveAttribute('placeholder', 'First')
  await input.fill('Accepted local edit')
  await input.evaluate((node) => node.setAttribute('data-same-embed', 'yes'))
  const original = await input.elementHandle()
  if (original === null) throw new Error('Expected a real embedded Input')

  // Embeds expose no configurable href. Seed a native entry, then use real Back/Forward.
  // This is the browser routing contract, not an invented shell link or synthetic popstate.
  await enterHistoryLocation(page, href({ value: 'URI A', placeholder: 'Second' }))
  await expect(input).toHaveValue('Accepted local edit')
  await expect(input).toHaveAttribute('placeholder', 'Second')
  await expect(input).toHaveAttribute('data-same-embed', 'yes')
  expect(await input.evaluate((node, old) => node === old, original)).toBe(true)

  await enterHistoryLocation(page, href({ value: 'URI B', placeholder: 'Second' }))
  await expect(input).toHaveValue('URI B')
  await expect(input).toHaveAttribute('data-same-embed', 'yes')
  await enterHistoryLocation(page, href({ placeholder: 'Second' }))
  await expect(input).toHaveValue('')
  await input.fill('After default reset')
  await enterHistoryLocation(page, href({}))
  await expect(input).toHaveAttribute('placeholder', 'Your next idea')
  await expect(input).toHaveValue('After default reset')
  // Explicit default and omission normalize equally; neither is a new source value.
  await enterHistoryLocation(page, href({ value: '' }))
  await expect(input).toHaveValue('After default reset')
  await enterHistoryLocation(page, href({}))
  await expect(input).toHaveValue('After default reset')
  expect(new URL(page.url()).searchParams.get('accent')).toBe('green')
  expect(await input.evaluate((node, old) => node === old, original)).toBe(true)
})

test('same-key embedded Button label and nested appearance follow real history configuration', async ({
  page,
}) => {
  const href = (label: string, shape: 'rounded' | 'pill') =>
    '/components/button?embed=1&props=' + encodeURIComponent(JSON.stringify({ label, shape }))
  await page.goto(href('Before', 'rounded'))
  const button = page
    .locator('.embedded-preview')
    .getByRole('button', { name: 'Before', exact: true })
  await expect(button).toBeVisible()
  const original = await button.elementHandle()
  if (original === null) throw new Error('Expected a real embedded Button')
  await button.evaluate((node) => node.setAttribute('data-same-embed', 'yes'))
  await enterHistoryLocation(page, href('After', 'pill'))
  const updated = page
    .locator('.embedded-preview')
    .getByRole('button', { name: 'After', exact: true })
  await expect(updated).toHaveAttribute('data-same-embed', 'yes')
  expect(await updated.evaluate((node, old) => node === old, original)).toBe(true)
  await expect(updated).toHaveCSS('border-top-left-radius', '20px')
})

test('same-key embedded Calendar layout props preserve its accepted selected date', async ({
  page,
}) => {
  const href = (months: 1 | 2, orientation: 'vertical' | 'horizontal', showWeekNumber: boolean) =>
    '/components/calendar?embed=1&props=' +
    encodeURIComponent(
      JSON.stringify({ type: 'single', numberOfMonths: months, orientation, showWeekNumber }),
    )
  await page.goto(href(1, 'vertical', false))
  const calendar = page.locator('.embedded-preview [data-slot="calendar-root"]')
  await expect(calendar.getByRole('grid')).toHaveCount(1)
  const day = calendar
    .locator(
      '[role="gridcell"]:not([aria-selected="true"]):not([data-outside="true"]):not([data-hidden="true"]) button:not([disabled]):not([aria-disabled="true"])',
    )
    .first()
  const chosen = await day.evaluate((node) => node.closest('[data-day]')?.getAttribute('data-day'))
  expect(chosen).toBeTruthy()
  await day.click()
  await expect.poll(async () => (await calendarState(calendar)).selected).toEqual([chosen])
  await calendar.evaluate((node) => node.setAttribute('data-same-embed', 'yes'))
  const original = await calendar.elementHandle()
  if (original === null) throw new Error('Expected a real embedded Calendar')
  await enterHistoryLocation(page, href(2, 'horizontal', true))
  await expect(calendar.getByRole('grid')).toHaveCount(2)
  await expect(calendar).toHaveAttribute('data-calendar-show-week-number', 'true')
  await expect(calendar.locator('[data-slot="calendar-months"]')).toHaveAttribute(
    'data-orientation',
    'horizontal',
  )
  await expect(calendar).toHaveAttribute('data-same-embed', 'yes')
  await expect.poll(async () => (await calendarState(calendar)).selected).toEqual([chosen])
  expect(await calendar.evaluate((node, old) => node === old, original)).toBe(true)
})
