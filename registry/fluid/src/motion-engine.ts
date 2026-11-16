import type { Html, VNode } from 'foldkit/html'
import { Effect, Layer } from 'effect'
import { HTMLVisualElement, SVGVisualElement, createAnimationState } from 'motion-dom'
import type { MotionValueAnimation, MotionNodeOptions, ResolvedValues } from 'motion-dom'

import { motionProps } from './motion-props.js'
import { initialValues } from './motion-initial.js'
import { acquireMotionCompletion, createMotionResources } from './motion-resource.js'
import type { MotionTargetProperties, MountedMotion } from './motion-contract.js'
import type { MotionAdapter } from './motion-adapter.js'

export const EXIT_COMPLETE_EVENT = 'fluid-exit-complete'

/** One scope owns target animation, retained presence and live element resources. */
export function createMotionEngine<Options extends MotionTargetProperties>(
  id: string,
  adapter?: MotionAdapter<Options>,
) {
  const nodes = new Map<Element, MountedMotion<Options>>()
  const resources = createMotionResources()
  const pending = new Map<Element, Options>()
  let insertScheduled = false

  const presenceRequests = new Map<Element, boolean>()
  let disposed = false
  let active = false

  const props = (options: Options, element: Element): MotionNodeOptions =>
    motionProps(
      options,
      () => {
        const live = nodes.get(element)

        if (disposed || live === undefined) {
          return
        }

        const notifyComplete =
          live.options.present === false
            ? live.exitCompletion
            : live.declaredOptions.onAnimationComplete

        notifyComplete?.(live.element)
      },
      (values: ResolvedValues) => {
        const live = nodes.get(element)

        if (!disposed && live !== undefined) {
          live.declaredOptions.onUpdate?.(values, live.element)
        }
      },
      adapter?.props(options, element),
    )

  let awaitCompletion: Effect.Success<ReturnType<typeof acquireMotionCompletion>> | undefined

  function finishOwnExit(element: Element, generation: number) {
    const current = nodes.get(element)

    if (
      !current ||
      current.generation !== generation ||
      current.options.present !== false ||
      !current.exitSettled ||
      current.exitDispatched
    ) {
      return
    }

    if (adapter?.isAnimating(current.element) === true) {
      return
    }

    for (const child of nodes.values()) {
      if (
        child.element === element ||
        !element.contains(child.element) ||
        child.options.present !== false
      ) {
        continue
      }

      if (!child.exitSettled || adapter?.isAnimating(child.element) === true) {
        return
      }
    }

    nodes.set(element, { ...current, exitDispatched: true })
    element.dispatchEvent(new CustomEvent(EXIT_COMPLETE_EVENT, { bubbles: false }))
  }

  function completeExit(element: Element, generation: number) {
    finishOwnExit(element, generation)
    let parent = element.parentElement

    while (parent !== null) {
      const current = nodes.get(parent)

      if (current !== undefined) {
        finishOwnExit(parent, current.generation)
      }

      parent = parent.parentElement
    }
  }

  function resolvePresence(element: Element, options: Options): Options {
    let { present } = options
    let parent = element.parentElement

    while (present === undefined && parent !== null) {
      present = presenceRequests.get(parent)
      parent = parent.parentElement
    }

    presenceRequests.set(element, present ?? true)

    return { ...options, present: present ?? true }
  }

  function settleTargetAnimation(element: Element, generation: number) {
    const live = nodes.get(element)

    if (disposed || live?.generation !== generation || live.options.present !== false) {
      return
    }

    nodes.set(live.element, { ...live, exitSettled: true })
    completeExit(live.element, generation)
  }

  function animate(
    current: MountedMotion<Options>,
    declaredOptions: Options,
  ): MountedMotion<Options> {
    const options = resolvePresence(current.element, declaredOptions)
    const wasExiting = current.generation > 0 && current.options.present === false

    // Source keeps the exiting vnode's props until its presence owner settles.
    if (wasExiting && options.present === false) {
      const unchanged = { ...current, declaredOptions }
      nodes.set(current.element, unchanged)

      return unchanged
    }

    const generation = current.generation + 1

    const exitCompletion =
      options.present === false ? current.declaredOptions.onAnimationComplete : undefined

    const updated = {
      ...current,
      options,
      declaredOptions,
      generation,
      exitCompletion,
      exitSettled: false,
      exitDispatched: false,
    }

    nodes.set(current.element, updated)

    current.visual.update(props(options, current.element), null)
    resources.update(current.element, current.visual, options.resource)

    let settled: Promise<unknown>

    if (options.present === false) {
      settled = current.animationState.setActive('exit', true)
    } else if (wasExiting && current.exitSettled) {
      if (options.initial !== false) {
        for (const [key, value] of Object.entries(initialValues(options))) {
          current.visual.getValue(key)?.jump(value)
        }
      }

      current.visual.blockInitialAnimation = false
      current.animationState.reset()
      settled = current.animationState.animateChanges()
    } else if (wasExiting) {
      settled = current.animationState.setActive('exit', false)
    } else {
      settled = current.animationState.animateChanges()
    }

    const animations: Array<MotionValueAnimation> = []

    for (const value of current.visual.values.values()) {
      if (value.animation !== undefined) {
        animations.push(value.animation)
      }
    }

    const next = { ...updated, animations }
    nodes.set(current.element, next)

    if (awaitCompletion === undefined) {
      throw new Error('Motion completion requires its owning Layer')
    }

    if (options.present === false) {
      awaitCompletion(settled, current.element, generation)
    }

    return next
  }

  function mount(element: Element): MountedMotion<Options> | undefined {
    const existing = nodes.get(element)

    if (existing) {
      return existing
    }

    const requested = pending.get(element)

    if (!requested || disposed) {
      return undefined
    }

    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return undefined
    }

    pending.delete(element)
    let { parentElement } = element
    let parent: MountedMotion<Options> | undefined

    while (parentElement !== null && parent === undefined) {
      parent = nodes.get(parentElement) ?? mount(parentElement)
      const { parentElement: ancestor } = parentElement
      parentElement = ancestor
    }

    const options = resolvePresence(element, requested)

    const visualOptions = {
      visualState: {
        latestValues: initialValues(options),
        renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
      },
      props: props(options, element),
      presenceContext: null,
      reducedMotionConfig: options.reducedMotion ?? ('user' satisfies Options['reducedMotion']),
    }

    const constructorOptions =
      parent === undefined ? visualOptions : { ...visualOptions, parent: parent.visual }

    const visual =
      element instanceof SVGElement
        ? new SVGVisualElement(constructorOptions)
        : new HTMLVisualElement(constructorOptions)

    const animationState = createAnimationState(visual)
    visual.animationState = animationState

    if (visual instanceof SVGVisualElement && element instanceof SVGElement) {
      visual.mount(element)
    } else if (visual instanceof HTMLVisualElement && element instanceof HTMLElement) {
      visual.mount(element)
    }

    adapter?.mount({
      element,
      visual,
      options,
      parent: parent?.element,
      onComplete: () => {
        const current = nodes.get(element)

        if (current) {
          completeExit(element, current.generation)
        }
      },
    })

    visual.render()
    adapter?.afterMount(element, options)

    const current: MountedMotion<Options> = {
      element,
      visual,
      options,
      declaredOptions: requested,
      animations: [],
      generation: 0,
      animationState,
      exitCompletion: undefined,
      exitSettled: false,
      exitDispatched: false,
    }

    nodes.set(element, current)

    return animate(current, requested)
  }

  function drainPending() {
    for (const element of pending.keys()) {
      mount(element)
    }
  }

  function scheduleInserts() {
    if (insertScheduled || disposed) {
      return
    }

    insertScheduled = true
    queueMicrotask(() => {
      insertScheduled = false

      if (disposed) {
        return
      }

      drainPending()
      adapter?.flush()
    })
  }

  function insert(vnode: VNode, options: Options) {
    if (!active) {
      throw new Error(`Motion scope ${id} requires its owning Layer`)
    }

    if ((!(vnode.elm instanceof HTMLElement) && !(vnode.elm instanceof SVGElement)) || disposed) {
      return
    }

    pending.set(vnode.elm, options)
    scheduleInserts()
  }

  function beforePatch(vnode: VNode, options: Options) {
    if (!(vnode.elm instanceof HTMLElement) && !(vnode.elm instanceof SVGElement)) {
      return
    }

    const current = nodes.get(vnode.elm) ?? mount(vnode.elm)
    const resolved = resolvePresence(vnode.elm, options)

    if (current) {
      adapter?.beforeUpdate(vnode.elm, current.options, resolved)
    }
  }

  function afterPatch(vnode: VNode, options: Options) {
    if (!(vnode.elm instanceof HTMLElement) && !(vnode.elm instanceof SVGElement)) {
      return
    }

    const current = nodes.get(vnode.elm)

    if (!current) {
      insert(vnode, options)

      return
    }

    const next = animate(current, options)

    if (current.options.present !== next.options.present) {
      const descendants = [...nodes.values()]
        .filter((child) => child.element !== next.element && next.element.contains(child.element))
        .toSorted((a, b) => {
          if (a.element.contains(b.element)) {
            return -1
          }

          if (b.element.contains(a.element)) {
            return 1
          }

          return a.element.compareDocumentPosition(b.element) === Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1
        })

      for (const child of descendants) {
        animate(child, child.declaredOptions)
      }
    }

    if (adapter?.afterUpdate(next.element, options) === true) {
      scheduleInserts()
      adapter.afterScheduledUpdate(() => {
        completeExit(next.element, next.generation)
      })
    }
  }

  function release(element: Element) {
    pending.delete(element)
    presenceRequests.delete(element)
    const current = nodes.get(element)

    if (!current) {
      return
    }

    nodes.delete(element)
    resources.release(element)
    adapter?.beforeRelease(element)

    for (const animation of current.animations) {
      animation.stop()
    }

    adapter?.release(element)

    if (adapter?.retireVisual) {
      adapter.retireVisual(element, () => {
        current.visual.unmount()
      })
    } else {
      current.visual.unmount()
    }
  }

  function dispose() {
    disposed = true
    active = false
    pending.clear()
    adapter?.dispose()
    presenceRequests.clear()

    for (const element of nodes.keys()) {
      release(element)
    }
  }

  const layer = Layer.effectDiscard(
    Effect.gen(function* () {
      // Server renders do not mount DOM nodes and must not consume the client motion scope.
      if (typeof document === 'undefined') return

      const complete = yield* acquireMotionCompletion(settleTargetAnimation)
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          if (disposed || active) {
            throw new Error(`Motion scope ${id} already acquired or disposed`)
          }

          active = true
          awaitCompletion = complete
        }),
        () =>
          Effect.sync(() => {
            awaitCompletion = undefined
            dispose()
          }),
      )
    }),
  )

  return {
    layer,
    flushLayout: scheduleInserts,
    captureLayout: () => {
      adapter?.capture()
    },
    node: (vnode: Html, options: Options): Html => {
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
              insert(node, options)
            },
            prepatch(oldNode, node) {
              beforePatch(oldNode, options)
              previous?.prepatch?.(oldNode, node)
            },
            postpatch(oldNode, node) {
              previous?.postpatch?.(oldNode, node)
              afterPatch(node, options)
            },
            destroy(node) {
              if (node.elm instanceof HTMLElement || node.elm instanceof SVGElement) {
                release(node.elm)
              }

              previous?.destroy?.(node)
            },
          },
        },
      }
    },
  }
}
