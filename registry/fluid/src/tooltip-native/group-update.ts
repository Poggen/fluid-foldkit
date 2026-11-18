import { Option, Record } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { effectiveOpen, groupConfiguration } from './domain.js'
import { GroupVisual, visualOwner } from './group-visual.js'
import type { GroupSide, TransferGeometry } from './group-visual.js'
import type { PresentationModel } from './state.js'

export const finishGroupHold: (
  model: PresentationModel,
  groupKey: string,
  generation: number,
) => PresentationModel = (model: PresentationModel, groupKey: string, generation: number) => {
  const group = model.groups[groupKey]
  const visual = group?.visual
  if (group === undefined || visual?._tag !== 'Holding' || visual.generation !== generation)
    return model
  return modifyFields(model, {
    groups: (groups) =>
      Record.set(
        groups,
        groupKey,
        modifyFields(group, {
          visual: () =>
            GroupVisual.Exiting({
              key: visual.key,
              generation,
            }),
        }),
      ),
  })
}

export const captureGroupTransfer: (
  model: PresentationModel,
  key: string,
  measured: {
    readonly generation: number
    readonly connected: boolean
    readonly fromSide: GroupSide
    readonly toSide: GroupSide
    readonly geometry: TransferGeometry
  },
) => PresentationModel = (
  model: PresentationModel,
  key: string,
  measured: {
    readonly generation: number
    readonly connected: boolean
    readonly fromSide: GroupSide
    readonly toSide: GroupSide
    readonly geometry: TransferGeometry
  },
) => {
  const row = model.rows[key]
  const group = row === undefined ? undefined : model.groups[row.groupKey]
  const transfer = group?.visual
  if (
    row === undefined ||
    group === undefined ||
    transfer?._tag !== 'Transferring' ||
    transfer.to !== key ||
    transfer.generation !== measured.generation ||
    Option.isSome(transfer.geometry) ||
    !effectiveOpen(row.presentation)
  )
    return model
  const source = model.rows[transfer.from]
  const glide =
    measured.connected &&
    source !== undefined &&
    !effectiveOpen(source.presentation) &&
    measured.fromSide === measured.toSide
  const visual = glide
    ? GroupVisual.Transferring({ ...transfer, geometry: Option.some(measured.geometry) })
    : GroupVisual.Shown({ key, generation: transfer.generation })
  return modifyFields(model, {
    groups: (groups) =>
      Record.set(
        groups,
        row.groupKey,
        modifyFields(group, {
          visual: () => visual,
          preferredSide: () => Option.some(measured.toSide),
        }),
      ),
    rows: (rows) =>
      glide && source !== undefined
        ? Record.set(
            rows,
            transfer.from,
            modifyFields(source, {
              presentation: (presentation) => modifyFields(presentation, { phase: () => 'absent' }),
            }),
          )
        : rows,
  })
}

export const settleGroupTransfer: (
  model: PresentationModel,
  key: string,
  generation: number,
) => PresentationModel = (model: PresentationModel, key: string, generation: number) => {
  const row = model.rows[key]
  const group = row === undefined ? undefined : model.groups[row.groupKey]
  if (
    row === undefined ||
    group?.visual._tag !== 'Transferring' ||
    group.visual.to !== key ||
    group.visual.generation !== generation
  )
    return model
  return modifyFields(model, {
    groups: (groups) =>
      Record.set(
        groups,
        row.groupKey,
        modifyFields(group, { visual: () => GroupVisual.Shown({ key, generation }) }),
      ),
  })
}

export const placeGroup: (
  model: PresentationModel,
  key: string,
  generation: number,
  side: GroupSide,
) => PresentationModel = (
  model: PresentationModel,
  key: string,
  generation: number,
  side: GroupSide,
) => {
  const row = model.rows[key]
  const group = row === undefined ? undefined : model.groups[row.groupKey]
  if (
    row === undefined ||
    group === undefined ||
    group.presentation !== 'morph' ||
    group.visual.generation !== generation ||
    visualOwner(group.visual) !== key
  )
    return model
  return modifyFields(model, {
    groups: (groups) =>
      Record.set(
        groups,
        row.groupKey,
        modifyFields(group, { preferredSide: () => Option.some(side) }),
      ),
  })
}

export const removeGroupVisual: (visual: GroupVisual, key: string) => GroupVisual = (
  visual: GroupVisual,
  key: string,
) => {
  if (visual._tag === 'Transferring') {
    if (visual.to === key) return GroupVisual.Empty({ generation: visual.generation + 1 })
    if (visual.from === key && Option.isNone(visual.geometry))
      return GroupVisual.Shown({ key: visual.to, generation: visual.generation + 1 })
    return visual
  }
  return visual._tag !== 'Empty' && visual.key === key
    ? GroupVisual.Empty({ generation: visual.generation + 1 })
    : visual
}

export const configureGroupPresentation = (
  model: PresentationModel,
  groupKey: string,
  presentation: 'independent' | 'morph',
) => {
  const group = model.groups[groupKey]
  if (group === undefined || group.presentation === presentation) return group?.visual
  const active = Option.isSome(group.active) ? model.rows[group.active.value] : undefined
  return presentation === 'morph' &&
    Option.isSome(group.active) &&
    active !== undefined &&
    effectiveOpen(active.presentation)
    ? GroupVisual.Shown({ key: group.active.value, generation: group.visual.generation + 1 })
    : GroupVisual.Empty({ generation: group.visual.generation + 1 })
}

export const configureGroup = (
  model: PresentationModel,
  groupKey: string,
  options: Parameters<typeof groupConfiguration>[0],
) => {
  const group = model.groups[groupKey]
  if (group === undefined) throw new Error(`Unknown Tooltip group ${groupKey}`)
  const settings = groupConfiguration(
    options,
    Object.values(model.rows).some((row) => row.groupKey === groupKey && row.ownsGroup),
  )
  const timeoutChanged = settings.skipDelayDuration !== group.skipDelayDuration
  const active = Option.isSome(group.active) ? model.rows[group.active.value] : undefined
  const cooling =
    Option.isSome(group.active) && (active === undefined || !effectiveOpen(active.presentation))
  const generation = group.cooldownGeneration + (timeoutChanged ? 1 : 0)
  const nextGroup = modifyFields(group, {
    preferredSide: () =>
      options.presentation !== undefined && options.presentation !== group.presentation
        ? Option.none()
        : group.preferredSide,
    presentation: () => options.presentation ?? group.presentation,
    visual: () =>
      configureGroupPresentation(model, groupKey, options.presentation ?? group.presentation) ??
      group.visual,
    delayDuration: () => settings.delayDuration,
    skipDelayDuration: () => settings.skipDelayDuration,
    disableHoverableContent: () => settings.disableHoverableContent,
    cooldownGeneration: () => generation,
    active: (current) =>
      timeoutChanged && cooling && !settings.skipDelayDuration ? Option.none() : current,
  })
  return { settings, timeoutChanged, cooling, generation, nextGroup }
}

export const completeGroupExit: (
  model: PresentationModel,
  key: string,
  generation: number,
) => PresentationModel = (model: PresentationModel, key: string, generation: number) => {
  const row = model.rows[key]
  if (
    row === undefined ||
    row.presentation.generation !== generation ||
    row.presentation.phase !== 'exiting' ||
    effectiveOpen(row.presentation)
  )
    return model
  const group = model.groups[row.groupKey]
  if (
    group?.presentation === 'morph' &&
    ((group.visual._tag === 'Holding' && group.visual.key === key) ||
      (group.visual._tag === 'Transferring' &&
        group.visual.from === key &&
        Option.isNone(group.visual.geometry)))
  )
    return model
  return modifyFields(model, {
    rows: (rows) =>
      Record.set(
        rows,
        key,
        modifyFields(row, { presentation: (p) => modifyFields(p, { phase: () => 'absent' }) }),
      ),
    groups: (groups) =>
      group?.visual._tag === 'Exiting' && group.visual.key === key
        ? Record.set(
            groups,
            row.groupKey,
            modifyFields(group, {
              visual: () => GroupVisual.Empty({ generation: group.visual.generation + 1 }),
            }),
          )
        : groups,
  })
}
