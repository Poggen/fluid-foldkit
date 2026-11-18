import { Effect, Layer, Schema } from 'effect'
import type { Html } from 'foldkit/html'
import { HTMLVisualElement } from 'motion-dom'
import type { MotionOptions, MotionScope } from './motion.js'
import { mountReorderDrag } from './reorder-drag.js'
import { reorderedIds } from './reorder-order.js'
import type { ReorderAxis, ReorderBox } from './reorder-order.js'
import { createReorderScroll } from './reorder-scroll.js'

export const REORDER_EVENT = 'fluid-reorder'

export const REORDER_LIVE_EVENT = 'fluid-reorder-live'

/** One queue owns one scope. All live resources are released by its Layer. */
export function createReorderScope(motion: MotionScope) {
  const presence = new Map<string, boolean>()
  const layouts = new Map<string, ReorderBox>()
  const keys = new Map<string, object>()
  const releases = new Map<string, () => void>()
  const scroll = createReorderScroll()
  const drags = new Set<ReturnType<typeof mountReorderDrag>>()
  let live = true

  const setLive = (event: Event) => {
    if (!(event instanceof CustomEvent)) {
      return
    }

    const detail: unknown = event.detail

    if (!Schema.is(Schema.Boolean)(detail)) {
      return
    }

    live = detail

    for (const resource of drags) {
      resource.synchronize()
    }
  }

  let ids: ReadonlyArray<string> = []
  let axis: ReorderAxis = 'y'
  let group: HTMLElement | undefined
  let awaitingCommit = false
  let active = false
  let disposed = false

  const commit = (node: Html, next: ReadonlyArray<string>, nextAxis: ReorderAxis) => {
    if (node?.elm instanceof HTMLElement && node.elm !== group) {
      group?.removeEventListener(REORDER_LIVE_EVENT, setLive)
      group = node.elm
      group.addEventListener(REORDER_LIVE_EVENT, setLive)
    }

    if (next !== ids) {
      awaitingCommit = false
    }

    ids = next
    axis = nextAxis

    for (const id of layouts.keys()) {
      if (!ids.includes(id)) {
        layouts.delete(id)
      }
    }

    for (const resource of drags) {
      resource.synchronize()
    }
  }

  const dispose = () => {
    disposed = true
    active = false

    for (const release of releases.values()) {
      release()
    }

    releases.clear()
    keys.clear()
    layouts.clear()
    presence.clear()
    scroll.reset()
    group?.removeEventListener(REORDER_LIVE_EVENT, setLive)
    group = undefined
  }

  const layer = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        if (active || disposed) {
          throw new Error('Reorder scope already acquired or disposed')
        }

        active = true
      }),
      () => Effect.sync(dispose),
    ),
  )
  const groupCallback: (
    node: Html,
    nextIds: ReadonlyArray<string>,
    nextAxis?: ReorderAxis,
  ) => Html = (node: Html, nextIds: ReadonlyArray<string>, nextAxis: ReorderAxis = 'y') => {
    if (!node) {
      return node satisfies Html
    }

    const previous = node.data?.hook

    return {
      ...node,
      data: {
        ...node.data,
        hook: {
          ...previous,
          insert(vnode) {
            if (!active) {
              throw new Error('Reorder scope requires its owning Layer')
            }

            previous?.insert?.(vnode)
            commit(vnode, nextIds, nextAxis)
          },
          prepatch(old, next) {
            motion.captureLayout()
            previous?.prepatch?.(old, next)
          },
          postpatch(old, next) {
            previous?.postpatch?.(old, next)
            commit(next, nextIds, nextAxis)
          },
          destroy(vnode) {
            for (const resource of drags) {
              resource.suspend()
            }

            group?.removeEventListener(REORDER_LIVE_EVENT, setLive)
            group = undefined
            scroll.reset()
            previous?.destroy?.(vnode)
          },
        },
      },
    } satisfies Html
  }

  const item: (node: Html, id: string, options: MotionOptions, itemAxis?: ReorderAxis) => Html = (
    node: Html,
    id: string,
    options: MotionOptions,
    itemAxis: ReorderAxis = axis,
  ) => {
    presence.set(id, options.present !== false)
    let key = keys.get(id)

    if (!key) {
      key = {}
      keys.set(id, key)
    }

    return motion.node(node, {
      ...options,
      layout: options.layout ?? true,
      drag: itemAxis,
      resource: {
        key,
        mount: (visual) => {
          if (!(visual instanceof HTMLVisualElement)) {
            throw new Error('Reorder.Item requires HTML')
          }

          const drag = mountReorderDrag(visual, {
            axis: () => axis,
            enabled: () => live && !disposed && ids.includes(id) && presence.get(id) !== false,
            measure: (box) => {
              if (ids.includes(id)) {
                layouts.set(id, box)
              }
            },
            move: (offset, info) => {
              if (!group) {
                return
              }

              if (!awaitingCommit) {
                const next = reorderedIds(ids, layouts, id, offset, info.velocity[axis], axis)

                if (next !== ids) {
                  awaitingCommit = true
                  group.dispatchEvent(new CustomEvent(REORDER_EVENT, { detail: { ids: next } }))
                }
              }

              scroll.move(group, info.point[axis], axis, info.velocity[axis])
            },
            end: () => {
              scroll.reset()
            },
          })

          drags.add(drag)

          const ownedRelease = () => {
            drag.release()
            drags.delete(drag)

            if (releases.get(id) === ownedRelease) {
              releases.delete(id)
              layouts.delete(id)
              keys.delete(id)
              presence.delete(id)
            }
          }

          releases.set(id, ownedRelease)

          return ownedRelease
        },
      },
    }) satisfies Html
  }

  return {
    layer,
    group: groupCallback,
    item,
  }
}

export type ReorderScope = ReturnType<typeof createReorderScope>
