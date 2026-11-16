import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import type { Presentation, Group } from './domain.js'

export const resetTriggerPresentation = (
  presentation: Presentation,
  generation: number,
): Presentation =>
  modifyFields(presentation, {
    internalOpen: () => false,
    lastOpenReason: () => 'application',
    phase: () =>
      Option.contains(presentation.configuration.forceOpen, true) ? 'present' : 'absent',
    generation: () => generation,
  })

export const releaseTriggerLease = (group: Group): Group =>
  modifyFields(group, {
    active: () => Option.none(),
    cooldownGeneration: (generation) => generation + 1,
  })
