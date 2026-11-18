import type { ChartValue, ChartInteractionController } from '@tanstack/charts'

export const mountTapFocus: <Mark, X extends ChartValue = number, Y extends ChartValue = number>(
  el: HTMLElement,
  getInteraction: () => ChartInteractionController<Mark, X, Y> | undefined,
  mode?: 'tap' | 'press',
) => () => void = function mountTapFocus<
  Mark,
  X extends ChartValue = number,
  Y extends ChartValue = number,
>(
  el: HTMLElement,
  getInteraction: () => ChartInteractionController<Mark, X, Y> | undefined,
  mode: 'tap' | 'press' = 'tap',
) {
  const TAP_SLOP_PX = 10
  const down = new Map<number, { x: number; y: number }>()
  let tapOk = false

  const inside: (event: Event) => boolean = (event: Event) =>
    event.target instanceof Node && el.contains(event.target)

  const focusAt: (x: number, y: number) => void = (x: number, y: number) => {
    const interaction = getInteraction()
    interaction?.setControlledFocus(interaction.resolvePointer(x, y), { source: 'pointer' })
  }

  const clear: () => void = () => getInteraction()?.setControlledFocus(null, { source: 'pointer' })

  const onDown: (event: PointerEvent) => void = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return
    }

    const within = inside(event)

    if (within) {
      event.stopPropagation()
      event.preventDefault()
    }

    tapOk = down.size === 0
    down.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (mode === 'press' && within) {
      focusAt(event.clientX, event.clientY)
    }
  }

  const onMove: (event: PointerEvent) => void = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return
    }

    if (inside(event)) {
      event.stopPropagation()
    }

    const origin = down.get(event.pointerId)

    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > TAP_SLOP_PX) {
      tapOk = false

      if (mode === 'press') {
        clear()
      }
    }
  }

  const onUp: (event: PointerEvent) => void = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !down.has(event.pointerId)) {
      return
    }

    const within = inside(event)

    if (within) {
      event.stopPropagation()
    }

    const wasTap = tapOk && down.size === 1
    down.delete(event.pointerId)
    tapOk = false

    if (mode === 'press') {
      clear()
    } else if (wasTap) {
      if (within) {
        focusAt(event.clientX, event.clientY)
      } else {
        clear()
      }
    }
  }

  const onCancel: (event: PointerEvent) => void = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && down.delete(event.pointerId)) {
      tapOk = false

      if (mode === 'press') {
        clear()
      }
    }
  }

  const swallowClick: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (mode === 'tap' && event instanceof PointerEvent && event.pointerType === 'touch') {
      event.stopPropagation()
    }
  }

  const mouseDown: (event: MouseEvent) => void = (event: MouseEvent) => {
    event.preventDefault()
  }

  window.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onCancel, true)
  el.addEventListener('click', swallowClick, true)
  el.addEventListener('mousedown', mouseDown, true)

  return (() => {
    window.removeEventListener('pointerdown', onDown, true)
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onCancel, true)
    el.removeEventListener('click', swallowClick, true)
    el.removeEventListener('mousedown', mouseDown, true)
  }) satisfies () => void
}
