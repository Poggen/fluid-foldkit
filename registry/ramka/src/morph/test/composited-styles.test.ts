// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { required } from '../../../test/fixtures/required'
import { createMorphStyles } from '../styles'
import { createCompositedMorph } from '../vt-composited-morph'

const browserWindow = required(document.defaultView)
const gestureDescriptor = Object.getOwnPropertyDescriptor(browserWindow, 'GestureEvent')
const adoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')
const resources = new Set<ReturnType<typeof fixture>>()

function fixture() {
  const styles = createMorphStyles(document)
  const compositor = createCompositedMorph(document, styles)
  const resource = {
    compositor,
    dispose() {
      compositor.dispose()
      styles.dispose()
    },
  }
  resources.add(resource)
  return resource
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- The native ready/finished promise chains must settle independently of the real CSSOM updates.
async function flushTransition() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- This controls only native View Transition delivery, which HappyDOM does not implement; the compositor and stylesheet cascade remain real.
async function start(resource: ReturnType<typeof fixture>, from: Keyframe, to: Keyframe) {
  const finished = Promise.withResolvers<void>()
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [
      {
        animationName: '-ua-view-transition-group-anim-lightbox-morph',
        currentTime: 0,
        cancel() {},
        effect: {
          pseudoElement: '::view-transition-group(lightbox-morph)',
          getKeyframes: () => [
            { offset: 0, ...from },
            { offset: 1, ...to },
          ],
          getComputedTiming: () => ({ duration: 360 }),
        },
      },
    ],
  })
  resource.compositor.prewarmCompositedCssSheet()
  resource.compositor.maybeUpgradeToCompositedMorph({
    ready: Promise.resolve(),
    finished: finished.promise,
  })
  await flushTransition()
  return finished
}

afterEach(() => {
  for (const resource of resources) resource.dispose()
  resources.clear()
  if (gestureDescriptor) Object.defineProperty(browserWindow, 'GestureEvent', gestureDescriptor)
  else Reflect.deleteProperty(browserWindow, 'GestureEvent')
  if (adoptedStyleSheetsDescriptor) {
    Object.defineProperty(document, 'adoptedStyleSheets', adoptedStyleSheetsDescriptor)
  } else {
    Reflect.deleteProperty(document, 'adoptedStyleSheets')
  }
  document.adoptedStyleSheets = []
  Reflect.deleteProperty(document, 'getAnimations')
  document.documentElement.removeAttribute('data-ramka-vt-composited-css')
  document.documentElement.removeAttribute('style')
  document.head.replaceChildren()
})

describe('document WebKit keyframes', () => {
  it.each(['constructed', 'style element'] as const)(
    'keeps the latest geometry and its styles across alternating roots with %s delivery',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Native transition completion remains independently controlled while actual CSSOM rules expose the cross-root cascade.
    async (delivery) => {
      Object.defineProperty(browserWindow, 'GestureEvent', { configurable: true, value: class {} })
      if (delivery === 'style element') {
        Object.defineProperty(document, 'adoptedStyleSheets', {
          configurable: true,
          value: undefined,
        })
      }
      document.documentElement.style.cssText =
        'width: 800px; height: 600px; transform-origin: 0px 0px'
      const first = fixture()
      const second = fixture()
      const small = {
        transform: 'matrix(1, 0, 0, 1, 100, 200)',
        width: '200px',
        height: '150px',
      }
      const other = {
        transform: 'matrix(1, 0, 0, 1, 400, 50)',
        width: '100px',
        height: '75px',
      }
      const large = { transform: 'matrix(1, 0, 0, 1, 0, 0)', width: '800px', height: '600px' }
      const rules = () =>
        [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])].flatMap((sheet) =>
          Array.from(sheet.cssRules),
        )
      const groups = () =>
        rules().filter(
          (rule): rule is CSSKeyframesRule =>
            rule instanceof CSSKeyframesRule && rule.name === 'ramka-vt-cm-group',
        )

      const firstOpen = await start(first, small, large)
      firstOpen.resolve()
      await flushTransition()
      const secondOpen = await start(second, other, large)
      secondOpen.resolve()
      await flushTransition()
      const firstClose = await start(first, large, small)
      const winning = required(groups().at(-1))
      expect(required(winning.cssRules[0]).cssText).toContain('translate(0px, 0px) scale(4, 4)')
      expect(groups()).toHaveLength(1)

      second.dispose()
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(true)
      expect(groups()).toEqual([winning])
      firstClose.resolve()
      await flushTransition()
      expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(false)
      first.dispose()
      expect(rules()).toHaveLength(0)
    },
  )
})
