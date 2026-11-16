import { expect, test } from '@playwright/test'

test('highlighted source copies exact text without interpreting markup and retains preview state', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (value: string) => {
          sessionStorage.setItem('copied-source', value)
          return Promise.resolve()
        },
      },
      configurable: true,
    })
  })
  await page.goto('/components/button')
  const controls = page.getByRole('complementary', { name: 'Button props' })
  const literal = '<img src=x onerror="window.sourceWasExecuted=true">'
  await controls.getByLabel('Label', { exact: true }).fill(literal)
  const playground = page.getByRole('region', { name: 'Playground', exact: true })
  const button = playground.locator('.reference-preview').getByRole('button', { name: literal })
  await expect(button).toBeVisible()
  const owner = await button.elementHandle()
  await playground.getByRole('tab', { name: 'Code', exact: true }).click()
  const code = playground.locator('.code-block')
  await expect(code.locator('.th-keyword').first()).toBeVisible()
  await expect(code.locator('pre')).toContainText(JSON.stringify(literal))
  await expect(code.locator('img')).toHaveCount(0)
  const displayed = await code.locator('pre code').textContent()
  await code.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('copied-source')))
    .toBe(displayed)
  await expect(
    page.getByRole('status').filter({ hasText: 'Copied example.ts to clipboard' }),
  ).toBeAttached()
  await playground.getByRole('tab', { name: 'Preview', exact: true }).click()
  await expect(button).toBeVisible()
  expect(await button.evaluate((node, previous) => node === previous, owner)).toBe(true)
  const api = page.getByRole('region', { name: 'API reference' })
  await expect(api.getByText('Type declaration', { exact: true })).toHaveCount(0)
  await expect(api.getByRole('columnheader', { name: 'Required', exact: true })).toHaveCount(0)
  await expect(api.getByRole('columnheader', { name: 'Type', exact: true }).first()).toBeAttached()

  await page.getByRole('button', { name: 'View source', exact: true }).click()
  const source = page.getByLabel('Native component source', { exact: true })
  await expect(source.locator('.th-keyword').first()).toBeAttached()
  const sourceText = await source.textContent()
  await source.locator('..').getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('copied-source')))
    .toBe(sourceText)

  await page.goto('/components/input-message')
  const basic = page.getByRole('region', { name: 'Basic', exact: true })
  const draft = basic.getByRole('textbox').first()
  await draft.fill('Retained while reading source')
  await basic.getByRole('tab', { name: 'Code', exact: true }).click()
  await expect(basic.locator('.code-block [data-code-token]').first()).toBeVisible()
  await basic.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('copied-source')))
    .toBe(await basic.locator('pre code').textContent())
  await basic.getByRole('tab', { name: 'Preview', exact: true }).click()
  await expect(draft).toHaveValue('Retained while reading source')
  await page.goto('/installation')
  const terminal = page.locator('.code-block').last()
  await expect(terminal.locator('[data-code-token]').first()).toBeVisible()
  await terminal.getByRole('button').click()
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('copied-source')))
    .toBe(await terminal.locator('pre code').textContent())
  expect(errors).toEqual([])
})
