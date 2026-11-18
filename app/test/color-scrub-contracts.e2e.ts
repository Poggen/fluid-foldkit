import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(
      new URL('../../registry/fluid/test/color-scrub-native.fixture.ts', import.meta.url),
    ),
  )
})

test('RGB scrub retains focus and releases after a real sandbox pointer-lock denial', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate((code) => {
    const frame = document.createElement('iframe')
    frame.id = 'denied-pointer-lock'
    frame.sandbox.add('allow-scripts')
    frame.style.cssText = 'width:500px;height:300px;'
    frame.srcdoc = `<html><body><script>${code.replaceAll('</script', '<\\/script')}</script></body></html>`
    document.body.replaceChildren(frame)
  }, fixture)
  const frame = page.frameLocator('#denied-pointer-lock')
  const observations = frame.locator('#scrub-observations')
  await expect(observations).toContainText('"ready":true')
  const field = frame.locator('[data-color-channel="r"]')
  const bounds = await field.boundingBox()
  if (bounds === null) throw new Error('Native RGB field required')
  await page.mouse.move(bounds.x + bounds.width - 10, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await expect(observations).toContainText('"pointerErrors":1')
  await expect(observations).toContainText('"focusedAtReturn":true')
  await expect(observations).toContainText('"selectionAtReturn":true')
  await expect(observations).toContainText('"_tag":"ScrubDown"')
  await expect(observations).toContainText('"cursor":true')
  await expect(observations).toContainText('"locked":false')
  await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + bounds.height / 2)
  await expect(observations).toContainText('"_tag":"ScrubMove"')
  await page.mouse.up()
  await expect(observations).toContainText('"_tag":"ScrubUp"')
  await expect(observations).toContainText('"blurs":1')
  await expect(observations).toContainText('"_tag":"FieldFocus"')
})
