import type { LiveCursor } from './options'
import type { Frame } from './live-frame'
import { drawnValueAt } from './rows'
import { createCrosshairGlide } from './glide'
import type { GlideGeometry } from './glide'

export interface LiveFocusView extends GlideGeometry {
  readonly cursor: LiveCursor | null
  readonly right: number
  readonly bottom: number
}

export function createLiveFocusResource(
  element: HTMLElement,
  read: () => LiveFocusView,
  clock: () => number,
) {
  const glide = createCrosshairGlide(element, read, clock)
  let priorCursor: LiveCursor | null = null

  let box: DOMRect | null = null,
    previousFrame: Frame | null = null,
    tickAt = 0,
    edgeFrame = 0,
    atEdge = false

  const clearVar = (name: string) => element.style.removeProperty(name)

  const stopEdge = () => {
    cancelAnimationFrame(edgeFrame)
    edgeFrame = 0
    delete element.dataset.bkmKedge
    clearVar('--bkm-kex')
    clearVar('--bkm-key')
  }

  const edge = () => {
    const keep = atEdge
    stopEdge()

    const view = read(),
      frame = view.frame,
      cursor = view.cursor

    if (frame === null || frame.seed || cursor === null || cursor.key === 'live:cursor') {
      atEdge = false

      return
    }

    const kx = view.left + (cursor.t - view.x0) * view.pxPerMs

    if (!frame.jump || !element.hasAttribute('data-bkm-jump')) {
      atEdge = kx < view.left

      return
    }

    const pinned = keep && kx < view.left

    if (!pinned && kx >= view.left) {
      atEdge = false

      return
    }

    const yAt = (x: number) =>
      view.top +
      ((frame.yDomain[1] -
        drawnValueAt(frame.rows, view.x0 + (x - view.left) / (view.pxPerMs || 1))) *
        view.height) /
        (frame.yDomain[1] - frame.yDomain[0] || 1)

    const at = yAt(view.left)

    const write = () => {
      const shift = Number.parseFloat(getComputedStyle(element).getPropertyValue('--bkm-fxr')) || 0
      const x = pinned ? view.left : Math.max(view.left, kx + shift)
      atEdge = x <= view.left
      element.style.setProperty('--bkm-kex', (x - view.left).toFixed(2))
      element.style.setProperty('--bkm-key', (yAt(x - shift) - at).toFixed(2))

      return shift
    }

    element.dataset.bkmKedge = ''
    write()

    const step = () => {
      if (write() === 0) {
        edgeFrame = 0

        return
      }

      edgeFrame = requestAnimationFrame(step)
    }

    edgeFrame = requestAnimationFrame(step)
  }

  const apply = () => {
    const view = read(),
      cursor = view.cursor

    if (cursor === priorCursor && view.frame === previousFrame) {
      return
    }

    priorCursor = cursor

    if (view.frame !== previousFrame) {
      previousFrame = view.frame
      tickAt = clock()

      if (cursor !== null) {
        element.style.setProperty('--bkm-fxd', '0ms')
      }
    }

    if (cursor === null) {
      glide.stop()
      stopEdge()
      atEdge = false

      for (const name of ['--bkm-fx', '--bkm-kx', '--bkm-pl']) {
        clearVar(name)
      }

      delete element.dataset.bkmKfx
      delete element.dataset.bkmLiveScrubbing

      return
    }

    element.dataset.bkmLiveScrubbing = ''

    if (cursor.key === 'live:cursor') {
      stopEdge()
      atEdge = false
      delete element.dataset.bkmKfx
      clearVar('--bkm-kx')
      element.style.setProperty('--bkm-fx', cursor.x.toFixed(1))
      glide.glideTo(cursor.x)

      return
    }

    glide.stop()
    clearVar('--bkm-fx')
    element.style.setProperty(
      '--bkm-kx',
      (view.left + (cursor.t - view.x0) * view.pxPerMs).toFixed(2),
    )
    element.style.setProperty('--bkm-pl', view.left.toFixed(2))
    element.style.setProperty('--bkm-fxd', `${-Math.round(clock() - tickAt)}ms`)
    element.dataset.bkmKfx = ''
    edge()
  }

  const drop = () => {
    box = null
  }

  const move = (event: PointerEvent) => {
    const view = read()
    box ??= element.getBoundingClientRect()

    const x = event.clientX - box.left,
      y = event.clientY - box.top

    if (
      view.cursor?.key === 'live:cursor' &&
      x >= view.left &&
      x <= view.right &&
      y >= view.top &&
      y <= view.bottom
    ) {
      element.style.setProperty('--bkm-fx', x.toFixed(1))
      glide.glideTo(x)
    }
  }

  const swallow = (event: Event) => {
    if (event instanceof PointerEvent && event.pointerType === 'touch') {
      event.stopPropagation()
    }
  }

  const types = ['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerenter', 'click']

  for (const type of types) {
    element.addEventListener(type, swallow, true)
  }

  const resize = new ResizeObserver(drop)
  resize.observe(element)
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerenter', drop)
  window.addEventListener('scroll', drop, { capture: true, passive: true })
  window.addEventListener('resize', drop)

  return {
    apply,
    destroy() {
      glide.destroy()
      stopEdge()
      resize.disconnect()

      for (const type of types) {
        element.removeEventListener(type, swallow, true)
      }

      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerenter', drop)
      window.removeEventListener('scroll', drop, { capture: true })
      window.removeEventListener('resize', drop)
    },
  }
}
