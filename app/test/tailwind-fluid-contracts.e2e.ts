import { expect, test } from '@playwright/test'
import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { FormsParent, FormsParentLayer } from './tailwind-fluid-contracts-switch-fixture.js'
import { renderSidebarContract } from './tailwind-fluid-contracts-sidebar-fixture.js'
import {
  bundleRuntimeFixture,
  loadBuiltStyles,
  mountRuntimeFixture,
} from './style-contract-helpers.js'

const fixturePath = (name: string) =>
  new URL(`./tailwind-fluid-contracts-${name}-fixture.ts`, import.meta.url).pathname

let clipboardCode = ''
let sliderCode = ''
test.beforeAll(async () => {
  clipboardCode = await bundleRuntimeFixture(fixturePath('clipboard'))
  sliderCode = await bundleRuntimeFixture(fixturePath('slider'))
})

test('Sidebar SSR consumes compact indentation, disabled pointer policy and distinct row padding', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(renderSidebarContract())
  await loadBuiltStyles(page, '/components/sidebar', rendered.html)
  const primary = page.locator('[data-app-inset="primary"]')
  const currentLink = page.locator('[data-app-inset="secondary"] a[aria-current="page"]')
  await currentLink.hover()
  await expect(currentLink).toHaveCSS('background-color', 'rgb(36, 65, 111)')
  await currentLink.click()
  await expect(page).toHaveURL(/#nested$/)
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(currentLink).toBeFocused()
  await expect(currentLink).toHaveCSS('box-shadow', /2px/)
  const subrow = primary.locator('[data-sidebar="menu-sub-item"]').first()
  await expect(subrow).toHaveCSS('height', '24px')
  await expect(subrow).toHaveCSS('margin-inline-start', '24px')
  for (const { inset, start, end } of [
    { inset: 'primary', start: '8px', end: '64px' },
    { inset: 'secondary', start: '28px', end: '36px' },
  ]) {
    const owner = page.locator(`[data-app-inset="${inset}"]`)
    await expect(owner.locator('[data-nav-index="0"]')).toHaveCSS('pointer-events', 'auto')
    for (const index of [1, 2]) {
      const row = owner.locator(`[data-nav-index="${index}"]`)
      await expect(row).toHaveCSS('pointer-events', 'none')
      await expect(row).toHaveCSS('padding-inline-start', start)
      await expect(row).toHaveCSS('padding-inline-end', end)
      if (inset === 'primary') {
        await expect(row).toHaveCSS('--row-gutter', '64px')
        await expect(row).toHaveCSS('--row-gutter-hover', '64px')
      }
    }
  }
})

test('Switch SSR checkbox is visually clipped while its labeled switch remains visible', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(
    renderToString(
      { block: FormsParent, layer: FormsParentLayer },
      {},
      { isHydratable: true, buildId: 'switch-style-contract' },
    ),
  )
  await loadBuiltStyles(page, '/components/switch', rendered.html)
  const input = page.locator('input[type="checkbox"]')
  await expect(input).toHaveCSS('clip-path', 'inset(50%)')
  await expect(input).toHaveCSS('width', '1px')
  await expect(input).toHaveCSS('height', '1px')
  await expect(input).toHaveCSS('overflow', 'hidden')
  await expect(page.getByRole('switch', { name: 'Notifications' })).toBeVisible()
})

test('Select SSR keeps shared className on the wrapper and lets triggerClassName win on the button', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(
    renderToString(
      { block: FormsParent, layer: FormsParentLayer },
      {},
      { isHydratable: true, buildId: 'select-style-contract' },
    ),
  )
  await loadBuiltStyles(page, '/components/select', rendered.html)
  for (const [name, padding] of [
    ['Shared Select classes', '12px'],
    ['Button Select classes', '8px'],
  ] satisfies ReadonlyArray<readonly [string, string]>) {
    const trigger = page.getByRole('combobox', { name, exact: true })
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveCSS('padding-inline-start', padding)
    await expect(trigger).toHaveCSS('padding-inline-end', padding)
    await expect(trigger.locator('..')).toHaveCSS('padding-inline-start', '12px')
    await expect(trigger.locator('..')).toHaveCSS('padding-inline-end', '12px')
  }
})

test('Tabs SSR hides fine-pointer scrollbars while native horizontal wheel scrolling remains available', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(
    renderToString(
      { block: FormsParent, layer: FormsParentLayer },
      {},
      { isHydratable: true, buildId: 'tabs-scrollbar-contract' },
    ),
  )
  await loadBuiltStyles(page, '/components/tabs', rendered.html)
  expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
  const tabs = page.getByRole('tablist', { name: 'Overflowing workspace tabs' })
  const native = page.locator('#native-scroller')
  for (const scroller of [tabs, native]) {
    await expect(scroller).toBeVisible()
    expect(await scroller.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeGreaterThan(
      100,
    )
  }
  await expect(tabs).toHaveCSS('scrollbar-width', 'none')
  expect(await tabs.evaluate((node) => getComputedStyle(node, '::-webkit-scrollbar').display)).toBe(
    'none',
  )
  await expect(native).toHaveCSS('scrollbar-width', 'thin')
  for (const scroller of [tabs, native]) {
    const before = await scroller.evaluate((node) => node.scrollLeft)
    await scroller.hover()
    await page.mouse.wheel(160, 0)
    await expect.poll(() => scroller.evaluate((node) => node.scrollLeft)).toBeGreaterThan(before)
  }
})

test('Denied clipboard captures actual temporary textarea styling before exact-node cleanup', async ({
  page,
  context,
}) => {
  await mountRuntimeFixture(page, '/components/input-copy', clipboardCode)
  const cdp = await context.newCDPSession(page)
  const { targetInfo } = await cdp.send('Target.getTargetInfo')
  if (targetInfo.browserContextId === undefined) throw new Error('Isolated context required')
  await cdp.send('Browser.setPermission', {
    browserContextId: targetInfo.browserContextId,
    permission: { name: 'clipboard-write' },
    setting: 'denied',
  })
  const observation = await page.evaluateHandle(() => {
    const snapshots: Array<{
      command: string
      value: string
      position: string
      opacity: string
      fontSize: string
      readOnly: boolean
      start: number
      end: number
      result: boolean
    }> = []
    let captured: HTMLTextAreaElement | null = null
    const descriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')
    const execute = document.execCommand
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: function (this: Document, ...args: Parameters<Document['execCommand']>) {
        const [command] = args
        const textarea = document.querySelector('textarea')
        if (textarea === null) throw new Error('Missing live fallback textarea')
        captured = textarea
        const style = getComputedStyle(textarea)
        const result = Reflect.apply(execute, this, args)
        snapshots.push({
          command,
          value: textarea.value,
          position: style.position,
          opacity: style.opacity,
          fontSize: style.fontSize,
          readOnly: textarea.readOnly,
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
          result,
        })
        return result
      },
    })
    return {
      read: () => ({ snapshots, removed: captured !== null && !captured.isConnected }),
      restore: () => {
        if (descriptor === undefined) Reflect.deleteProperty(document, 'execCommand')
        else Object.defineProperty(document, 'execCommand', descriptor)
      },
    }
  })
  try {
    await page.locator('#copy-contract-button').click()
    await expect(page.locator('#copy-contract-button')).toHaveAttribute('aria-label', 'Copied')
    expect(await observation.evaluate((value) => value.read())).toEqual({
      snapshots: [
        {
          command: 'copy',
          value: 'fallback value',
          position: 'fixed',
          opacity: '0',
          fontSize: '16px',
          readOnly: true,
          start: 0,
          end: 14,
          result: true,
        },
      ],
      removed: true,
    })
    await expect(page.locator('textarea')).toHaveCount(0)
  } finally {
    await observation.evaluate((value) => value.restore())
    await observation.dispose()
    await cdp.detach()
  }
})

test('Slider actual layout keeps comfortable and compact previews and fixed tooltips through pointer dragging', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/slider', sliderCode)
  const comfortable = page.locator('#scrubber')
  const track = comfortable.locator('[data-slider-track]')
  await expect(track).toBeVisible()
  const retained = await track.elementHandle()
  if (retained === null) throw new Error('Missing comfortable Slider track')
  const box = await track.boundingBox()
  if (box === null) throw new Error('Missing comfortable Slider geometry')
  expect(box.width).toBe(320)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const bubble = comfortable.getByText('50', { exact: true }).locator('..')
  await expect(bubble).toHaveText('50')
  await expect(bubble).toHaveCSS('top', '-30px')
  await expect(bubble).toHaveCSS('left', '159px')
  await page.mouse.move(box.x + 24, box.y + box.height / 2)
  await page.mouse.down()
  await expect(comfortable.locator('input[type="range"]')).toHaveValue('8')
  await page.mouse.move(box.x + 34, box.y + box.height / 2)
  await expect(comfortable.locator('input[type="range"]')).toHaveValue('11')
  await page.mouse.up()
  await page.mouse.move(1, 1)
  await expect(bubble).toHaveCount(0)
  expect(await track.evaluate((node, original) => node === original, retained)).toBe(true)
  await retained.dispose()

  const fixed = page.locator('#base [data-slider-track]')
  await fixed.hover()
  const tooltip = page.locator('#base [data-slider-tooltip="0"]')
  await expect(tooltip).toHaveText('0.5×')
  await expect(tooltip).toHaveCSS('top', '-16px')
  await expect(tooltip).toHaveCSS('left', '0px')
  await expect
    .poll(async () => Number(await tooltip.evaluate((node) => getComputedStyle(node).opacity)))
    .toBeGreaterThan(0.9)

  const compact = page.locator('#radix [data-slider-track]')
  const compactBox = await compact.boundingBox()
  if (compactBox === null) throw new Error('Missing compact Slider geometry')
  expect(compactBox.width).toBeGreaterThan(160)
  await page.mouse.move(compactBox.x + compactBox.width / 2, compactBox.y + compactBox.height / 2)
  const compactBubble = compact.getByText('50', { exact: true }).locator('..')
  await expect(compactBubble).toHaveText('50')
  await expect(compactBubble).toHaveCSS('top', '-20px')
  expect(
    await compactBubble.evaluate((node) => parseFloat(getComputedStyle(node).left)),
  ).toBeCloseTo(compactBox.width / 2, 0)
  await page.mouse.move(1, 1)
  await expect(compactBubble).toHaveCount(0)
})

test('Dialog portal host consumes contents and its full-width fixed inherited-color surface survives reopening', async ({
  page,
}) => {
  await page.goto('/components/dialog')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const portal = page.locator('[data-fluid-dialog-portal-root]')
  await expect(portal).toHaveCSS('display', 'contents')
  await page.evaluate(() => {
    document.body.style.color = 'rgb(21, 45, 71)'
  })
  const trigger = page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('button', { name: 'Open dialog', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'A little focus', exact: true })
  await expect(dialog).toBeVisible()
  const panel = await dialog.locator('[data-fluid-dialog-panel]').elementHandle()
  if (panel === null) throw new Error('Missing mounted dialog panel')
  await expect(dialog).toHaveCSS('position', 'fixed')
  await expect(dialog).toHaveCSS('color', 'rgb(21, 45, 71)')
  // Scroll locking expands clientWidth with classic scrollbars, but the stable gutter remains.
  const viewport = await page.evaluate(() => ({
    x: 0,
    y: 0,
    width: document.documentElement.getBoundingClientRect().width,
    height: window.innerHeight,
  }))
  expect(await dialog.boundingBox()).toEqual(viewport)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await trigger.evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw new Error('Missing dialog trigger element')
    node.click()
  })
  await expect(dialog).toBeVisible()
  expect(
    await dialog
      .locator('[data-fluid-dialog-panel]')
      .evaluate((node, original) => node === original, panel),
  ).toBe(true)
  await expect(dialog).toHaveCSS('position', 'fixed')
  await expect(dialog).toHaveCSS('color', 'rgb(21, 45, 71)')
  expect(await dialog.boundingBox()).toEqual(viewport)
  await panel.dispose()
})

test('DatePicker popup shares the display-contents portal consumer across complete exits', async ({
  page,
}) => {
  await page.goto('/components/date-picker')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const trigger = preview.locator('[data-slot="date-picker-trigger"]')
  await trigger.click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  const portal = page.locator('[data-fluid-dialog-portal-root]')
  await expect(portal).toHaveCSS('display', 'contents')
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  await trigger.click()
  await expect(popup).toBeVisible()
  await expect(portal).toHaveCSS('display', 'contents')
})
