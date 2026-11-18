import { Option, Record, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Group, Presentation, effectiveOpen } from './domain.js'
import { reconcileGroupVisuals } from './group-transitions.js'
import type { Admission, Configuration, Transaction } from './domain.js'
import { TooltipGroupClockBlock } from './group-clock.js'
import { TooltipInteractionBlock } from './interaction.js'

export const Row = Schema.Struct({
  groupKey: Schema.String,
  ownsGroup: Schema.Boolean,
  presentation: Presentation,
  interaction: TooltipInteractionBlock.Model,
})
export type Row = typeof Row.Type
export const Model = Schema.Struct({
  clocks: Schema.Record(Schema.String, TooltipGroupClockBlock.Model),
  rows: Schema.Record(Schema.String, Row),
  groups: Schema.Record(Schema.String, Group),
  generation: Schema.Natural,
  sequence: Schema.Natural,
})
export type Model = typeof Model.Type

export type PresentationModel = Pick<Model, 'groups' | 'generation' | 'sequence'> & {
  readonly rows: { readonly [key: string]: Omit<Row, 'interaction'> }
}
export const settlePresentation: (
  before: Presentation,
  next: Presentation,
  generation: number,
) => Presentation = (before: Presentation, next: Presentation, generation: number) => {
  const wasOpen = effectiveOpen(before)
  const open = effectiveOpen(next)
  return wasOpen === open
    ? next
    : modifyFields(next, {
        phase: () => (open ? 'present' : before.phase === 'absent' ? 'absent' : 'exiting'),
        generation: () => generation,
      })
}
type Change = { readonly key: string; readonly open: boolean }
export function transition(
  model: PresentationModel,
  key: string,
  input:
    | { readonly kind: 'request'; readonly next: boolean; readonly reason: string }
    | { readonly kind: 'configure'; readonly configuration: Configuration }
    | { readonly kind: 'inserted' },
) {
  const requested = model.rows[key]
  if (requested === undefined)
    return { model, transaction: { admissions: [], changes: [] } satisfies Transaction }
  const group = model.groups[requested.groupKey]
  if (group === undefined) throw new Error('Tooltip row has no delay group')
  let updated = model
  const admissions: Array<Admission> = []
  const changes: Array<Change> = []
  const apply = (target: string, value: boolean, cause: string) => {
    const row = updated.rows[target]
    if (row === undefined || value === effectiveOpen(row.presentation)) return
    const generation = updated.generation + 1
    const sequence = updated.sequence + 1
    const presentation = settlePresentation(
      row.presentation,
      modifyFields(row.presentation, {
        internalOpen: () => value,
        lastOpenReason: (reason) => (value ? cause : reason),
      }),
      generation,
    )
    if (effectiveOpen(row.presentation) !== effectiveOpen(presentation))
      changes.push({ key: target, open: effectiveOpen(presentation) })
    admissions.push({ key: target, next: value, reason: cause, sequence })
    updated = modifyFields(updated, {
      generation: () => generation,
      sequence: () => sequence,
      rows: (rows) =>
        Record.set(rows, target, modifyFields(row, { presentation: () => presentation })),
    })
  }
  if (input.kind === 'request') {
    if (input.next === effectiveOpen(requested.presentation))
      return { model, transaction: { admissions, changes } satisfies Transaction }

    apply(key, input.next, input.reason)
  } else if (input.kind === 'configure') {
    const generation = model.generation + 1
    const presentation = settlePresentation(
      requested.presentation,
      modifyFields(requested.presentation, { configuration: () => input.configuration }),
      generation,
    )
    updated = modifyFields(model, {
      generation: () => generation,
      rows: (rows) =>
        Record.set(rows, key, modifyFields(requested, { presentation: () => presentation })),
    })
    if (effectiveOpen(requested.presentation) !== effectiveOpen(presentation))
      changes.push({ key, open: effectiveOpen(presentation) })
  } else if (effectiveOpen(requested.presentation)) changes.push({ key, open: true })

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]
    if (change === undefined) continue
    const row = updated.rows[change.key]
    const current = row === undefined ? undefined : updated.groups[row.groupKey]
    if (row === undefined || current === undefined) continue
    if (change.open) {
      const previous = current.active
      updated = modifyFields(updated, {
        groups: (groups) =>
          Record.set(
            groups,
            row.groupKey,
            modifyFields(current, {
              active: () => Option.some(change.key),
              cooldownGeneration: (generation) => generation + 1,
            }),
          ),
      })
      if (Option.isSome(previous) && previous.value !== change.key)
        apply(previous.value, false, 'group-handover')
    } else if (Option.contains(current.active, change.key)) {
      updated = modifyFields(updated, {
        groups: (groups) =>
          Record.set(
            groups,
            row.groupKey,
            modifyFields(current, {
              active: (active) => (current.skipDelayDuration ? active : Option.none()),
              cooldownGeneration: (generation) => generation + 1,
            }),
          ),
      })
    }
  }
  return {
    model: reconcileGroupVisuals(updated, changes),
    transaction: { admissions, changes } satisfies Transaction,
  }
}
export const admit = (model: PresentationModel, key: string, next: boolean, reason: string) =>
  transition(model, key, { kind: 'request', next, reason })
