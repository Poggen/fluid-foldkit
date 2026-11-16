import { Option } from 'effect'
import type { CartesianSnapshot } from './definition'
import type { NativeObservation } from './native-resource'
import type { Interaction } from './state'
import { chartViewport } from './viewport'

export type ModelViewportDemand = 'RenderContext' | 'Always'

export function timeSeriesPublication<Row>(
  observe: NativeObservation,
  state: () => Interaction | undefined,
  snapshot: () => CartesianSnapshot<Row> | undefined,
  needsViewport: () => boolean,
) {
  let domainKey = ''
  let viewportKey: string | undefined
  let demanded = needsViewport()
  let demandGeneration = 0
  let disposed = false

  const draw = (next: CartesianSnapshot<Row>, activate = false) => {
    const current = state()
    const viewport = needsViewport() ? chartViewport(next) : undefined
    const nextDomainKey = JSON.stringify([next.domains.y, next.targetY])
    const nextViewportKey = viewport === undefined ? undefined : JSON.stringify(viewport)

    const semantic =
      nextDomainKey !== domainKey || current === undefined || current.updateStep === 'snap'

    const geometry =
      viewport !== undefined &&
      (activate ||
        nextViewportKey !== viewportKey ||
        current === undefined ||
        Option.isNone(current.viewport))

    if (!semantic && !geometry) {
      return
    }

    domainKey = nextDomainKey
    viewportKey = nextViewportKey
    const generation = demandGeneration

    queueMicrotask(() => {
      const currentDemand = needsViewport() && generation === demandGeneration

      if (!disposed && (semantic || currentDemand)) {
        observe.domains(next.domains.y, next.targetY, currentDemand ? viewport : undefined)
      }
    })
  }

  return {
    draw,
    configure: () => {
      const nextDemand = needsViewport()

      if (nextDemand === demanded) {
        return
      }

      demanded = nextDemand
      demandGeneration += 1
      viewportKey = undefined

      if (!demanded) {
        return
      }

      const generation = demandGeneration

      queueMicrotask(() => {
        const latest = snapshot()

        if (
          !disposed &&
          generation === demandGeneration &&
          needsViewport() &&
          latest !== undefined
        ) {
          draw(latest, true)
        }
      })
    },
    destroy: () => {
      disposed = true
    },
  }
}
