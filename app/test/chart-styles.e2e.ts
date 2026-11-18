import { expect, test } from '@playwright/test'

test('first chart admission attaches styles without replacing the message draft', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const styles = page.locator('style[data-chart-styles]')
  await expect(styles).toHaveCount(1)
  await expect.poll(() => styles.textContent()).toBe('')
  const styleNode = await styles.elementHandle()
  const composer = page
    .locator('[data-component="fluid/input-message"]')
    .getByRole('textbox')
    .first()
  await composer.fill('Keep this message through chart admission')
  const composerNode = await composer.elementHandle()
  const styledAtAdmission = page.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (!document.querySelector('[data-bkm-native-chart="preview-line"]')) return
          observer.disconnect()
          clearTimeout(timeout)
          const sheet = document.querySelector<HTMLStyleElement>('style[data-chart-styles]')
          resolve(
            sheet !== null &&
              sheet === sheet.parentElement?.firstElementChild &&
              (sheet.sheet?.cssRules.length ?? 0) > 0,
          )
        })
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(new Error('Line preview did not enter the document'))
        }, 15000)
        observer.observe(document.body, { childList: true, subtree: true })
      }),
  )
  await page.locator('[data-component="charts/line"]').scrollIntoViewIfNeeded()
  expect(await styledAtAdmission).toBe(true)
  await expect(page.locator('[data-bkm-native-chart="preview-line"] svg').first()).toBeVisible()
  if (styleNode === null || composerNode === null)
    throw new Error('Expected retained preview nodes')
  expect(await styleNode.evaluate((element) => element.isConnected)).toBe(true)
  expect(await composerNode.evaluate((element) => element.isConnected)).toBe(true)
  await expect(composer).toHaveValue('Keep this message through chart admission')
  await expect(styles).toHaveCount(1)
  expect(errors).toEqual([])
})

test('client chart navigation activates styles and retains the same sheet through return visits', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components/input')
  await page.waitForFunction(() => window.__releaseShowcaseInput === undefined)
  const styles = page.locator('style[data-chart-styles]')
  await expect.poll(() => styles.textContent()).toBe('')
  const node = await styles.elementHandle()
  const navigation = page.locator('#site-navigation')
  await navigation.getByRole('link', { name: 'Line', exact: true }).click()
  await expect(page).toHaveURL(/\/charts\/line$/)
  await expect.poll(() => styles.textContent()).toContain('--bkm-')
  const activeText = await styles.textContent()
  const sheet = await styles.evaluateHandle((element) =>
    element instanceof HTMLStyleElement ? element.sheet : null,
  )
  expect(await sheet.evaluate((value) => value !== null)).toBe(true)
  await expect(page.locator('[data-bkm-native-chart="preview-line"] svg').first()).toBeVisible()
  await navigation.getByRole('link', { name: 'Input', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/input$/)
  await expect.poll(() => styles.textContent()).toBe(activeText)
  await navigation.getByRole('link', { name: 'Line', exact: true }).click()
  await expect(page).toHaveURL(/\/charts\/line$/)
  await expect.poll(() => styles.textContent()).toBe(activeText)
  await expect(styles).toHaveCount(1)
  expect(
    await styles.evaluate(
      (element, original) => element instanceof HTMLStyleElement && element.sheet === original,
      sheet,
    ),
  ).toBe(true)
  if (node === null) throw new Error('Expected the persistent chart stylesheet node')
  expect(await node.evaluate((element) => element.isConnected)).toBe(true)
  expect(errors).toEqual([])
})
