import { Effect, Layer } from 'effect'
import type { Html, VNode } from 'foldkit/html'
import { animateSingleValue, animateTarget, HTMLVisualElement, motionValue } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen, MotionNodeOptions } from 'motion-dom'

export interface SwitchAnimation {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly dragging: boolean
  readonly transition: NonNullable<MotionNodeOptions['transition']>
  readonly reducedMotion: 'user' | 'always' | 'never'
}

function mount(element: HTMLElement, initial: SwitchAnimation) {
  const x = motionValue(initial.x)

  const props = (next: SwitchAnimation) => ({
    initial: false satisfies false,
    style: { x },
    animate: { y: next.y, width: next.width, height: next.height },
    transition: next.transition,
  })

  const visual = new HTMLVisualElement({
    visualState: {
      latestValues: { x: initial.x, y: initial.y, width: initial.width, height: initial.height },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
    },
    props: props(initial),
    presenceContext: null,
    reducedMotionConfig: initial.reducedMotion,
  })

  visual.mount(element)
  visual.update(props(initial), null)
  visual.render()
  let previous = initial
  let horizontal: ReturnType<typeof animateSingleValue>
  let shapes: Array<AnimationPlaybackControlsWithThen> = []

  return {
    synchronize(next: SwitchAnimation) {
      visual.update(props(next), null)

      if (next.dragging) {
        horizontal?.stop()
        x.set(next.x)
      } else if (next.x !== previous.x || previous.dragging) {
        horizontal = animateSingleValue(x, next.x, next.transition)
      }

      if (
        next.y !== previous.y ||
        next.width !== previous.width ||
        next.height !== previous.height
      ) {
        shapes = animateTarget(visual, {
          y: next.y,
          width: next.width,
          height: next.height,
          transition: next.transition,
        })
      }

      previous = next
    },
    dispose() {
      horizontal?.stop()

      for (const shape of shapes) {
        shape.stop()
      }

      visual.unmount()
      x.destroy()
    },
  }
}

/** Mirrors the source's MotionValue x and independently animated thumb shape. */
export function createSwitchMotionScope(id: string) {
  const nodes = new Map<HTMLElement, ReturnType<typeof mount>>()
  let active = false

  const synchronize = (node: VNode, animation: SwitchAnimation) => {
    if (!(node.elm instanceof HTMLElement)) {
      return
    }

    const current = nodes.get(node.elm)

    if (current) {
      current.synchronize(animation)
    } else {
      nodes.set(node.elm, mount(node.elm, animation))
    }
  }

  return {
    layer: Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.sync(() => {
          if (active) {
            throw new Error(`Switch motion ${id} already acquired`)
          }

          active = true
        }),
        () =>
          Effect.sync(() => {
            for (const node of nodes.values()) {
              node.dispose()
            }

            nodes.clear()
            active = false
          }),
      ),
    ),
    node: (vnode: Html, animation: SwitchAnimation): Html => {
      if (!active) {
        throw new Error(`Switch motion ${id} requires its owning Layer`)
      }

      if (vnode === null) {
        return null
      }

      const previous = vnode.data?.hook

      return {
        ...vnode,
        data: {
          ...vnode.data,
          hook: {
            ...previous,
            insert(node) {
              previous?.insert?.(node)
              synchronize(node, animation)
            },
            prepatch(oldNode, node) {
              previous?.prepatch?.(oldNode, node)

              // The engine must retarget from its current value, not a patched target style.
              if (oldNode.data?.style !== undefined) {
                node.data = { ...node.data, style: oldNode.data.style }
              }
            },
            postpatch(oldNode, node) {
              previous?.postpatch?.(oldNode, node)
              synchronize(node, animation)
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
