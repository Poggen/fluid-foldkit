import { Option, Record } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { effectiveOpen } from './domain.js'
import type { EffectiveChange } from './domain.js'
import { GroupVisual, visualOwner } from './group-visual.js'
import type { PresentationModel } from './state.js'

export const reconcileGroupVisuals: (
  model: PresentationModel,
  changes: ReadonlyArray<EffectiveChange>,
) => PresentationModel = (model: PresentationModel, changes: ReadonlyArray<EffectiveChange>) => {
  let updated = model
  for (const { key, open } of changes) {
    const row = updated.rows[key]
    const group = row === undefined ? undefined : updated.groups[row.groupKey]
    if (row === undefined || group === undefined || group.presentation !== 'morph') continue
    const previous = group.visual
    const owner = visualOwner(previous)
    const generation = previous.generation + 1
    const source = owner === undefined ? undefined : updated.rows[owner]
    let visual = previous
    if (open) {
      updated = modifyFields(updated, {
        rows: (rows) =>
          Record.set(
            rows,
            key,
            modifyFields(row, {
              presentation: (presentation) =>
                modifyFields(presentation, { placementSide: () => group.preferredSide }),
            }),
          ),
      })
      visual =
        owner !== undefined &&
        owner !== key &&
        source !== undefined &&
        !effectiveOpen(source.presentation) &&
        previous._tag !== 'Exiting'
          ? GroupVisual.Transferring({ from: owner, to: key, generation, geometry: Option.none() })
          : GroupVisual.Shown({ key, generation })
    } else if (
      owner === key &&
      !changes.some((change) => change.open && updated.rows[change.key]?.groupKey === row.groupKey)
    ) {
      visual = GroupVisual.Holding({ key, generation })
    }
    updated = modifyFields(updated, {
      groups: (groups) =>
        Record.set(groups, row.groupKey, modifyFields(group, { visual: () => visual })),
    })
  }
  return updated
}

export const heldVisual = (model: PresentationModel, key: string) => {
  const row = model.rows[key]
  const group = row === undefined ? undefined : model.groups[row.groupKey]
  if (group?.presentation !== 'morph') return false
  return (
    (group.visual._tag === 'Holding' && group.visual.key === key) ||
    (group.visual._tag === 'Transferring' &&
      group.visual.from === key &&
      Option.isNone(group.visual.geometry))
  )
}
