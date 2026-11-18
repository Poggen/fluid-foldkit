import { expect, test } from '@playwright/test'
import inventory from './fixtures/authored-inventory.json' with { type: 'json' }
import { componentPages } from '../../lib/catalogue'

const authoredSections = new Map(inventory.pages.map(({ slug, sections }) => [slug, sections]))
for (const slug of authoredSections.keys()) {
  if (!componentPages.some((component) => component.href === `/components/${slug}`))
    throw new Error(`Missing native documentation route for ${slug}`)
}
test.describe('published component documentation', () => {
  test.describe.configure({ mode: 'parallel' })
  for (const component of componentPages)
    test(component.href, async ({ page, request }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      const response = await request.get(`/reference/${component.family}/${component.slug}.json`)
      expect(response.status(), component.href).toBe(200)
      const data = await response.json()
      expect(data.files.length, component.href).toBeGreaterThan(0)
      expect(
        data.contracts.some((contract: { props: Array<unknown> }) => contract.props.length > 0),
        component.href,
      ).toBe(true)
      await page.goto(component.href)
      await expect(page.locator('[data-reference-page]')).toHaveAttribute(
        'data-reference-page',
        `${component.family}/${component.slug}`,
      )
      if (component.family === 'fluid') {
        for (const title of authoredSections.get(component.slug) ?? [])
          await expect(
            page.getByRole('heading', { level: 2, name: title, exact: true }),
          ).toBeVisible()
      }
      const api = page.getByRole('region', { name: 'API reference' })
      await expect(api.locator('.reference-contract').first()).toBeAttached()
      const card = page.locator('.reference-preview')
      await expect(card).toHaveCount(1)
      await expect(card).toBeVisible()
      if (
        component.family === 'charts' &&
        !['legend', 'stat-flow', 'tooltip-box'].includes(component.slug)
      )
        await expect(card.locator('svg').filter({ visible: true }).first()).toBeVisible()
      if (component.family === 'charts' && component.slug === 'brush') {
        await expect(card.locator('.bk-brush-main svg.ts-chart')).toBeVisible()
        await expect(card.locator('.bk-brush-strip svg.ts-chart')).toBeVisible()
        await expect(card.locator('.bk-brush-strip svg.ts-chart')).toHaveAccessibleName(
          'Brush range preview',
        )
        await expect(card.locator('.bk-brush-strip svg.ts-chart text')).toHaveCount(0)
        const selection = card.locator('[data-chart-brush-selection]')
        await expect(selection).toHaveCSS('mask-image', /^url\("data:image\/svg\+xml,/u)
        await expect(selection).toHaveCSS('mask-size', '6px 6px')
        const drawing = card.locator('fk-bklit-showcase-brush')
        const observations = await drawing.evaluateHandle((node) => {
          let commits = 0
          const observe = (event: Event) => {
            const detail: unknown = event instanceof CustomEvent ? event.detail : undefined
            if (
              typeof detail === 'object' &&
              detail !== null &&
              'kind' in detail &&
              detail.kind === 'commit'
            )
              commits++
          }
          node.addEventListener('bkm-brush-observed', observe)
          return {
            commits: () => commits,
            dispose: () => node.removeEventListener('bkm-brush-observed', observe),
          }
        })
        try {
          const main = card.locator('.bk-brush-main svg.ts-chart')
          const paths = () =>
            main
              .locator('path')
              .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d')).join('|'))
          for (const [index, height] of [80, 140].entries()) {
            await page
              .getByRole('complementary', { name: 'Brush props' })
              .getByLabel('Height', { exact: true })
              .fill(String(height))
            await expect(card.locator('.bk-brush-strip')).toHaveCSS('height', `${height}px`)
            const handle = card.locator('[data-chart-brush-handle]').last()
            await expect(handle).toHaveCSS('transform', 'none')
            await expect(handle).toHaveCSS('fill-opacity', '0')
            await expect
              .poll(async () => (await handle.boundingBox())?.height ?? 0)
              .toBeCloseTo(height, 0)
            expect(
              await handle.evaluate((node) => {
                const box = node.getBoundingClientRect()
                return [box.top + 1, box.bottom - 1].map(
                  (y) => document.elementFromPoint(box.x + box.width / 2, y) === node,
                )
              }),
            ).toEqual([true, true])
            const box = await handle.boundingBox()
            if (box === null || box.height <= 0)
              throw new Error('Brush handle must have a native hit area')
            const before = await paths()
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
            await page.mouse.down()
            for (const distance of [15, 30, 45])
              await page.mouse.move(box.x + box.width / 2 - distance, box.y + box.height / 2)
            await page.mouse.up()
            await expect
              .poll(() => observations.evaluate((value) => value.commits()))
              .toBe(index + 1)
            await expect.poll(paths).not.toBe(before)
          }
        } finally {
          await observations.evaluate((value) => value.dispose())
          await observations.dispose()
        }
      }
      expect(errors).toEqual([])
    })
})

test('button playground edits, variants, reset, shuffle, source and API work together', async ({
  page,
}) => {
  await page.goto('/components/button')
  const controls = page.getByRole('complementary', { name: 'Button props' })
  const preview = page.locator('.reference-preview')
  await expect(preview.getByRole('button', { name: 'Get started' })).toBeVisible()
  await controls.getByLabel('Label', { exact: true }).fill('Ship it')
  await expect(preview.getByRole('button', { name: 'Ship it' })).toBeVisible()
  await controls.getByRole('switch', { name: 'Disabled', exact: true }).click()
  await expect(preview.getByRole('button', { name: 'Ship it' })).toBeDisabled()
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Code', exact: true })
    .click()
  await expect(page.locator('.reference-code').first()).toContainText('Ship it')
  await expect(page.locator('.reference-code').first()).toContainText('disabled: true')
  await controls.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator('.reference-code').first()).toContainText('Get started')
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Preview', exact: true })
    .click()
  await controls.getByRole('switch', { name: 'Icon only', exact: true }).click()
  await expect(
    preview.getByRole('button', { name: 'Get started', exact: true }).locator('svg'),
  ).toBeVisible()
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Code', exact: true })
    .click()
  await expect(page.locator('.reference-code').first()).toContainText('defaultIcons.plus({}, h)')
  await controls.getByRole('button', { name: 'Reset', exact: true }).click()
  const initialCode = await page.locator('.reference-code').first().textContent()
  await controls.getByRole('button', { name: 'Shuffle', exact: true }).click()
  await expect
    .poll(() => page.locator('.reference-code').first().textContent())
    .not.toBe(initialCode)
  await page.getByRole('button', { name: 'View source', exact: true }).click()
  await expect(page.getByLabel('Native component source')).toContainText('Button')
  await expect(page.getByRole('region', { name: 'API reference' })).toContainText('ButtonProps')
  await expect(page.getByRole('region', { name: 'API reference' })).not.toContainText(
    'toLocaleUpperCase',
  )
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Preview', exact: true })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Variants', exact: true })
      .getByRole('button', { name: 'Primary', exact: true }),
  ).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'With Icons', exact: true })).toBeAttached()
  await page
    .getByRole('region', { name: 'Loading & Disabled', exact: true })
    .getByRole('button', { name: 'Click me', exact: true })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Loading & Disabled', exact: true })
      .getByRole('button', { name: 'Click me', exact: true }),
  ).toHaveAttribute('aria-busy', 'true')
})

test('API loading failures are recoverable without losing playground props', async ({ page }) => {
  await page.route('**/reference/fluid/button.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('/components/button')
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await page
    .getByRole('complementary', { name: 'Button props' })
    .getByLabel('Label', { exact: true })
    .fill('Retained')
  await page.unroute('**/reference/fluid/button.json')
  await page.getByRole('button', { name: 'Retry reference', exact: true }).click()
  await expect(page.getByRole('region', { name: 'API reference' })).toContainText('ButtonProps')
  await expect(page.getByRole('region', { name: 'API reference' })).not.toContainText(
    'toLocaleUpperCase',
  )
  await expect(
    page.locator('.reference-preview').getByRole('button', { name: 'Retained' }),
  ).toBeVisible()
})

test('chart controls change the native chart and calendar modes build valid native examples', async ({
  page,
}) => {
  await page.goto('/charts/line')
  const chart = page.locator('.reference-preview')
  await expect(
    chart.locator('[data-bkm-native-chart="preview-line"] svg').filter({ visible: true }).first(),
  ).toBeAttached()
  const controls = page.getByRole('complementary', { name: 'Line props' })
  await controls.getByLabel('Height', { exact: true }).fill('330')
  await expect
    .poll(() =>
      chart
        .locator('[data-bkm-native-chart="preview-line"] svg')
        .filter({ visible: true })
        .first()
        .evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThan(300)
  await page.goto('/components/calendar')
  await page
    .getByRole('complementary', { name: 'Calendar props' })
    .getByRole('combobox', { name: 'Mode', exact: true })
    .click()
  await page.getByRole('option', { name: 'Single', exact: true }).click()
  await expect(page.locator('.reference-preview').getByRole('grid').first()).toBeVisible()
})

test('native selection and presentation variants respond to their playground controls', async ({
  page,
}) => {
  await page.goto('/components/combobox')
  let preview = page.locator('.reference-preview')
  await expect(preview.getByRole('button', { name: 'Remove Combobox', exact: true })).toBeVisible()
  await page
    .getByRole('complementary', { name: 'Combobox props' })
    .getByRole('switch', { name: 'Multiple', exact: true })
    .click()
  await expect(preview.getByRole('button', { name: 'Remove Combobox', exact: true })).toHaveCount(0)
  await page.goto('/components/date-picker')
  preview = page.locator('.reference-preview')
  const datePickerControls = page.getByRole('complementary', { name: 'DatePicker props' })
  const selectedDate = await preview.locator('[data-slot=date-picker-trigger]').innerText()
  await datePickerControls.getByRole('combobox', { name: 'Design', exact: true }).click()
  await page.getByRole('option', { name: 'Outline', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Outline', exact: true })).toBeHidden()
  await expect(preview.locator('[data-slot=date-picker]')).toHaveAttribute(
    'data-variant',
    'outline',
  )
  await datePickerControls.getByRole('combobox', { name: 'Design', exact: true }).click()
  await page.getByRole('option', { name: 'Ghost', exact: true }).click()
  await expect(preview.locator('[data-slot=date-picker]')).toHaveAttribute('data-variant', 'ghost')
  await expect(preview.locator('[data-slot=date-picker-trigger]')).toHaveText(selectedDate, {
    useInnerText: true,
  })
  await page.goto('/components/sidebar')
  preview = page.locator('.reference-preview')
  const controls = page.getByRole('complementary', { name: 'Sidebar props' })
  await controls.getByRole('combobox', { name: 'Design', exact: true }).click()
  await page.getByRole('option', { name: 'Floating', exact: true }).click()
  await controls.getByRole('combobox', { name: 'Side', exact: true }).click()
  await page.getByRole('option', { name: 'Right', exact: true }).click()
  await expect(preview.locator('[data-slot=sidebar]')).toHaveAttribute('data-variant', 'floating')
  await expect(preview.locator('[data-slot=sidebar]')).toHaveAttribute('data-side', 'right')
})

test('gauge orientation changes the native plot from an arc into a linear track', async ({
  page,
}) => {
  await page.goto('/charts/gauge')
  const preview = page.locator('.reference-preview')
  const plot = preview.locator('svg.ts-chart').filter({ visible: true }).first()
  await expect(plot).toBeVisible()
  const arcHeight = await plot.evaluate((node) => node.getBoundingClientRect().height)
  await page
    .getByRole('complementary', { name: 'Gauge props' })
    .getByRole('combobox', { name: 'Gauge orientation', exact: true })
    .click()
  await page.getByRole('option', { name: 'Linear', exact: true }).click()
  await expect
    .poll(() => plot.evaluate((node) => node.getBoundingClientRect().height))
    .toBeLessThan(arcHeight / 2)
})
