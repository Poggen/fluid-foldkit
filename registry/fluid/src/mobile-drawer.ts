import { cn } from './lib/utils.js'
import { cssStyle } from './lib/css-style.js'
import { sourceStyleAttributes } from './lib/source-style-attributes.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { DialogResources } from './dialog-resources.js'
import { Layer, Schema } from 'effect'
import { DialogControl } from './dialog-state.js'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DialogBlock, DialogLayer } from './dialog.js'
import type { DialogConfig } from './dialog-state.js'
import type { MotionOptions } from './motion.js'
import { spring } from './lib/springs.js'
import { surfaceClasses } from './lib/surface-classes.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export interface MobileDrawerConfig {
  readonly id: string
  readonly open?: boolean
  readonly defaultOpen?: boolean
  readonly focusSelector?: string
  readonly returnFocusSelector?: string
}

export interface MobileDrawerContext {
  readonly close: ReadonlyArray<ChildAttribute>
  readonly presentation: Presentation
}

export interface MobileDrawerProps extends Presentation {
  readonly panelClassName?: string
  /** Inline overrides for the existing animated panel. Numeric lengths use px. */
  readonly panelStyle?: Parameters<typeof cssStyle>[0]
  readonly trigger?: (attributes: ReadonlyArray<ChildAttribute>) => Html
  readonly content: (context: MobileDrawerContext) => ReadonlyArray<Html | string>
  readonly label?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
}

const Config = Schema.Struct({
  id: Schema.String,
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  focusSelector: Schema.optionalKey(Schema.String),
  returnFocusSelector: Schema.optionalKey(Schema.String),
})

const Model = Schema.Struct({ dialog: DialogBlock.Model })

const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedControlledOpen: { control: DialogControl },
})

const OutMessage = defineMessageUnion({ CloseRequested: {}, OpenChanged: { open: Schema.Boolean } })

const effects = Block.makeEffectsContract<never, DialogResources>()

export const MobileDrawerKey = Symbol('FluidMobileDrawer')

export const MobileDrawerBlock = Block.make('MobileDrawer', {
  key: MobileDrawerKey,
  Model,
  Message: Schema.Never,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<MobileDrawerProps>() },
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage },
    RequestedClose: { outMessage: OutMessage },
  },
})

const Dialog = MobileDrawerBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: (config: MobileDrawerConfig): [DialogConfig] => [config],
  },
}).withOutMessagePolicy({
  fold: MobileDrawerBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: ({ open }) =>
      MobileDrawerBlock.makeOutMessageStep(() =>
        open ? OutMessage.OpenChanged({ open }) : OutMessage.CloseRequested(),
      ),
    CompletedClose: MobileDrawerBlock.makeNoopStep,
  }),
})

const MobileDrawerComposition = MobileDrawerBlock.makeComposition({ bindings: [Dialog] })

const init = MobileDrawerComposition.makeInit((config: MobileDrawerConfig) => ({
  childInitContext: config,
  model: {},
}))

const update = MobileDrawerComposition.makeUpdate({})

const inMessageUpdate = MobileDrawerComposition.makeInMessageUpdate({
  RequestedOpen: Dialog.requestOpen(),
  RequestedClose: Dialog.requestClose(),
  RequestedControlledOpen: MobileDrawerBlock.makeStep.fromMessage(
    ({ control }: typeof InMessage.RequestedControlledOpen.Type) =>
      Dialog.requestControlledOpen({ control }),
  ),
})

const view = MobileDrawerComposition.makeView.withInputs<MobileDrawerProps>((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)
  const surface = Math.min(presentation.surface + 2, 8)

  return h.block(
    Dialog.embedView({
      slotId: 'dialog',
      model: model.dialog,
      viewInputs: {
        ...inputs,
        size: 'lg',
        presentation: {
          shape: presentation.shape.variant,
          size: presentation.size.variant,
          surface: presentation.surface,
        },
        showCloseButton: false,
        hasDescription: false,
        className: 'contents',
        panelRender: (attributes, children, key) =>
          h.keyed('div')(
            key ?? 'mobile-drawer-panel',
            sourceStyleAttributes({}, [
              ...attributes,
              h.Tabindex(-1),
              h.DataAttribute('mobile-drawer-panel', ''),
              h.Class(
                cn(
                  `fixed top-0 left-0 bottom-0 w-64 ${surfaceClasses(surface, 3)} z-[var(--z-modal,50)] overflow-y-auto p-4`,
                  inputs.panelClassName,
                ),
              ),
              ...(inputs.panelStyle === undefined ? [] : [h.Style(cssStyle(inputs.panelStyle))]),
            ]),
            children,
          ),
        backdropRender: (attributes) =>
          h.div([
            ...attributes,
            h.Class('fixed inset-0 bg-black/40 dark:bg-black/80 z-[var(--z-overlay,40)]'),
          ]),
        panelMotion: (open) => ({
          initial: { x: '-100%' },
          animate: { x: open ? 0 : '-100%' },
          transition: open ? spring.moderate : spring.moderate.exit,
          reducedMotion: presentation.reducedMotion,
        }),
        backdropMotion: (open) => ({
          initial: { opacity: 0 },
          animate: { opacity: open ? 1 : 0 },
          transition: open ? { duration: spring.moderate.duration } : spring.moderate.exit,
          reducedMotion: presentation.reducedMotion,
        }),
        content: (context) => [
          h.h2([h.Id(context.titleId), h.Class('sr-only')], [inputs.label ?? 'Navigation']),
          ...inputs.content({
            close: context.close,
            presentation: { context: createPresentationContext({ ...inputs, surface }) },
          }),
        ],
      },
    }),
  )
})

export const mobileDrawerLayer = MobileDrawerBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(DialogLayer))
