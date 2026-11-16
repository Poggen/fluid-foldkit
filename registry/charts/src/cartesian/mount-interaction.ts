import { initialInteraction } from './state'
import type { Interaction } from './state'
import { modifyFields } from 'foldkit/struct'

export function remountInteraction(state: Interaction, startRevealing: boolean): Interaction {
  const fresh = initialInteraction(state.configuration)

  return modifyFields(fresh, {
    generation: () => state.generation + 1,
    domains: () => state.domains,
    viewport: () => state.viewport,
    yDomainFrom: () => state.domains,
    revealReady: (revealReady) =>
      startRevealing && state.configuration.animationDuration > 0 ? false : revealReady,
  })
}
