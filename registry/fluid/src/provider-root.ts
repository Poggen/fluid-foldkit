import { Context, Effect, Layer } from 'effect'
import { shapeMap, type ShapeVariant } from './lib/shape.js'

interface RootOwner {
  readonly detach: () => void
  readonly dispose: () => void
  readonly publish: (shape: ShapeVariant, publishRadius: boolean) => void
}

interface RootRegistry {
  readonly attach: (id: string, element: Element, shape: ShapeVariant) => RootOwner
  readonly publish: (id: string, shape: ShapeVariant, publishRadius: boolean) => void
}

export class ProviderRoots extends Context.Service<ProviderRoots, RootRegistry>()(
  '@foldkit-visuals/fluid/ProviderRoots',
) {}

export const ProviderRootsLayer = Layer.effect(
  ProviderRoots,
  Effect.acquireRelease(
    Effect.sync(() => {
      const active = new Map<string, RootOwner>()
      const resources = new Set<RootOwner>()

      return {
        service: ProviderRoots.of({
          attach(id, element, initialShape) {
            if (active.has(id)) throw new Error(`Duplicate Fluid provider id: ${id}`)
            const root = element.ownerDocument.documentElement
            const window = element.ownerDocument.defaultView

            if (window === null) throw new Error('Fluid provider requires a live document')
            let timer: number | undefined
            let detached = false
            root.style.setProperty('--shape-input-radius', `${shapeMap[initialShape].bgRadius}px`)

            const owner: RootOwner = {
              publish(next, publishRadius) {
                root.classList.add('transitioning')
                void root.offsetHeight

                if (publishRadius)
                  root.style.setProperty('--shape-input-radius', `${shapeMap[next].bgRadius}px`)

                if (timer !== undefined) window.clearTimeout(timer)
                timer = window.setTimeout(() => {
                  root.classList.remove('transitioning')
                  timer = undefined

                  if (detached) resources.delete(owner)
                }, 200)
              },
              detach() {
                active.delete(id)
                detached = true

                if (timer === undefined) resources.delete(owner)
              },
              dispose() {
                if (timer !== undefined) {
                  window.clearTimeout(timer)
                  root.classList.remove('transitioning')
                  timer = undefined
                }

                active.delete(id)
                resources.delete(owner)
              },
            }

            active.set(id, owner)
            resources.add(owner)

            return owner
          },
          publish(id, shape, publishRadius) {
            active.get(id)?.publish(shape, publishRadius)
          },
        }),
        dispose() {
          for (const owner of resources) owner.dispose()
        },
      }
    }),
    (registry) => Effect.sync(() => registry.dispose()),
  ).pipe(Effect.map((registry) => registry.service)),
)
