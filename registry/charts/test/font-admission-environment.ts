import { vi } from 'vitest'
import { fontTestEnvironment } from './font-test-environment'

export const fontAdmissionEnvironment = () => {
  const environment = fontTestEnvironment()
  const { container } = environment
  const outer = document.createElement('section')
  const inner = document.createElement('section')
  container.replaceWith(outer)
  outer.append(inner)
  inner.append(container)
  let hasBox = true

  const visibility = vi.fn(
    (options?: CheckVisibilityOptions) =>
      hasBox &&
      !(
        options?.contentVisibilityAuto === true && container.closest('[data-test-skipped]') !== null
      ),
  )

  Object.defineProperty(container, 'checkVisibility', { configurable: true, value: visibility })
  const styles = vi.spyOn(window, 'getComputedStyle')
  const observers: Array<Observer> = []

  class Observer implements ResizeObserver {
    readonly notify: ResizeObserverCallback
    target: Element | undefined
    constructor(notify: ResizeObserverCallback) {
      this.notify = notify
      observers.push(this)
    }
    observe(target: Element) {
      this.target = target
    }
    unobserve(target: Element) {
      if (this.target === target) {
        this.target = undefined
      }
    }
    readonly disconnect = vi.fn<() => void>()
    deliver(width = 400, height = 240) {
      const { target } = this

      if (target === undefined) {
        throw new Error('Expected an observed chart container')
      }

      this.notify(
        [
          {
            target,
            contentRect: new DOMRect(0, 0, width, height),
            borderBoxSize: [{ inlineSize: width, blockSize: height }],
            contentBoxSize: [{ inlineSize: width, blockSize: height }],
            devicePixelContentBoxSize: [{ inlineSize: width, blockSize: height }],
          },
        ],
        this,
      )
    }
  }

  vi.stubGlobal('ResizeObserver', Observer)

  return {
    ...environment,
    styles,
    visibility,
    observers,
    skip: (ancestor: 'outer' | 'inner', skipped: boolean) => {
      ;(ancestor === 'outer' ? outer : inner).toggleAttribute('data-test-skipped', skipped)
    },
    box: (present: boolean) => {
      hasBox = present
    },
    unsupported: (kind: 'observer' | 'visibility' | 'option') => {
      if (kind === 'observer') {
        Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined })
      } else if (kind === 'visibility') {
        Object.defineProperty(container, 'checkVisibility', {
          configurable: true,
          value: undefined,
        })
      } else {
        visibility.mockImplementation(() => true)
      }
    },
    destroy: () => {
      environment.destroy()
      outer.remove()
    },
  }
}
