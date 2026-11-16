import { expect, test } from '@playwright/test'

test('documentation panes use native tabs with linked panels and keyboard navigation', async ({
  page,
}) => {
  await page.goto('/components/button')
  const playground = page.getByRole('region', { name: 'Playground', exact: true })
  const tabs = playground.getByRole('tablist', { name: 'Playground view' })
  const preview = tabs.getByRole('tab', { name: 'Preview' })
  const code = tabs.getByRole('tab', { name: 'Code' })

  await expect(preview).toHaveAttribute('aria-selected', 'true')
  await expect(code).toHaveAttribute('tabindex', '-1')
  const previewPanel = playground.locator('#docs-playground-view-panel-0')
  const codePanel = playground.locator('#docs-playground-view-panel-1')
  await expect(preview).toHaveAttribute('aria-controls', 'docs-playground-view-panel-0')
  await expect(code).toHaveAttribute('aria-controls', 'docs-playground-view-panel-1')
  await expect(previewPanel).toBeVisible()
  await expect(codePanel).toBeHidden()
  await expect(previewPanel).toHaveAttribute('aria-labelledby', 'docs-playground-view-tab-0')
  await expect(codePanel).toHaveAttribute('aria-labelledby', 'docs-playground-view-tab-1')

  await preview.focus()
  await preview.press('ArrowRight')
  await expect(code).toBeFocused()
  await code.press('Enter')
  await expect(code).toHaveAttribute('aria-selected', 'true')
  await expect(codePanel).toBeVisible()
  await expect(previewPanel).toBeHidden()
  await expect(tabs.locator('[role="tab"][tabindex="0"]')).toHaveCount(1)

  await code.press('Home')
  await expect(preview).toBeFocused()
  await preview.press('Enter')
  await expect(preview).toHaveAttribute('aria-selected', 'true')
  await preview.press('End')
  await expect(code).toBeFocused()
  await code.press('Enter')
  await expect(code).toHaveAttribute('aria-selected', 'true')
  await code.press('ArrowLeft')
  await expect(preview).toBeFocused()
  await preview.press('Enter')
  await expect(preview).toHaveAttribute('aria-selected', 'true')

  const variants = page.getByRole('region', { name: 'Variants', exact: true })
  const variantTabs = variants.getByRole('tablist', { name: 'Variants view' })
  await variantTabs.getByRole('tab', { name: 'Code' }).click()
  await expect(variantTabs.getByRole('tab', { name: 'Code' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(preview).toHaveAttribute('aria-selected', 'true')
})

test('switching panes preserves an authored input node and its draft', async ({ page }) => {
  await page.goto('/components/input-group')
  const basic = page.getByRole('region', { name: 'Basic', exact: true })
  const input = basic.getByRole('textbox').first()
  await input.fill('Unfinished draft')
  await input.evaluate((node) => node.setAttribute('data-retained-input', 'yes'))
  const tabs = basic.getByRole('tablist')
  await tabs.getByRole('tab', { name: 'Code' }).click()
  await tabs.getByRole('tab', { name: 'Preview' }).click()
  await expect(input).toHaveValue('Unfinished draft')
  await expect(input).toHaveAttribute('data-retained-input', 'yes')
})
