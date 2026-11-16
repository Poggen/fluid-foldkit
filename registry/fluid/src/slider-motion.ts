import { Effect, Layer } from 'effect'
import type { Html, VNode } from 'foldkit/html'
import { animateSingleValue, motionValue, type AnimationPlaybackControlsWithThen } from 'motion-dom'
import { spring } from './lib/springs.js'
import type { SliderModel } from './slider-state.js'

function mount(element: HTMLElement, initial: SliderModel) {
  const x0 = motionValue(initial.x0)
  const x1 = motionValue(initial.x1)
  const fill = motionValue(initial.fill)
  const zero = motionValue(initial.zero)
  let state = initial
  let controls: Array<AnimationPlaybackControlsWithThen> = []

  const set = (selector: string, property: string, value: string) => {
    for (const node of element.querySelectorAll<HTMLElement>(selector))
      node.style.setProperty(property, value)
  }

  const paint = () => {
    element.style.setProperty('--slider-fill-percent', String(fill.get()))
    element.style.setProperty('--slider-zero-offset', String(zero.get()))

    if (state.settings.compact) {
      const range = typeof state.settings.value !== 'number'
      set('[data-slider-thumb="0"]', 'transform', `translateX(${x0.get()}px)`)
      set('[data-slider-thumb="1"]', 'transform', `translateX(${x1.get()}px)`)
      set('[data-slider-fill]', 'left', `${range ? x0.get() + 9 : 0}px`)
      set('[data-slider-fill]', 'width', `${range ? x1.get() - x0.get() : x0.get() + 9}px`)
      const left = x0.get() + 10
      const right = x1.get() + 10

      const mask = range
        ? `linear-gradient(to right, black ${left - 2}px, transparent ${left}px, transparent ${right}px, black ${right + 2}px)`
        : `linear-gradient(to right, transparent ${left}px, black ${left + 2}px)`

      set('[data-slider-dots]', 'mask-image', mask)
      set('[data-slider-dots]', '-webkit-mask-image', mask)
      set('[data-slider-tooltip="0"]', 'transform', `translateX(${x0.get() + 10}px)`)
      set('[data-slider-tooltip="1"]', 'transform', `translateX(${x1.get() + 10}px)`)
    } else {
      const p = fill.get()
      const z = zero.get()
      const pips = state.settings.variant === 'pips'
      const offset = 20 - 20 * p - z * 2.5
      set('[data-slider-fill]', 'width', pips ? `calc(${p * 100}% + ${offset}px)` : `${p * 100}%`)
      set(
        '[data-slider-line]',
        'left',
        pips ? `calc(${p * 100}% + ${11 - 24 * p}px)` : `calc(${p * 100}% - 9px + ${z}px)`,
      )
      set('[data-slider-handle]', 'left', `calc(${p * 100}% - 8px + ${z}px)`)
      const mask = `linear-gradient(to right, transparent calc(${p * 100}% + ${offset}px), black calc(${p * 100}% + ${offset + 2}px))`
      set('[data-slider-dots]', 'mask-image', mask)
      set('[data-slider-dots]', '-webkit-mask-image', mask)
    }
  }

  const releases = [x0, x1, fill, zero].map((value) => value.on('change', paint))
  paint()

  return {
    synchronize(next: SliderModel) {
      if (next.revision !== state.revision || next.ready !== state.ready) {
        for (const control of controls) control.stop()
        const direct = !state.ready || next.immediate
        controls = []

        for (const [value, target] of [
          [x0, next.x0],
          [x1, next.x1],
          [fill, next.fill],
          [zero, next.zero],
        ] satisfies ReadonlyArray<readonly [typeof x0, number]>) {
          if (direct && value !== zero) value.set(target)
          else
            controls.push(
              animateSingleValue(
                value,
                target,
                next.settings.compact ? spring.moderate : spring.fast,
              ),
            )
        }
      }

      state = next
      paint()
    },
    dispose() {
      for (const control of controls) control.stop()

      for (const release of releases) release()

      for (const value of [x0, x1, fill, zero]) value.destroy()
    },
  }
}

/** Owns MotionValues and browser resources only. Decisions remain in SliderModel. */
export function createSliderMotionScope(id: string) {
  const nodes = new Map<HTMLElement, ReturnType<typeof mount>>()
  let active = false

  const sync = (node: VNode, state: SliderModel) => {
    if (!(node.elm instanceof HTMLElement)) return
    const current = nodes.get(node.elm)

    if (current) current.synchronize(state)
    else nodes.set(node.elm, mount(node.elm, state))
  }

  return {
    layer: Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.sync(() => {
          if (active) throw new Error(`Slider motion ${id} already acquired`)
          active = true
        }),
        () =>
          Effect.sync(() => {
            for (const node of nodes.values()) node.dispose()
            nodes.clear()
            active = false
          }),
      ),
    ),
    node(this: void, vnode: Html, state: SliderModel): Html {
      if (!active) throw new Error(`Slider motion ${id} requires its owning Layer`)

      if (vnode === null) return null
      const previous = vnode.data?.hook

      return {
        ...vnode,
        data: {
          ...vnode.data,
          hook: {
            ...previous,
            insert(node) {
              previous?.insert?.(node)
              sync(node, state)
            },
            postpatch(oldNode, node) {
              previous?.postpatch?.(oldNode, node)
              sync(node, state)
            },
            destroy(node) {
              if (node.elm instanceof HTMLElement) {
                nodes.get(node.elm)?.dispose()
                nodes.delete(node.elm)
              }

              previous?.destroy?.(node)
            },
          },
        },
      }
    },
  }
}
