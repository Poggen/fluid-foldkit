import { expect, test } from '@playwright/test'

test('presentation edits preserve the mounted input and its draft', async ({ page }) => {
  await page.goto('/components/input')
  const preview = page.locator('.reference-preview')
  const input = preview.locator('input').first()
  await input.fill('Keep this unfinished draft')
  await input.evaluate((element) => element.setAttribute('data-retained-draft', 'yes'))
  await page
    .getByRole('complementary', { name: 'Input props' })
    .getByLabel('Placeholder', { exact: true })
    .fill('New placeholder')
  await expect(input).toHaveAttribute('placeholder', 'New placeholder')
  await expect(input).toHaveValue('Keep this unfinished draft')
  await expect(input).toHaveAttribute('data-retained-draft', 'yes')
})

test('changing Accordion presentation retains expanded items and the trigger node', async ({
  page,
}) => {
  await page.goto('/components/accordion')
  const preview = page.locator('.reference-preview')
  const trigger = preview.getByRole('button', { name: 'How does fluid hover work?', exact: true })
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await trigger.evaluate((element) => element.setAttribute('data-retained-trigger', 'yes'))
  await page
    .getByRole('complementary', { name: 'Accordion props' })
    .getByRole('switch', { name: 'Highlight expanded', exact: true })
    .click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).toHaveAttribute('data-retained-trigger', 'yes')
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Code', exact: true })
    .click()
  await page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('tab', { name: 'Preview', exact: true })
    .click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).toHaveAttribute('data-retained-trigger', 'yes')
  const authored = page
    .getByRole('region', { name: 'Single Expand', exact: true })
    .getByRole('button', { name: 'Styling', exact: true })
  await authored.click()
  await expect(authored).toHaveAttribute('aria-expanded', 'true')
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Radius', exact: true })
    .click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect(authored).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).toHaveAttribute('data-retained-trigger', 'yes')
})
