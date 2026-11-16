import { vi } from 'vitest'

export const fontTestEnvironment = () => {
  let bounds = { width: 20, left: 0, right: 20, ascent: 9, descent: 3 }

  const measure = vi.fn((text: string) => ({
    width: text === 'November' ? bounds.width * 2 : bounds.width,
    actualBoundingBoxLeft: bounds.left,
    actualBoundingBoxRight: bounds.right,
    actualBoundingBoxAscent: bounds.ascent,
    actualBoundingBoxDescent: bounds.descent,
  }))

  const context = { font: '', measureText: measure }

  const canvasDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext',
  )

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => context,
  })
  const observations = new Map<ResizeObserver, () => void>()

  class Observer implements ResizeObserver {
    readonly notify: ResizeObserverCallback
    constructor(notify: ResizeObserverCallback) {
      this.notify = notify
    }
    observe(target: Element) {
      observations.set(this, () => {
        this.notify(
          [
            {
              target,
              contentRect: new DOMRect(0, 0, 400, 240),
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this,
        )
      })
    }
    unobserve() {
      observations.delete(this)
    }
    disconnect() {
      observations.delete(this)
    }
  }

  vi.stubGlobal('ResizeObserver', Observer)
  const fonts = new EventTarget()
  const fontDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  let nextFrame = 1
  const frames = new Map<number, FrameRequestCallback>()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((deliver) => {
    const id = nextFrame
    nextFrame += 1
    frames.set(id, deliver)

    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  const container = document.createElement('div')
  container.style.fontFamily = 'Original'
  container.style.fontWeight = '400'
  document.body.append(container)

  return {
    container,
    context,
    measure,
    frames,
    setBounds: (next: Partial<typeof bounds>) => {
      bounds = { ...bounds, ...next }
    },
    loaded: () => fonts.dispatchEvent(new Event('loadingdone')),
    flush: () => {
      const scheduled = [...frames.values()]
      frames.clear()

      for (const deliver of scheduled) {
        deliver(100)
      }

      const admitted = [...observations.values()]
      observations.clear()

      for (const deliver of admitted) {
        deliver()
      }
    },
    unavailable: () =>
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: () => null,
      }),
    destroy: () => {
      container.remove()

      if (canvasDescriptor !== undefined) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', canvasDescriptor)
      }

      if (fontDescriptor === undefined) {
        Reflect.deleteProperty(document, 'fonts')
      } else {
        Object.defineProperty(document, 'fonts', fontDescriptor)
      }

      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    },
  }
}
