import { Effect } from 'effect'
import { Render } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { MotionTargetProperties } from './motion-contract.js'
import { createMotionEngine } from './motion-engine.js'
import { createLayoutAdapter } from './motion-projection.js'

export interface LayoutMotionOptions extends MotionTargetProperties {
  readonly layout?: boolean | 'position' | 'size' | 'preserve-aspect'
  readonly layoutId?: string
  readonly layoutDependency?: never
  readonly layoutScroll?: never
  readonly layoutRoot?: never
  readonly layoutAnchor?: never
  readonly drag?: never
}

/** The owning Command acknowledges the snapshot before accepting a Model change. */
export function createLayoutMotionScope(id: string) {
  const adapter = createLayoutAdapter(id)
  const engine = createMotionEngine<LayoutMotionOptions>(id, adapter)
  const transactions = new Set<number>()
  let root: HTMLElement | undefined
  let disposed = false

  const dispose = () => {
    disposed = true
    transactions.clear()
    adapter.dispose()
  }

  return {
    node: engine.node,
    layer: engine.layer,
    capture: (revision: number) =>
      Effect.sync(() => {
        if (disposed || root === undefined || !root.isConnected) {
          throw new Error('Layout capture requires its live owning root')
        }

        if (transactions.has(revision)) {
          throw new Error('Duplicate layout transaction revision')
        }

        adapter.capture()
        transactions.add(revision)
      }),
    commit: (revision: number) =>
      Effect.gen(function* () {
        if (!transactions.has(revision) || disposed) {
          return
        }

        yield* Render.afterCommit

        if (!transactions.delete(revision) || disposed) {
          return
        }

        adapter.flush()
        // Physical presence retires through onExitComplete, not a group Promise:
        // Motion's interrupted animations are not required to resolve finished.
      }),
    cancel: (revision: number) =>
      Effect.sync(() => {
        if (!transactions.delete(revision) || disposed || transactions.size > 0) {
          return
        }

        adapter.flush()
      }),
    root(vnode: Html): Html {
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

              if (!(node.elm instanceof HTMLElement)) {
                throw new Error('Layout root requires an HTMLElement')
              }

              root = node.elm
            },
            destroy(node) {
              dispose()
              root = undefined
              previous?.destroy?.(node)
            },
          },
        },
      }
    },
  }
}
