// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Number, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import {
  OutMessage,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeStep,
  makeNoopStep,
  makeFieldsStep,
  makeCommandsStep,
  makeComposition,
} from './block.js'
import type { SelectConfig } from './block.js'
import { DropdownEvent } from '../dropdown-composition.js'
import { DropdownMenuBlock } from '../dropdown.js'
import { Acknowledge } from './effects.js'
import { ObserveForm } from './form.js'

const RawMenu = makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'menu',
  init: {
    contextToArgs: (config: SelectConfig) => {
      const initial = {
        id: `${config.id}-select`,
        ...(config.hoverMode === undefined ? {} : { hoverMode: config.hoverMode }),
        disabled: config.disabled ?? false,
        checkedIndex: config.items.findIndex(
          (item) => item.value === (config.value ?? config.defaultValue ?? ''),
        ),
      }

      const rooted = config.rootId === undefined ? initial : { ...initial, rootId: config.rootId }

      return [config.parentId === undefined ? rooted : { ...rooted, parentId: config.parentId }]
    },
  },
})

export const Menu = RawMenu.withOutMessagePolicy({
  fold: makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      makeStep((model) => {
        const selected = events.find(Schema.is(DropdownEvent.cases.Selected))

        if (selected !== undefined) {
          const item = model.items[selected.index]

          if (item === undefined || item.disabled === true) {
            return makeNoopStep()
          }

          const generation = model.acknowledgement + 1

          const nextValue = model.controlled ? model.value : item.value

          const steps = Update.combineSteps([
            makeFieldsStep(() => ({
              value: () => nextValue,
              acknowledgement: () => generation,
            })),
            RawMenu.requestSelection({
              selection: {
                checkedIndex: Option.some(
                  model.items.findIndex((option) => option.value === nextValue),
                ),
                checkedIndices: Option.none(),
              },
            }),
            makeCommandsStep(() => [Acknowledge({ generation })]),
          ])

          return (registered: Parameters<typeof steps>[0]) =>
            Update.withOutMessage(steps(registered), OutMessage.Selected({ value: item.value }))
        }

        const changed = events.find(Schema.is(DropdownEvent.cases.OpenChanged))

        if (changed === undefined) {
          return makeNoopStep()
        }

        const steps = Update.combineSteps([
          makeFieldsStep(() => ({ acknowledgement: Number.increment })),
          ...(changed.open ? [] : [RawMenu.requestOverlaysHidden()]),
        ])

        return (registered: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(steps(registered), OutMessage.OpenChanged({ open: changed.open }))
      }),
  }),
})

export const SelectComposition = makeComposition({ bindings: [Menu], mounts: [ObserveForm] })
