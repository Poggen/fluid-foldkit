import type { ChartValue, ChartInteractionController, ChartPoint } from '@tanstack/charts'

export function createKeyboardHold<
  Mark,
  X extends ChartValue = number,
  Y extends ChartValue = number,
>(el: HTMLElement, getInteraction: () => ChartInteractionController<Mark, X, Y> | undefined) {
  type Point = ChartPoint<Mark, X, Y>

  let held: Point | null = null,
    current: Point | null = null,
    keyboardInput = false,
    restoredByUs = false

  const NAVIGATION_KEYS = new Set([
    'ArrowRight',
    'ArrowLeft',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ])

  const samePoint = (a: Point | null, b: Point | null): boolean =>
    a === b ||
    (a !== null &&
      b !== null &&
      a.key === b.key &&
      a.markId === b.markId &&
      a.datumIndex === b.datumIndex)

  const onFocus = (point: Point | null): void => {
    current = point

    if (point !== null && keyboardInput) {
      held = point
      restoredByUs = false
    }
  }

  // A pointer move reached the renderer since the hold was last put back, so the renderer counts the focus as pointer-owned.
  let pointerTook = false
  // The resting pointer (client coordinates; null once it leaves or for touch), whether a key press owns the focus since the last
  // move that resolved a point, and whether the focus is the one a blur handed to the pointer.
  let pointer: { x: number; y: number } | null = null
  let keyboardOwns = false
  let handedToPointer = false

  const restore = (): void => {
    const point = held

    if (point === null || (samePoint(current, point) && !pointerTook)) {
      return
    }

    pointerTook = false
    restoredByUs = true
    // TanStack's controller types only 'pointer' | 'programmatic'; the renderer takes any ChartFocusSource (renderer.ts:641).
    // Also hands ownership over (focusOwner 'controlled'), so the renderer's pointer-owned leave clear (renderer.ts:718-728) skips it.
    getInteraction()?.setControlledFocus(point, { source: 'programmatic' })
  }

  const key = (event: KeyboardEvent): void => {
    keyboardInput = NAVIGATION_KEYS.has(event.key)
    keyboardOwns ||= keyboardInput
  }

  const move = (event: PointerEvent): void => {
    keyboardInput = false

    if (event.pointerType === 'touch') {
      return
    }

    pointer = { x: event.clientX, y: event.clientY }
    handedToPointer = false
    const interaction = getInteraction()

    if (held === null && !keyboardOwns) {
      return
    }

    const resolved = interaction ? interaction.resolvePointer(event.clientX, event.clientY) : null

    if (resolved !== null) {
      keyboardOwns = false
    }

    if (held === null) {
      return
    }

    if (interaction && resolved === null) {
      // Nothing under the pointer: the renderer would empty the focus; keep it, and put the held point back if a point had taken over.
      event.stopPropagation()
      restore()

      return
    }

    pointerTook = true
  }

  const down = (event: PointerEvent): void => {
    keyboardInput = false

    if (event.pointerType !== 'touch') {
      held = null
      restoredByUs = false
      pointerTook = false
    }
  }

  // The renderer clears a pointer-owned focus on the surface's mouseleave (renderer.ts:718-728, bound on the container at :919); pointerleave fires before mouseleave and this host
  // capture listener runs first, so the held point takes over: the clear finds it controller-owned, skips, and no onFocusChange(null) fires.
  const leave = (event: PointerEvent | MouseEvent): void => {
    const { target } = event

    if (target === el && !('pointerType' in event && event.pointerType === 'touch')) {
      pointer = null

      if (handedToPointer) {
        handedToPointer = false
        getInteraction()?.setControlledFocus(null, { source: 'pointer' })
      }
    }

    if (
      held === null ||
      ('pointerType' in event && event.pointerType === 'touch') ||
      !(target instanceof Element)
    ) {
      return
    }

    // `ts-chart-surface` is the core surface class, with no public handle for it (UPSTREAM-GAPS #36, #42).
    if (target === el || target.classList.contains('ts-chart-surface')) {
      restore()
    }
  }

  const enter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      pointer = { x: event.clientX, y: event.clientY }
    }
  }

  const blur = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) {
      return
    }

    const wasHeld = held !== null
    held = null
    // Focus left: no later focus change comes from a key, so none is recorded as the held point.
    keyboardInput = false

    if (restoredByUs) {
      // A controller-set focus is not keyboard-owned, so the renderer's blur clear skips it (renderer.ts:738).
      restoredByUs = false
      getInteraction()?.setControlledFocus(null, { source: 'pointer' })
    }

    if (!(keyboardOwns || wasHeld) || pointer === null) {
      return
    }

    keyboardOwns = false
    const interaction = getInteraction()
    const resolved = interaction?.resolvePointer(pointer.x, pointer.y) ?? null

    if (interaction && resolved !== null) {
      handedToPointer = true
      interaction.setControlledFocus(resolved, { source: 'pointer' })
    }
  }

  el.addEventListener('keydown', key, true)
  el.addEventListener('pointermove', move, true)
  el.addEventListener('pointerdown', down, true)
  el.addEventListener('pointerleave', leave, true)
  el.addEventListener('pointerenter', enter)
  el.addEventListener('mouseleave', leave, true)
  el.addEventListener('focusout', blur)

  const destroy = (): void => {
    el.removeEventListener('keydown', key, true)
    el.removeEventListener('pointermove', move, true)
    el.removeEventListener('pointerdown', down, true)
    el.removeEventListener('pointerleave', leave, true)
    el.removeEventListener('pointerenter', enter)
    el.removeEventListener('mouseleave', leave, true)
    el.removeEventListener('focusout', blur)
  }

  return {
    onFocus,
    destroy,
    isHeld: () => held !== null,
    markKeyboard: () => {
      keyboardInput = true
    },
    setKeyboardFocus: (point: Point) => {
      held = point
      current = point
      restoredByUs = true
      getInteraction()?.setControlledFocus(point, { source: 'programmatic' })
    },
  }
}
