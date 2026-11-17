import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers.js'

const observe = (page: Page) =>
  page.evaluateHandle(() => {
    const events: unknown[] = []
    const removals: unknown[] = []
    const triggers = [...document.querySelectorAll<HTMLElement>('[data-tooltip-trigger]')]
    const identify = (target: EventTarget | null) =>
      target instanceof Element ? { tag: target.tagName, id: target.id } : null
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          removals.push({
            node: identify(node),
            triggers: triggers
              .filter((trigger) => node === trigger || node.contains(trigger))
              .map((trigger) => trigger.id),
          })
        }
      }
    })
    observer.observe(document, { subtree: true, childList: true })
    for (const type of [
      'pointerover',
      'pointerenter',
      'pointerout',
      'pointerleave',
      'pointermove',
      'focusin',
      'focusout',
    ]) {
      document.addEventListener(
        type,
        (event) => {
          events.push({
            type,
            target: identify(event.target),
            related:
              event instanceof MouseEvent || event instanceof FocusEvent
                ? identify(event.relatedTarget)
                : null,
            point: event instanceof PointerEvent ? { x: event.clientX, y: event.clientY } : null,
            trusted: event.isTrusted,
            prevented: event.defaultPrevented,
          })
        },
        { capture: true, passive: true },
      )
    }
    return {
      events,
      removals,
      snapshot: () => ({
        active: identify(document.activeElement),
        visibility: document.visibilityState,
        compatMode: document.compatMode,
        triggers: triggers.map((node) => ({
          id: node.id,
          same: node === document.getElementById(node.id),
          connected: node.isConnected,
          describedBy: node.getAttribute('aria-describedby'),
        })),
      }),
    }
  })

const traces = new WeakMap<Page, Awaited<ReturnType<typeof observe>>>()
test.afterEach(async ({ page }, testInfo) => {
  const trace = traces.get(page)
  if (trace === undefined) return
  await testInfo.attach('tooltip-document-control', {
    body: JSON.stringify(
      await trace.evaluate((value) => ({
        events: value.events,
        removals: value.removals,
        final: value.snapshot(),
      })),
      null,
      2,
    ),
    contentType: 'application/json',
  })
  await trace.dispose()
})

let code = ''
test.beforeAll(async () => {
  code = await bundleRuntimeFixture(
    new URL('./tooltip-contract-fixture.ts', import.meta.url).pathname,
  )
})

for (const mode of ['standards', 'quirks']) {
  test(`bare ${mode} document dispatches native departure events between controls and blank space`, async ({
    page,
  }) => {
    await page.goto('about:blank')
    await page.setContent(
      (mode === 'standards' ? '<!doctype html>' : '') +
        '<html><body><button id="first">First</button><button id="second" style="margin-left:80px">Second</button></body></html>',
    )
    const trace = await observe(page)
    traces.set(page, trace)
    await page.locator('#first').hover()
    await page.locator('#second').hover()
    await page.mouse.move(1200, 850)
    const left = await trace.evaluate(
      (value) =>
        value.events.filter((event) => {
          if (typeof event !== 'object' || event === null || !('type' in event)) return false
          return event.type === 'pointerleave'
        }).length,
    )
    expect(left).toBeGreaterThanOrEqual(2)
  })
}

for (const mode of ['standards', 'quirks']) {
  for (const documentKind of ['source app document', 'clean document']) {
    test(`${documentKind} in ${mode} mode retains trigger identity and closes a pass-through tooltip`, async ({
      page,
    }) => {
      const doctype = mode === 'standards' ? '<!doctype html>' : ''
      if (documentKind === 'source app document') {
        await mountRuntimeFixture(
          page,
          '/components/tooltip',
          code,
          doctype + '<main id="style-contract-root"></main>',
        )
      } else {
        await page.goto('/components/tooltip')
        const styles = await page
          .locator('link[rel="stylesheet"]')
          .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href))
        await page.route('**/tooltip-pointer-clean-document', (route) =>
          route.fulfill({
            contentType: 'text/html',
            body:
              doctype +
              '<html><head>' +
              styles.map((url) => `<link rel="stylesheet" href="${url}">`).join('') +
              '</head><body><main id="style-contract-root"></main></body></html>',
          }),
        )
        await page.goto('/tooltip-pointer-clean-document')
        await page.evaluate(async () => {
          await document.fonts.ready
        })
        await page.addScriptTag({ content: code })
      }
      traces.set(page, await observe(page))
      const trigger = page.locator('#trigger-hover-off')
      await trigger.hover()
      await expect(trigger).toHaveAttribute('aria-describedby', 'hover-off-popup')
      await expect(page.locator('#hover-off-popup')).toHaveCSS('pointer-events', 'none')
      const box = await page.locator('#hover-off-popup').boundingBox()
      if (box === null) throw new Error('Missing pass-through popup geometry')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(trigger).not.toHaveAttribute('aria-describedby')
    })
  }
}
