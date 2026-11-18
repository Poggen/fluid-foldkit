import { expect, test } from '@playwright/test'

for (const component of [
  { slug: 'code-block', name: 'Code Block', selector: '[data-code-block]' },
  { slug: 'context-menu', name: 'Context Menu', selector: '[data-slot="context-menu-trigger"]' },
  { slug: 'data-table', name: 'Data Table', selector: 'table' },
]) {
  test(`${component.name} has a live playground and independent authored examples`, async ({
    page,
  }) => {
    const errors: Array<string> = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/components/${component.slug}`)
    const playground = page.getByRole('region', { name: 'Playground', exact: true })
    await expect(
      playground.locator('.reference-preview').locator(component.selector).first(),
    ).toBeVisible()
    await playground.getByRole('tab', { name: 'Code', exact: true }).click()
    await expect(
      playground.getByRole('tabpanel', { name: 'Code', exact: true }).locator('pre').first(),
    ).toContainText('Example.embedView')
    await playground.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(
      playground.locator('.reference-preview').locator(component.selector).first(),
    ).toBeVisible()
    const example = page.getByRole('region', {
      name: component.slug === 'data-table' ? 'Selection and actions' : 'Basic',
      exact: true,
    })
    await expect(example.locator(component.selector).first()).toBeVisible()
    await example.getByRole('tab', { name: 'Code', exact: true }).click()
    await expect(
      example.getByRole('tabpanel', { name: 'Code', exact: true }).locator('pre').first(),
    ).toContainText(`${component.name.replaceAll(' ', '')}ExampleBlock`)
    await example.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(example.locator(component.selector).first()).toBeVisible()
    expect(errors).toEqual([])
  })
}
