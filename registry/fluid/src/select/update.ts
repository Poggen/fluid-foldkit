/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Option } from 'effect'
import { Update } from 'foldkit'
import { OutMessage, makeStep, makeNoopStep, makeFieldsStep, makeCommandsStep } from './block.js'
import type { Message, InMessage } from './block.js'
import { SelectComposition, Menu } from './composition.js'
import { ClearSearch } from './effects.js'

const acceptNative = (value: string) =>
  makeStep((model) => {
    const nextValue = model.controlled ? model.value : value

    const steps = Update.combineSteps([
      makeFieldsStep(() => ({ value: () => nextValue })),
      Menu.requestSelection({
        selection: {
          checkedIndex: Option.some(model.items.findIndex((item) => item.value === nextValue)),
          checkedIndices: Option.none(),
        },
      }),
    ])

    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(registered), OutMessage.Selected({ value }))
  })

export const update = SelectComposition.makeUpdate({
  NativeSelected: makeStep((_model, { value }: typeof Message.NativeSelected.Type) =>
    acceptNative(value),
  ),
  FormReset: makeStep((model) => {
    const value = model.controlled ? model.value : model.initialValue

    return Update.combineSteps([
      makeFieldsStep(() => ({ value: () => value })),
      Menu.requestSelection({
        selection: {
          checkedIndex: Option.some(model.items.findIndex((item) => item.value === value)),
          checkedIndices: Option.none(),
        },
      }),
    ])
  }),
  TypedCharacter: makeStep((model, { character }: typeof Message.TypedCharacter.Type) => {
    const search = model.search + character.toLocaleLowerCase()

    const repeated = search.split('').every((letter) => letter === search[0])

    const needle = repeated ? character.toLocaleLowerCase() : search

    const current = model.items.findIndex((item) => item.value === model.value)

    const ordered = [...model.items.slice(current + 1), ...model.items.slice(0, current + 1)]

    const item = ordered.find(
      (entry) => entry.disabled !== true && entry.label.toLocaleLowerCase().startsWith(needle),
    )

    const generation = model.searchGeneration + 1

    const steps = Update.combineSteps([
      makeFieldsStep(() => ({
        search: () => search,
        searchGeneration: () => generation,
        value: () => (item === undefined || model.controlled ? model.value : item.value),
      })),
      Menu.requestSelection({
        selection: {
          checkedIndex: Option.some(
            model.items.findIndex(
              (entry) =>
                entry.value === (item === undefined || model.controlled ? model.value : item.value),
            ),
          ),
          checkedIndices: Option.none(),
        },
      }),
      makeCommandsStep(() => [ClearSearch({ generation })]),
    ])

    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(registered),
        item === undefined ? undefined : OutMessage.Selected({ value: item.value }),
      )
  }),
  ClearedSearch: (model, { generation }) => ({
    model:
      generation === model.searchGeneration ? modifyFields(model, { search: () => '' }) : model,
  }),
  CompletedAcknowledgement: makeStep(
    (model, { generation }: typeof Message.CompletedAcknowledgement.Type) =>
      generation === model.acknowledgement
        ? Menu.requestVisibility({ open: false })
        : makeNoopStep(),
  ),
})

export const inMessageUpdate = SelectComposition.makeInMessageUpdate({
  RequestedConfigure: makeStep(
    (model, { items, value, disabled }: typeof InMessage.RequestedConfigure.Type) => {
      const nextValue = value ?? model.value

      return Update.combineSteps([
        makeFieldsStep(() => ({
          items: () => items,
          value: () => nextValue,
          controlled: () => value !== undefined,
          disabled: () => disabled ?? false,
        })),
        Menu.requestDisabled({ disabled: disabled ?? false }),
        Menu.requestSelection({
          selection: {
            checkedIndex: Option.some(items.findIndex((item) => item.value === nextValue)),
            checkedIndices: Option.none(),
          },
        }),
      ])
    },
  ),
  RequestedHoverMode: makeStep.fromMessage((message: typeof InMessage.RequestedHoverMode.Type) =>
    Menu.requestHoverMode(message),
  ),
  RequestedOpen: Menu.requestVisibility({ open: true }),
  RequestedClose: Menu.requestVisibility({ open: false }),
})
