import { Context, Effect, Layer, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import type { Html } from 'foldkit/html'
import { animateTarget, HTMLVisualElement } from 'motion-dom'
import { spring } from './lib/springs.js'
import { SelectedPillTarget } from './tabs-selected-pill-state.js'

export const selectedPillInitializerAttribute = 'data-tabs-pill-initializer'

const liveLeaseAttribute = 'data-tabs-pill-live-lease'

export const SelectedPillPolicy = Schema.Literals(['user', 'always', 'never'])

export const selectedPillMountArgs = { id: Schema.String }

export const SelectedPillInitializer = Schema.fromJsonString(
  Schema.Struct({
    target: SelectedPillTarget,
    revision: Schema.Natural,
    policy: SelectedPillPolicy,
  }),
)

export const readSelectedPillInitializer = (element: Element) =>
  Effect.sync(() => element.getAttribute(selectedPillInitializerAttribute)).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(SelectedPillInitializer)),
    Effect.orDie,
  )

export const selectedPillCommandArgs = {
  id: Schema.String,
  target: SelectedPillTarget,
  revision: Schema.Natural,
  lease: Schema.String,
}

const transition = { ...spring.moderate, opacity: { duration: 0.08 } }

function mountSelectedPill(
  element: HTMLElement,
  target: SelectedPillTarget,
  revision: number,
  policy: typeof SelectedPillPolicy.Type,
  lease: string,
) {
  let active = true
  let appliedRevision = revision

  const visual = new HTMLVisualElement({
    visualState: {
      latestValues: { ...target },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
    },
    props: { initial: false, animate: { ...target }, transition },
    presenceContext: null,
    reducedMotionConfig: policy,
  })

  visual.mount(element)
  visual.render()
  element.setAttribute(liveLeaseAttribute, lease)

  return {
    lease,
    retarget(next: SelectedPillTarget, nextRevision: number, expectedLease: string) {
      if (
        !active ||
        !element.isConnected ||
        expectedLease !== lease ||
        nextRevision < appliedRevision
      ) {
        return false
      }

      if (nextRevision === appliedRevision) {
        return true
      }

      const previous = Schema.decodeUnknownSync(SelectedPillTarget)(visual.getProps().animate)
      const changed: Partial<Record<keyof SelectedPillTarget, number>> = {}

      const properties = ['left', 'top', 'width', 'height', 'opacity'] satisfies ReadonlyArray<
        keyof SelectedPillTarget
      >

      for (const property of properties) {
        if (previous[property] !== next[property]) {
          changed[property] = next[property]
        }
      }

      appliedRevision = nextRevision
      visual.update({ initial: false, animate: { ...next }, transition }, null)
      animateTarget(visual, { ...changed, transition })

      return true
    },
    dispose() {
      if (!active) {
        return
      }

      active = false

      for (const value of visual.values.values()) {
        value.stop()
      }

      visual.unmount()

      for (const value of visual.values.values()) {
        value.destroy()
      }

      if (element.getAttribute(liveLeaseAttribute) === lease) {
        // Pause may finalize before or after the historical patch; return the node to its latest declared pose.
        const encoded = element.getAttribute(selectedPillInitializerAttribute)

        if (element.isConnected && encoded !== null) {
          const { target: current } = Schema.decodeUnknownSync(SelectedPillInitializer)(encoded)
          element.style.left = `${current.left}px`
          element.style.top = `${current.top}px`
          element.style.width = `${current.width}px`
          element.style.height = `${current.height}px`
          element.style.opacity = String(current.opacity)
        }

        element.removeAttribute(liveLeaseAttribute)
      }
    },
  }
}

type Driver = ReturnType<typeof mountSelectedPill>

interface Registry {
  readonly nodes: Map<string, Driver>
  readonly nextLease: () => string
}

export class SelectedPillDrivers extends Context.Service<SelectedPillDrivers, Registry>()(
  '@foldkit-visuals/fluid/SelectedPillDrivers',
) {}

export const SelectedPillDriversLayer = Layer.effect(
  SelectedPillDrivers,
  Effect.gen(function* () {
    const random = yield* SecureRandom.SecureRandom
    const prefix = yield* random.uuidV4()
    let generation = 0

    return yield* Effect.acquireRelease(
      Effect.sync(() => ({
        nodes: new Map<string, Driver>(),
        nextLease: () => {
          generation += 1

          return `${prefix}:${generation}`
        },
      })),
      ({ nodes }) =>
        Effect.sync(() => {
          for (const driver of nodes.values()) {
            driver.dispose()
          }

          nodes.clear()
        }),
    )
  }),
).pipe(Layer.provide(SecureRandom.layerWebCrypto))

export function acquireSelectedPill(
  drivers: Registry,
  element: Element,
  args: {
    readonly id: string
    readonly target: SelectedPillTarget
    readonly revision: number
    readonly policy: typeof SelectedPillPolicy.Type
  },
) {
  return Effect.acquireRelease(
    Effect.sync(() => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Tabs selected pill requires an HTML element')
      }

      if (drivers.nodes.has(args.id)) {
        throw new Error(`Duplicate Tabs selected pill: ${args.id}`)
      }

      const driver = mountSelectedPill(
        element,
        args.target,
        args.revision,
        args.policy,
        drivers.nextLease(),
      )

      drivers.nodes.set(args.id, driver)

      return driver
    }),
    (driver) =>
      Effect.sync(() => {
        driver.dispose()

        if (drivers.nodes.get(args.id) === driver) {
          drivers.nodes.delete(args.id)
        }
      }),
  )
}

/** Seed insertion only; retained patches must not overwrite the owner's current animated values. */
export function seedSelectedPill(vnode: Html, target: SelectedPillTarget): Html {
  if (vnode === null) {
    return null
  }

  const previous = vnode.data?.hook

  return {
    ...vnode,
    data: {
      ...vnode.data,
      style: {
        left: `${target.left}px`,
        top: `${target.top}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        opacity: String(target.opacity),
      },
      hook: {
        ...previous,
        prepatch(oldNode, node) {
          previous?.prepatch?.(oldNode, node)

          if (!(oldNode.elm instanceof HTMLElement)) {
            return
          }

          if (oldNode.elm.hasAttribute(liveLeaseAttribute)) {
            if (oldNode.data?.style !== undefined) {
              node.data = { ...node.data, style: oldNode.data.style }
            }
          } else {
            // A late pause finalizer can change the DOM after its VNode was recorded.
            const { style } = oldNode.elm

            oldNode.data = {
              ...oldNode.data,
              style: {
                left: style.left,
                top: style.top,
                width: style.width,
                height: style.height,
                opacity: style.opacity,
              },
            }
          }
        },
      },
    },
  }
}
