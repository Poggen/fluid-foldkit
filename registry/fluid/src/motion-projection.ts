import { constVoid } from 'effect/Function'
import { acquireProjectionNode, frame, microtask } from 'motion-dom'
import type { IProjectionNode, ProjectionNodeOptions, MotionNodeOptions } from 'motion-dom'

import type { MotionOptions } from './motion-contract.js'
import type { MotionAdapter } from './motion-adapter.js'

/** Framework projection ownership uses Motion's documented acquire/release pair. */
export const createLayoutAdapter: (scopeId: string) => MotionAdapter<MotionOptions> =
  function createLayoutAdapter(scopeId: string) {
    const nodes = new Map<Element, ProjectionLease>()
    const mounts = new Map<Element, MountInput>()
    const roots = new Set<IProjectionNode>()
    let disposed = false

    const attributes = (element: HTMLElement, options: MotionOptions) => {
      const layout =
        options.layout === undefined || options.layout === false
          ? undefined
          : String(options.layout)
      const layoutId = options.layoutId === undefined ? undefined : `${scopeId}:${options.layoutId}`

      if (element.dataset.layout !== layout) {
        if (layout === undefined) delete element.dataset.layout
        else element.dataset.layout = layout
      }

      if (element.dataset.layoutId !== layoutId) {
        if (layoutId === undefined) delete element.dataset.layoutId
        else element.dataset.layoutId = layoutId
      }
    }

    const configure = (entry: ProjectionLease, options: MotionOptions) => {
      const next: ProjectionNodeOptions = {
        layout: options.layout ?? false,
        alwaysMeasureLayout: options.drag !== undefined && options.drag !== false,
        animationType:
          options.layout === undefined || options.layout === true || options.layout === false
            ? 'both'
            : options.layout,
      }

      if (options.layoutId !== undefined) {
        next.layoutId = `${scopeId}:${options.layoutId}`
      }

      if (options.layoutScroll !== undefined) {
        next.layoutScroll = options.layoutScroll
      }

      if (options.layoutRoot !== undefined) {
        next.layoutRoot = options.layoutRoot
      }

      if (options.layoutAnchor !== undefined) {
        next.layoutAnchor = options.layoutAnchor
      }

      entry.node.setOptions(next)
    }

    const release = (element: Element) => {
      mounts.delete(element)
      const entry = nodes.get(element)

      if (!entry) {
        return
      }

      nodes.delete(element)
      entry.occurrence += 1

      for (const unsubscribe of entry.unsubscribe) {
        unsubscribe()
      }

      if (entry.element.dataset.layout !== undefined) delete entry.element.dataset.layout
      if (entry.element.dataset.layoutId !== undefined) delete entry.element.dataset.layoutId

      entry.release()
    }

    const acquire = ({ element, options, onComplete }: MountInput) => {
      const requested =
        (options.layout !== undefined && options.layout !== false) ||
        options.layoutId !== undefined ||
        options.layoutScroll === true ||
        options.layoutRoot === true

      if (!(element instanceof HTMLElement) || !requested) {
        return
      }

      attributes(element, options)
      const [node, releaseProjection] = acquireProjectionNode(element)

      const entry: ProjectionLease = {
        element,
        node,
        release: releaseProjection,
        complete: onComplete,
        unsubscribe: [],
        animating: false,
        exitPending: false,
        occurrence: 0,
      }

      const live = () => !disposed && nodes.get(element) === entry

      const settle = () => {
        if (!live()) {
          return
        }

        entry.animating = false
        entry.exitPending = false
        onComplete()
      }

      const unsubscribe = [
        node.addEventListener('animationStart', () => {
          if (live()) {
            entry.animating = true
          }
        }),
        node.addEventListener('animationComplete', settle),
      ]

      entry.unsubscribe = unsubscribe
      nodes.set(element, entry)
      node.setOptions({ onExitComplete: settle })
      node.isPresent = options.present !== false
      configure(entry, options)

      if (node.root) {
        roots.add(node.root)
      }
    }

    return {
      props(options) {
        const props: Partial<MotionNodeOptions> = {}

        if (options.drag !== undefined) {
          props.drag = options.drag
          props.dragSnapToOrigin = true
        }

        if (options.layout !== undefined) {
          props.layout = options.layout
        }

        if (options.layoutId !== undefined) {
          props.layoutId = `${scopeId}:${options.layoutId}`
        }

        return props
      },
      mount(input) {
        mounts.set(input.element, input)
        acquire(input)
      },
      afterMount: constVoid,
      beforeUpdate(element, previous, next) {
        if (!nodes.has(element)) {
          const input = mounts.get(element)

          if (input) {
            acquire({ ...input, options: next })
          }
        }

        const entry = nodes.get(element)

        if (!entry) {
          return
        }

        const { node } = entry
        const nextId = next.layoutId === undefined ? undefined : `${scopeId}:${next.layoutId}`

        if (node.options.layoutId !== nextId) {
          node.willUpdate()
          node.getStack()?.remove(node)

          if (nextId === undefined) {
            delete node.options.layoutId
            node.show()
          } else {
            node.setOptions({ layoutId: nextId })
            node.root?.registerSharedNode(nextId, node)
          }
        }

        attributes(entry.element, next)
        configure(entry, next)
        node.isPresent = next.present !== false

        if (
          next.layoutDependency === undefined ||
          previous.layoutDependency !== next.layoutDependency ||
          previous.present !== next.present
        ) {
          node.willUpdate()
        }

        if (previous.present === next.present) {
          return
        }

        entry.occurrence += 1
        const { occurrence } = entry

        if (next.present !== false) {
          entry.exitPending = false
          node.promote()

          return
        }

        entry.exitPending = true

        if (node.relegate()) {
          return
        }

        frame.postRender(() => {
          if (disposed || nodes.get(element) !== entry || entry.occurrence !== occurrence) {
            return
          }

          const stack = node.getStack()

          if (!stack || stack.lead === node) {
            entry.exitPending = false
            entry.complete()
          }
        })
      },
      afterUpdate(element) {
        const entry = nodes.get(element)

        if (!entry) {
          return false
        }

        if (entry.node.root) {
          roots.add(entry.node.root)
        }

        return true
      },
      afterScheduledUpdate(onComplete) {
        microtask.postRender(onComplete)
      },
      isAnimating(element) {
        const entry = nodes.get(element)

        return entry !== undefined && (entry.animating || entry.exitPending)
      },
      beforeRelease: constVoid,
      release,
      capture() {
        for (const entry of nodes.values()) {
          entry.node.willUpdate()

          if (entry.node.root) {
            roots.add(entry.node.root)
          }
        }
      },
      flush() {
        for (const root of roots) {
          root.didUpdate()
        }

        roots.clear()
      },
      dispose() {
        disposed = true
        roots.clear()

        for (const element of mounts.keys()) {
          release(element)
        }
      },
    }
  }

type MountInput = Parameters<MotionAdapter<MotionOptions>['mount']>[0]

interface ProjectionLease {
  readonly element: HTMLElement
  readonly node: IProjectionNode
  readonly release: () => void
  readonly complete: () => void
  unsubscribe: ReadonlyArray<() => void>
  animating: boolean
  exitPending: boolean
  occurrence: number
}
