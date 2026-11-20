// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachBrowserGuards } from '../src/browser-guards.js'
const resources: Array<ReturnType<typeof attachBrowserGuards>> = []
afterEach(() => {
  for (const resource of resources.splice(0)) resource.dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
})
function fixture() {
  const portal = document.createElement('div')
  portal.setAttribute('data-ramka-portal', '')
  const host = document.createElement('dialog')
  const backdrop = document.createElement('div')
  backdrop.setAttribute('data-ramka-backdrop', '')
  const button = document.createElement('button')
  host.append(button)
  portal.append(backdrop, host)
  document.body.append(portal)
  const resource = attachBrowserGuards(host)
  resources.push(resource)
  return { host, backdrop, button, resource }
}
function touch(
  target: HTMLElement,
  type: string,
  points: ReadonlyArray<readonly [number, number]>,
) {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: points.map(
      ([clientX, clientY], identifier) => new Touch({ target, identifier, clientX, clientY }),
    ),
  })
  target.dispatchEvent(event)
  return event
}
function scrollable(parent: HTMLElement, scrollTop: number) {
  const panel = document.createElement('section')
  panel.style.overflowY = 'auto'
  Object.defineProperties(panel, {
    scrollHeight: { configurable: true, value: 500 },
    clientHeight: { configurable: true, value: 100 },
  })
  panel.scrollTop = scrollTop
  const child = document.createElement('button')
  panel.append(child)
  parent.append(panel)
  return { panel, child }
}
describe('mounted browser guards', () => {
  it('blocks page pinch during preparation, including the leftover finger, and releases on disposal', () => {
    const { resource } = fixture()
    expect(document.documentElement.style.overflow).toBe('')
    touch(document.body, 'touchstart', [
      [10, 10],
      [20, 20],
    ])
    expect(
      touch(document.body, 'touchmove', [
        [10, 10],
        [25, 25],
      ]).defaultPrevented,
    ).toBe(true)
    touch(document.body, 'touchend', [[10, 10]])
    expect(touch(document.body, 'touchmove', [[12, 30]]).defaultPrevented).toBe(true)
    touch(document.body, 'touchend', [])
    expect(touch(document.body, 'touchmove', [[12, 35]]).defaultPrevented).toBe(false)
    const pinch = Object.assign(new WheelEvent('wheel', { bubbles: true, cancelable: true }), {
      ctrlKey: true,
    })
    document.body.dispatchEvent(pinch)
    expect(pinch.defaultPrevented).toBe(true)
    const scroll = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 20 })
    document.body.dispatchEvent(scroll)
    expect(scroll.defaultPrevented).toBe(false)
    resource.dispose()
    expect(
      touch(document.body, 'touchmove', [
        [10, 10],
        [25, 25],
      ]).defaultPrevented,
    ).toBe(false)
    const after = Object.assign(new WheelEvent('wheel', { bubbles: true, cancelable: true }), {
      ctrlKey: true,
    })
    document.body.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })
  it('uses Safari gesture cancellation while leaving ancestor wheel scrolling native', () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch cancellation; this selects Safari's proprietary gesture-event branch in HappyDOM.
    vi.stubGlobal('GestureEvent', Event)
    const { resource } = fixture()
    const gesture = new Event('gesturechange', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(gesture)
    expect(gesture.defaultPrevented).toBe(true)
    const wheel = Object.assign(new WheelEvent('wheel', { bubbles: true, cancelable: true }), {
      ctrlKey: true,
    })
    document.body.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    resource.dispose()
    const after = new Event('gesturestart', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })
  it('contains vertical chrome and backdrop drags after six pixels without swallowing taps or horizontal slides', () => {
    const { button, backdrop } = fixture()
    for (const target of [button, backdrop]) {
      touch(target, 'touchstart', [[0, 0]])
      expect(touch(target, 'touchmove', [[2, 5]]).defaultPrevented).toBe(false)
      expect(touch(target, 'touchmove', [[2, 6]]).defaultPrevented).toBe(true)
      touch(target, 'touchend', [])
      touch(target, 'touchstart', [[0, 0]])
      expect(touch(target, 'touchmove', [[7, 2]]).defaultPrevented).toBe(false)
      expect(touch(target, 'touchmove', [[7, 40]]).defaultPrevented).toBe(false)
      touch(target, 'touchend', [])
    }
  })
  it('allows an inner scroller in its available direction and prevents pan beyond its edges', () => {
    const { host } = fixture()
    const { panel, child } = scrollable(host, 0)
    touch(child, 'touchstart', [[0, 0]])
    expect(touch(child, 'touchmove', [[0, -10]]).defaultPrevented).toBe(false)
    panel.scrollTop = 400
    expect(touch(child, 'touchmove', [[0, -20]]).defaultPrevented).toBe(false)
    touch(child, 'touchend', [])
    touch(child, 'touchstart', [[0, 0]])
    expect(touch(child, 'touchmove', [[0, -10]]).defaultPrevented).toBe(true)
    touch(child, 'touchend', [])
    touch(child, 'touchstart', [[0, 0]])
    expect(touch(child, 'touchmove', [[0, 10]]).defaultPrevented).toBe(false)
    touch(child, 'touchend', [])
    panel.scrollTop = 0
    touch(child, 'touchstart', [[0, 0]])
    expect(touch(child, 'touchmove', [[0, 10]]).defaultPrevented).toBe(true)
  })
  it.each(['outer-first', 'inner-first'])(
    'compensates once and restores original styles only after the final nested owner (%s)',
    (order) => {
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production modal lifecycle comparison checks scroll lock and restoration; this supplies the native scrollbar gutter missing from HappyDOM.
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1020)
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000)
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
      vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(2)
      document.documentElement.style.setProperty('overflow', 'clip', 'important')
      document.documentElement.style.setProperty('user-select', 'text', 'important')
      document.body.style.paddingInlineEnd = '10px'
      const outer = fixture().resource
      const inner = fixture().resource
      outer.applySelectionGuard()
      expect(document.documentElement.style.userSelect).toBe('text')
      outer.lockScroll()
      outer.lockScroll()
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(document.body.style.paddingInlineEnd).toBe('30px')
      expect(document.documentElement.style.userSelect).toBe('text')
      outer.applySelectionGuard()
      inner.lockScroll()
      inner.applySelectionGuard()
      expect(document.documentElement.style.userSelect).toBe('none')
      expect(document.body.style.paddingInlineEnd).toBe('30px')
      const first = order === 'outer-first' ? outer : inner
      const last = order === 'outer-first' ? inner : outer
      first.dispose()
      first.dispose()
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(document.documentElement.style.userSelect).toBe('none')
      last.dispose()
      expect(document.documentElement.style.overflow).toBe('clip')
      expect(document.documentElement.style.getPropertyPriority('overflow')).toBe('important')
      expect(document.documentElement.style.userSelect).toBe('text')
      expect(document.documentElement.style.getPropertyPriority('user-select')).toBe('important')
      expect(document.body.style.paddingInlineEnd).toBe('10px')
      expect(document.documentElement.style.getPropertyValue('scrollbar-width')).toBe('')
      last.lockScroll()
      last.applySelectionGuard()
      expect(document.documentElement.style.overflow).toBe('clip')
    },
  )
  it('skips selection writes on a mouse-only device and restores absent styles exactly', () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production modal lifecycle comparison checks scroll lock and restoration; this supplies the native scrollbar gutter missing from HappyDOM.
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: four trajectory comparisons across three engines check touch ownership; this fixes the external device capability for the touch-only branch.
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0)
    const { resource } = fixture()
    resource.lockScroll()
    resource.applySelectionGuard()
    expect(document.documentElement.style.userSelect).toBe('')
    expect(document.body.style.paddingInlineEnd).toBe('')
    resource.dispose()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.documentElement.style.getPropertyValue('-webkit-user-select')).toBe('')
  })
})
