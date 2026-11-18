/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Option, Number } from 'effect'
import type { Block } from 'foldkit'
import { dialogContract, RefreshContainer, DialogEffectsLayer } from './dialog-definition.js'
import type { DialogConfig } from './dialog-state.js'
import { dialogView } from './dialog-view.js'
import { dialogComposition } from './dialog-composition.js'

export const dialogPlans = <const Key extends symbol>(
  DialogBlock: ReturnType<typeof Block.make<'FluidDialog', Key, typeof dialogContract>>,
) => {
  const { Model, OutMessage } = dialogContract
  const DialogComposition = dialogComposition<Key>(DialogBlock)

  type Model = typeof Model.Type

  const accept: (model: Model, open: boolean) => Model = (model: Model, open: boolean) =>
    model.isOpen === open
      ? model
      : modifyFields(model, {
          isOpen: () => open,
          phase: () => (open ? 'Opening' : 'Closing'),
          generation: Number.increment,
        })

  const request = DialogBlock.makeStep((model, { open }: { readonly open: boolean }) => {
    if (model.isOpen === open) {
      return { model }
    }

    const shadowOpen = Option.isNone(model.control) ? open : model.shadowOpen
    const next = modifyFields(model, { shadowOpen: () => shadowOpen })

    return {
      model: Option.isNone(model.control) ? accept(next, open) : next,
      outMessage: OutMessage.OpenChanged({ open }),
    }
  })

  const init = DialogComposition.makeInit((config: DialogConfig) => ({
    model: {
      id: config.id,
      parentId: Option.fromUndefinedOr(config.parentDialogId),
      focusSelector: Option.fromUndefinedOr(config.focusSelector),
      returnFocusSelector: Option.fromUndefinedOr(config.returnFocusSelector),
      mounted: false,
      scoped: false,
      control: Option.fromUndefinedOr(config.open),
      shadowOpen: config.defaultOpen ?? false,
      isOpen: false,
      modal: config.modal ?? true,
      phase: 'Closed',
      generation: 0,
    },
  }))

  const update = DialogComposition.makeUpdate({
    Mounted: (model, { scoped }) => ({
      model: accept(
        modifyFields(model, { mounted: () => true, scoped: () => scoped }),
        Option.getOrElse(model.control, () => model.shadowOpen),
      ),
    }),
    ResolvedContainer: (model, { scoped }) => ({
      model: modifyFields(model, { scoped: () => scoped }),
    }),
    ObservedOpenIntent: request,
    Entered: (model, { generation }) => ({
      model:
        model.generation === generation && model.isOpen && model.phase === 'Opening'
          ? modifyFields(model, { phase: () => 'Open' })
          : model,
    }),
    CompletedExit: (model, { generation }) => ({
      model:
        model.generation === generation && !model.isOpen && model.phase === 'Closing'
          ? modifyFields(model, { phase: () => 'Closed' })
          : model,
    }),
    Released: (model, { generation }) =>
      model.generation === generation && !model.isOpen && model.phase === 'Closed'
        ? { model, outMessage: OutMessage.CompletedClose() }
        : { model },
  })

  const inMessageUpdate = DialogComposition.makeInMessageUpdate({
    RequestedOpen: (model) => request(model, { open: true }),
    RequestedClose: (model) => request(model, { open: false }),
    RequestedToggle: (model) => request(model, { open: !model.isOpen }),
    RequestedControlledOpen: (model, { control }) => ({
      model: accept(
        modifyFields(model, { control: () => control }),
        Option.getOrElse(control, () => model.shadowOpen),
      ),
    }),
    RequestedModal: (model, { modal }) => ({ model: modifyFields(model, { modal: () => modal }) }),
    RequestedReturnFocus: (model, { selector }) => ({
      model: modifyFields(model, { returnFocusSelector: () => selector }),
    }),
    RequestedRefreshContainer: (model) => ({
      model,
      commands: [RefreshContainer({ id: model.id })],
    }),
  })

  return {
    init,
    update,
    inMessageUpdate,
    view: dialogView<Key>(DialogComposition),
    EffectsLayer: DialogEffectsLayer,
  }
}
