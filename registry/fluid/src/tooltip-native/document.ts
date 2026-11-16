import { resetTriggerPresentation, releaseTriggerLease } from './trigger-lifecycle.js'
import { flow, pipe, Layer, Option, Record, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { configuration, effectiveOpen, groupConfiguration } from './domain.js'
import type { InteractionContext, Presentation } from './domain.js'
import { Message, InMessage, OutMessage, registration } from './document-messages.js'
import { TooltipInteractionBlock, layer as InteractionLayer } from './interaction.js'
import type { DocumentTooltipRenderInputs } from './document-inputs.js'
import { renderDocumentTooltip } from './document-view.js'
import type { TooltipDom } from './resources.js'
import { Model, admit, transition } from './state.js'
import type { PresentationModel } from './state.js'
import { TooltipGroupClockBlock, layer as ClockLayer } from './group-clock.js'

export const DocumentTooltipKey = Symbol('DocumentTooltip')

export const DocumentTooltipBlock = Block.make('DocumentTooltip', {
  key: DocumentTooltipKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<DocumentTooltipRenderInputs>() },
  effects: Block.makeEffectsContract<never, TooltipDom>(),
  inMessageOutputs: {
    RequestedAdd: { outMessage: OutMessage.Transaction },
    RequestedConfigure: { outMessage: OutMessage.Transaction },
    RequestedVisibility: { outMessage: OutMessage.Transaction },
  },
})

const contextFor = (model: PresentationModel, key: string): InteractionContext => {
  const row = model.rows[key]

  if (row === undefined) {
    throw new Error(`Unknown Tooltip occurrence ${key}`)
  }

  const group = model.groups[row.groupKey]

  if (group === undefined) {
    throw new Error(`Unknown Tooltip group ${row.groupKey}`)
  }

  return { presentation: row.presentation, group }
}

const Interactions = DocumentTooltipBlock.makeRecordBinding(TooltipInteractionBlock, {
  field: 'rows',
  childField: 'interaction',
  delivery: { toUpdateContext: (model, key) => [contextFor(model, key)] },
})

const Clocks = DocumentTooltipBlock.makeRecordBinding(TooltipGroupClockBlock, {
  field: 'clocks',
})

const expireCooldown = (groupKey: string, generation: number) =>
  DocumentTooltipBlock.makeFieldsStep(() => ({
    groups: (groups) => {
      const group = groups[groupKey]

      return group === undefined || group.cooldownGeneration !== generation
        ? groups
        : Record.set(groups, groupKey, modifyFields(group, { active: () => Option.none() }))
    },
  }))

const ClocksWithPolicy = Clocks.withOutMessagePolicy({
  fold: (key, outMessage) =>
    DocumentTooltipBlock.makeOutMessageFold(TooltipGroupClockBlock, {
      Elapsed: ({ generation }) => expireCooldown(key, generation),
    })(outMessage),
})

const applyTransition = (result: ReturnType<typeof transition>) =>
  DocumentTooltipBlock.makeStep(() => {
    const changedGroups = [
      ...new Set(
        [...result.transaction.admissions, ...result.transaction.changes].flatMap((fact) => {
          const row = result.model.rows[fact.key]

          return row === undefined ? [] : [row.groupKey]
        }),
      ),
    ]

    const clocks = changedGroups.map((groupKey) =>
      DocumentTooltipBlock.makeStep(() => {
        const group = result.model.groups[groupKey]

        if (group === undefined) {
          return DocumentTooltipBlock.makeNoopStep()
        }

        {
          const active = Option.isSome(group.active)
            ? result.model.rows[group.active.value]
            : undefined

          return active === undefined || effectiveOpen(active.presentation)
            ? Clocks.requestCancel(groupKey)
            : Clocks.requestSchedule(groupKey, {
                generation: group.cooldownGeneration,
                delay: group.skipDelayDuration,
              })
        }
      }),
    )

    const combined = Update.combineSteps([
      DocumentTooltipBlock.makeFieldsStep(() => ({
        groups: () => result.model.groups,
        generation: () => result.model.generation,
        sequence: () => result.model.sequence,
        rows: (rows) =>
          pipe(
            rows,
            Record.map((row, key) => {
              const planned = result.model.rows[key]

              return planned === undefined
                ? row
                : modifyFields(row, { presentation: () => planned.presentation })
            }),
          ),
      })),
      ...clocks,
      ...result.transaction.changes.map(({ key }) =>
        DocumentTooltipBlock.makeStep(() => {
          const row = result.model.rows[key]

          return row === undefined
            ? DocumentTooltipBlock.makeNoopStep()
            : Interactions.requestExitWait(key, {
                generation:
                  row.presentation.phase === 'exiting'
                    ? Option.some(row.presentation.generation)
                    : Option.none(),
              })
        }),
      ),
      ...result.transaction.admissions.map((admission) =>
        Interactions.requestCancelWait(admission.key),
      ),
    ])

    return combined
  })

const transactionMessage = (result: ReturnType<typeof transition>) =>
  result.transaction.admissions.length === 0 && result.transaction.changes.length === 0
    ? undefined
    : OutMessage.Transaction(result.transaction)

const commitTransition = (result: ReturnType<typeof transition>) =>
  DocumentTooltipBlock.makeStep(() =>
    flow(applyTransition(result), Update.withOutMessage(transactionMessage(result))),
  )

const requestVisibility = (key: string, next: boolean, reason: string) =>
  DocumentTooltipBlock.makeStep((model) => commitTransition(admit(model, key, next, reason)))

const InteractionsWithPolicy = Interactions.withOutMessagePolicy({
  fold: (key, outMessage) =>
    DocumentTooltipBlock.makeOutMessageFold(TooltipInteractionBlock, {
      RequestedVisibility: ({ next, reason }) => requestVisibility(key, next, reason),
      TriggerMounted: () =>
        DocumentTooltipBlock.makeStep((model) =>
          commitTransition(transition(model, key, { kind: 'inserted' })),
        ),
      TriggerUnmounted: () =>
        DocumentTooltipBlock.makeStep((model) => {
          const row = model.rows[key]

          if (row === undefined) {
            return DocumentTooltipBlock.makeNoopStep()
          }

          const group = model.groups[row.groupKey]
          const ownsLease = group !== undefined && Option.contains(group.active, key)

          return Update.combineSteps([
            DocumentTooltipBlock.makeFieldsStep(() => ({
              generation: (generation) => generation + 1,
              rows: (rows) =>
                Record.set(
                  rows,
                  key,
                  modifyFields(row, {
                    presentation: (presentation) =>
                      resetTriggerPresentation(presentation, model.generation + 1),
                  }),
                ),
              groups: (groups) =>
                ownsLease ? Record.set(groups, row.groupKey, releaseTriggerLease(group)) : groups,
            })),
            ...(ownsLease ? [Clocks.requestCancel(row.groupKey)] : []),
          ])
        }),
      CompletedExit: ({ generation }) =>
        DocumentTooltipBlock.makeFieldsStep(() => ({
          rows: (rows) => {
            const row = rows[key]

            return row === undefined ||
              row.presentation.generation !== generation ||
              effectiveOpen(row.presentation)
              ? rows
              : Record.set(
                  rows,
                  key,
                  modifyFields(row, {
                    presentation: (presentation) =>
                      modifyFields(presentation, { phase: () => 'absent' }),
                  }),
                )
          },
        })),
    })(outMessage),
})

const DocumentTooltipComposition = DocumentTooltipBlock.makeComposition({
  bindings: [InteractionsWithPolicy, ClocksWithPolicy],
})

const update = DocumentTooltipComposition.makeUpdate({})

const inMessageUpdate = DocumentTooltipComposition.makeInMessageUpdate({
  RequestedAdd: DocumentTooltipBlock.makeStep.fromMessage((input) => {
    const { key, groupKey, group, ownsGroup, configuration: config } = registration(input)

    return DocumentTooltipBlock.makeStep((model) => {
      if (model.rows[key] !== undefined) {
        throw new Error(`Duplicate Tooltip occurrence ${key}`)
      }

      const existing = model.groups[groupKey]

      const presentation: Presentation = {
        configuration: config,
        internalOpen: false,
        lastOpenReason: 'application',
        phase: Option.contains(config.forceOpen, true) ? 'present' : 'absent',
        generation: model.generation + 1,
      }

      const insert = DocumentTooltipBlock.makeStep((current) =>
        Interactions.init({
          key,
          args: [{ id: key }],
          toParentModel: (interaction) =>
            modifyFields(current, {
              generation: (generation) => generation + 1,
              groups: (groups) =>
                existing === undefined ? Record.set(groups, groupKey, group) : groups,
              rows: (rows) =>
                Record.set(rows, key, { groupKey, ownsGroup, interaction, presentation }),
            }),
        }),
      )

      const initialize =
        existing === undefined
          ? Update.combineSteps([
              DocumentTooltipBlock.makeStep((current) =>
                Clocks.init({
                  key: groupKey,
                  args: [],
                  toParentModel: (clock) =>
                    modifyFields(current, {
                      clocks: (clocks) => Record.set(clocks, groupKey, clock),
                    }),
                }),
              ),
              insert,
            ])
          : insert

      const inserted: PresentationModel = {
        ...model,
        generation: model.generation + 1,
        groups: existing === undefined ? Record.set(model.groups, groupKey, group) : model.groups,
        rows: { ...model.rows, [key]: { groupKey, ownsGroup, presentation } },
      }

      const result = transition(inserted, key, { kind: 'inserted' })

      return flow(
        Update.combineSteps([initialize, applyTransition(result)]),
        Update.withOutMessage(transactionMessage(result)),
      )
    })
  }),
  RequestedRemove: (model, { key }) => {
    const row = model.rows[key]

    if (row === undefined) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        rows: (rows) => Record.remove(rows, key),
        clocks: (clocks) => (row.ownsGroup ? Record.remove(clocks, row.groupKey) : clocks),
        groups: (groups) => {
          if (row.ownsGroup) {
            return Record.remove(groups, row.groupKey)
          }

          const previous = groups[row.groupKey]

          const group = previous

          if (
            group !== undefined &&
            Option.contains(group.active, key) &&
            effectiveOpen(row.presentation)
          ) {
            return Record.set(
              groups,
              row.groupKey,
              modifyFields(group, {
                active: () => Option.none(),
                cooldownGeneration: (generation) => generation + 1,
              }),
            )
          }

          return group === undefined ? groups : Record.set(groups, row.groupKey, group)
        },
      }),
    }
  },
  RequestedGroup: DocumentTooltipBlock.makeStep.fromMessage(({ groupKey, ...options }) =>
    DocumentTooltipBlock.makeStep((model) => {
      const group = model.groups[groupKey]

      if (group === undefined) {
        return DocumentTooltipBlock.makeNoopStep()
      }

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
        delayDuration: () => settings.delayDuration,
        skipDelayDuration: () => settings.skipDelayDuration,
        disableHoverableContent: () => settings.disableHoverableContent,
        cooldownGeneration: () => generation,
        active: (current) =>
          timeoutChanged && cooling && !settings.skipDelayDuration ? Option.none() : current,
      })

      const updated = modifyFields(model, {
        groups: (groups) => Record.set(groups, groupKey, nextGroup),
      })

      const clock = DocumentTooltipBlock.makeStep(() => {
        if (!timeoutChanged) {
          return DocumentTooltipBlock.makeNoopStep()
        }

        return cooling && settings.skipDelayDuration
          ? Clocks.requestSchedule(groupKey, { generation, delay: settings.skipDelayDuration })
          : Clocks.requestCancel(groupKey)
      })

      return Update.combineSteps([
        DocumentTooltipBlock.makeFieldsStep(() => ({ groups: () => updated.groups })),
        clock,
        ...Object.entries(updated.rows)
          .filter(([, row]) => row.groupKey === groupKey && settings.disableHoverableContent)
          .map(([key]) => Interactions.requestClearGrace(key)),
      ])
    }),
  ),
  RequestedConfigure: DocumentTooltipBlock.makeStep.fromMessage(({ key, options }) =>
    DocumentTooltipBlock.makeStep((model) =>
      commitTransition(
        transition(model, key, { kind: 'configure', configuration: configuration(options) }),
      ),
    ),
  ),
  RequestedVisibility: DocumentTooltipBlock.makeStep.fromMessage(({ key, next, reason }) =>
    requestVisibility(key, next, reason),
  ),
})

const init = DocumentTooltipComposition.makeInit(() => ({
  model: { rows: {}, groups: {}, clocks: {}, generation: 0, sequence: 0 },
}))

export type {
  DocumentTooltipViewInputs,
  DocumentTooltipTriggerInputs,
  DocumentTooltipPopupEntry,
  DocumentTooltipPopupInputs,
  DocumentTooltipRenderInputs,
} from './document-inputs.js'

const view = DocumentTooltipComposition.makeView.withInputs<DocumentTooltipRenderInputs>(
  (model, inputs, h) =>
    renderDocumentTooltip(model, inputs, (key, interaction, viewInputs) =>
      h.block(
        Interactions.embedView({
          key,
          slotId: `${key}-${viewInputs.part}`,
          model: interaction,
          viewInputs,
        }),
      ),
    ),
)

export const layer = DocumentTooltipBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(InteractionLayer, ClockLayer)))
