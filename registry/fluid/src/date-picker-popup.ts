import { cn } from './lib/utils.js'
import { modifyFields } from 'foldkit/struct'
import { Layer, Number } from 'effect'
import { Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { PopupConfig } from './date-picker-popup-definition.js'
import { PopupBlock, OutMessage, subscriptions } from './date-picker-popup-definition.js'
import { PopupResource } from './date-picker-popup-mount.js'
import type { TargetMotionOptions } from './motion-target.js'
import { Elevated } from './elevated.js'
import type { PresentationContext } from './presentation.js'
import { resolvePresentation } from './presentation.js'
import { popupShape } from './lib/shape.js'
import { popupMotionClass } from './lib/popup.js'
import { spring } from './lib/springs.js'

const Composition = PopupBlock.makeComposition({ mounts: [PopupResource] })

const init = Composition.makeInit((config: PopupConfig, open = false, escapeBlocked = false) => ({
  model: { config, open, openingInteraction: null, retained: open, escapeBlocked, generation: 0 },
}))

const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedOpeningInteraction: (model, { interaction }) => ({
    model: modifyFields(model, { openingInteraction: () => interaction }),
  }),
  RequestedConfigure: (model, { config }) => ({
    model: modifyFields(model, { config: () => config }),
  }),
  RequestedVisibility: (model, { open, escapeBlocked }) => ({
    model: modifyFields(model, {
      open: () => open,
      escapeBlocked: () => escapeBlocked,
      retained: (currentRetained) => open || currentRetained,
      generation: () => (model.open === open ? model.generation : model.generation + 1),
    }),
  }),
  RequestedReset: (model) => ({
    model: modifyFields(model, {
      open: () => false,
      retained: () => false,
      generation: Number.increment,
    }),
  }),
})

const update = Composition.makeUpdate({
  DismissRequested: (model, { reason }) =>
    Update.withOutMessage(
      { model },
      !model.open || (reason === 'escape' && model.escapeBlocked)
        ? undefined
        : OutMessage.DismissRequested({ reason }),
    ),
  ExitFinished: (model, { generation }) =>
    model.open || !model.retained || generation !== model.generation
      ? { model }
      : Update.withOutMessage(
          { model: modifyFields(model, { retained: () => false }) },
          OutMessage.Released(),
        ),
  Disposed: (model) => ({
    model: modifyFields(model, {
      open: () => false,
      retained: () => false,
      generation: Number.increment,
    }),
  }),
})

export interface PopupViewInputs {
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly ariaLabel?: string
  readonly ariaLabelledBy?: string
  readonly context?: PresentationContext
  readonly className?: string
  readonly content: () => ReadonlyArray<Html>
}

const view = Composition.makeView.withInputs<PopupViewInputs>((model, inputs, h) => {
  if (!model.retained) {
    return h.empty
  }

  const elevated = {
    offset: 2,
    shadowLevel: 3,
    className: `${popupShape(resolvePresentation(inputs).shape.variant).container} outline-none select-none ${inputs.className ?? ''}`,
    attributes: [h.DataAttribute('slot', 'date-picker-popup')],
    children: inputs.content,
  }

  const frame = inputs.animate(
    h.div(
      [h.DataAttribute('popup-motion', ''), h.Class(`outline-none ${popupMotionClass}`)],
      [
        Elevated(
          inputs.context === undefined ? elevated : { ...elevated, context: inputs.context },
          h,
        ),
      ],
    ),
    {
      initial: { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
      animate: model.open
        ? { opacity: 1, y: 0, scaleY: 1 }
        : { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
      transition: model.open ? spring.fast : spring.fast.exit,
      onAnimationComplete: (element) => {
        if (model.open) {
          return
        }

        const window = element.ownerDocument.defaultView

        if (window) {
          element.dispatchEvent(
            new window.CustomEvent('fluid-date-picker-exit', {
              bubbles: true,
              detail: model.generation,
            }),
          )
        }
      },
    },
  )

  return h.keyed('div')(
    model.config.id,
    [
      h.Class(
        cn(
          'z-[var(--z-popover,60)] outline-none [--popup-available-height:var(--available-height)]',
          !model.open ? 'pointer-events-none' : '',
        ),
      ),
      h.DataAttribute('popup-config', JSON.stringify(model.config)),
      h.Id(model.config.id),
      h.DataAttribute(model.open ? 'open' : 'closed', ''),
      h.Role('dialog'),
      ...(inputs.ariaLabel === undefined
        ? [h.AriaLabelledBy(inputs.ariaLabelledBy ?? model.config.anchorId)]
        : [h.AriaLabel(inputs.ariaLabel)]),
      h.Tabindex(-1),
      h.DataAttribute('popup-open', String(model.open)),
      h.DataAttribute('popup-opening-interaction', model.openingInteraction ?? 'programmatic'),
      h.DataAttribute('popup-generation', String(model.generation)),
      h.DataAttribute('popup-escape-blocked', String(model.escapeBlocked)),
      h.OnMount(PopupResource({ config: model.config })),
    ],
    [frame],
  )
})

export const layer = PopupBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer: Layer.mergeAll(PopupResource.layer, subscriptions.layer),
})

export { PopupBlock, PopupKey, InMessage } from './date-picker-popup-definition.js'
