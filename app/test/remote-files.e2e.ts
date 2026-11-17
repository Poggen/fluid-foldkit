import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./remote-files-fixture.ts', import.meta.url)),
  )
})

test('mixed attachments retain local resources, remote error identity and URL occurrence keys', async ({
  page,
}) => {
  const info = test.info()
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await mountRuntimeFixture(page, '/components/chat-message', fixture)
  const receipt = () => page.evaluate(() => window.remoteFilesReceipt)
  const standalone = page.locator('#standalone')
  const chat = page.locator('#mixed-chat')
  await expect(standalone.locator('img')).toBeVisible()
  await expect(chat.locator('img')).toHaveCount(2)
  await expect(chat.getByRole('img', { name: 'Remote PDF' })).toBeVisible()
  expect((await receipt()).filter((entry) => entry.startsWith('create:'))).toHaveLength(1)
  await page.screenshot({ path: info.outputPath('mixed.png') })
  const local = await chat.locator('img').first().elementHandle()
  const remote = await chat.locator('img').nth(1).elementHandle()
  await page.getByRole('button', { name: 'Replace chat URL', exact: true }).click()
  await expect(chat.locator('img').nth(1)).toHaveAttribute('src', /#replacement$/u)
  expect(
    await chat
      .locator('img')
      .first()
      .evaluate((node, previous) => node === previous, local),
  ).toBe(true)
  expect(
    await chat
      .locator('img')
      .nth(1)
      .evaluate((node, previous) => node === previous, remote),
  ).toBe(false)
  await page.getByRole('button', { name: 'Remove chat files', exact: true }).click()
  await expect(chat.locator('img')).toHaveCount(0)
  expect((await receipt()).filter((entry) => entry.startsWith('revoke:'))).toHaveLength(0)
  await page.getByRole('button', { name: 'Remote image', exact: true }).click()
  await expect(standalone.locator('img')).toHaveAttribute('alt', 'Remote image')
  await expect
    .poll(async () => (await receipt()).filter((entry) => entry.startsWith('revoke:')).length)
    .toBe(1)
  await page.getByRole('button', { name: 'Pending local PDF', exact: true }).click()
  await expect(standalone.getByRole('status', { name: 'Loading preview' })).toBeVisible()
  await expect.poll(async () => (await receipt()).includes('pdf:start')).toBe(true)
  await page.getByRole('button', { name: 'Remote image', exact: true }).click()
  await expect.poll(async () => (await receipt()).includes('pdf:cancel')).toBe(true)
  await page.getByRole('button', { name: 'Broken remote image', exact: true }).click()
  await expect(standalone.locator('img')).toHaveCount(0)
  await expect(standalone.getByRole('img', { name: 'Failed image' })).toBeVisible()
  await page.getByRole('button', { name: 'Rename failed image', exact: true }).click()
  await expect(standalone.getByRole('img', { name: 'Renamed failure' })).toBeVisible()
  await expect(standalone).toHaveCSS('width', '96px')
  await page.screenshot({ path: info.outputPath('remote-failure.png') })
  await page.getByRole('button', { name: 'Remote image', exact: true }).click()
  await expect(standalone.locator('img')).toBeVisible()
  await page.getByRole('button', { name: 'Return failed URL', exact: true }).click()
  await expect(standalone.locator('img')).toHaveCount(0)
  expect((await receipt()).filter((entry) => entry.startsWith('lookup:'))).toEqual([
    'lookup:local',
    'lookup:local',
    'lookup:pdf',
  ])
  expect(requests.some((url) => url.includes('never-fetch.pdf'))).toBe(false)
  await page.getByRole('button', { name: 'Caller blob', exact: true }).click()
  await expect(standalone.locator('img')).toHaveAttribute('alt', 'Caller blob')
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-remote-files')))
  await expect(page.locator('#standalone')).toHaveCount(0)
  expect(
    await page.evaluate(async () => {
      const url = window.remoteFilesCallerUrl
      const response = await fetch(url)
      URL.revokeObjectURL(url)
      return response.ok
    }),
  ).toBe(true)
  expect((await receipt()).filter((entry) => entry.startsWith('revoke:'))).toHaveLength(1)
  await info.attach('resource-receipt', {
    body: JSON.stringify(await receipt(), null, 2),
    contentType: 'application/json',
  })
})
