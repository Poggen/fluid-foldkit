import { sourceStyleAttributes } from './lib/source-style-attributes.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Data, Effect, Option, Predicate, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { BANNER_EXIT_EVENT, bannerMotion } from './banner-motion.js'
import type { BannerAnimation, BannerMotionConfig } from './banner-motion.js'
import { bannerGlyph } from './banner-glyph.js'
import { resolveIcons } from './icons.js'
import type { IconName } from './icons.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'

export type BannerStatus = 'default' | 'info' | 'success' | 'warning' | 'error'

export type BannerContrast = 'low' | 'high'

export type BannerVariant = 'inline' | 'fixed'

const Model = Schema.Struct({
  id: Schema.String,
  controlledOpen: Schema.OptionFromNullOr(Schema.Boolean),
  localOpen: Schema.Boolean,
  phase: Schema.Literals(['Closed', 'Present', 'Exiting']),
  generation: Schema.Natural,
  mountGeneration: Schema.Natural,
  initial: Schema.Boolean,
  reduceMotion: Schema.Boolean,
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedDismiss: {},
  CapturedReducedMotion: { value: Schema.Boolean, mountGeneration: Schema.Natural },
  CompletedExit: { generation: Schema.Natural },
})

const OutMessage = defineMessageUnion({ Dismissed: {}, Exited: {} })

const InMessage = defineInMessageUnion({
  RequestedDismiss: {},
  RequestedOpen: {},
  RequestedReset: {},
  RequestedConfigureOpen: { open: Schema.NullOr(Schema.Boolean) },
})

export const BannerKey = Symbol('Banner')

const effects = Block.makeEffectsContract()

export const BannerBlock = Block.make('Banner', {
  key: BannerKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      open: Schema.optionalKey(Schema.Boolean),
      reduceMotion: Schema.Boolean,
    }),
  ]),
  Model,
  Message,
  OutMessage,
  InMessage,
  inMessageOutputs: { RequestedDismiss: { outMessage: OutMessage.Dismissed } },
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<BannerViewInputs>() },
})

// Pinned Motion captures preference per component mount; reset starts a new lifetime.
const CaptureReducedMotion = BannerBlock.makeCommand('CaptureReducedMotion', {
  args: { mountGeneration: Schema.Natural },
  messages: [Message.CapturedReducedMotion],
  *handler() {
    return yield* Effect.succeed(({ mountGeneration }: { readonly mountGeneration: number }) =>
      Effect.sync(() =>
        Message.CapturedReducedMotion({
          mountGeneration,
          value: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        }),
      ),
    )
  },
})

const BannerComposition = BannerBlock.makeComposition()

export interface BannerConfig {
  readonly id: string
  readonly open?: boolean
  readonly reduceMotion: boolean
}

const init = BannerComposition.makeInit((config: BannerConfig) => ({
  model: Model.make({
    id: config.id,
    controlledOpen: Option.fromUndefinedOr(config.open),
    localOpen: true,
    phase: config.open === false ? 'Closed' : 'Present',
    generation: 0,
    mountGeneration: 0,
    initial: false,
    reduceMotion: config.reduceMotion,
  }),
  commands: [CaptureReducedMotion({ mountGeneration: 0 })],
}))

function visibility(model: Model, open: boolean): Model {
  if (open) {
    return model.phase === 'Present'
      ? model
      : modifyFields(model, {
          phase: () => 'Present',
          generation: Number.increment,
          initial: () => model.phase === 'Closed',
        })
  }

  return model.phase === 'Present'
    ? modifyFields(model, { phase: () => 'Exiting', generation: Number.increment })
    : model
}

const dismiss = (model: Model) => ({
  model: Option.isNone(model.controlledOpen)
    ? visibility(modifyFields(model, { localOpen: () => false }), false)
    : model,
  outMessage: OutMessage.Dismissed(),
})

const update = BannerComposition.makeUpdate({
  ClickedDismiss: dismiss,
  CapturedReducedMotion: (model, { value, mountGeneration }) =>
    mountGeneration !== model.mountGeneration || model.reduceMotion === value
      ? { model }
      : { model: modifyFields(model, { reduceMotion: () => value }) },
  CompletedExit: (model, { generation }) =>
    model.phase !== 'Exiting' || generation !== model.generation
      ? { model }
      : {
          model: modifyFields(model, { phase: () => 'Closed', initial: () => true }),
          outMessage: OutMessage.Exited(),
        },
})

const inMessageUpdate = BannerComposition.makeInMessageUpdate({
  RequestedDismiss: dismiss,
  RequestedOpen: (model) => ({
    model: Option.isNone(model.controlledOpen)
      ? visibility(modifyFields(model, { localOpen: () => true }), true)
      : model,
  }),
  RequestedConfigureOpen: (model, { open }) => ({
    model: visibility(
      modifyFields(model, { controlledOpen: () => Option.fromNullOr(open) }),
      open ?? model.localOpen,
    ),
  }),
  RequestedReset: (model) => ({
    model: modifyFields(model, {
      localOpen: () => true,
      phase: () => (Option.getOrElse(model.controlledOpen, () => true) ? 'Present' : 'Closed'),
      initial: () => false,
      generation: Number.increment,
      mountGeneration: Number.increment,
    }),
    commands: [CaptureReducedMotion({ mountGeneration: model.mountGeneration + 1 })],
  }),
})

export interface BannerProps extends Presentation {
  readonly status?: BannerStatus
  readonly contrast?: BannerContrast
  readonly variant?: BannerVariant
  readonly icon?: Icon
  readonly icons?: Partial<Record<IconName, Icon>>
  readonly dismissible?: boolean
  readonly dismissLabel?: string
  readonly motion?: BannerMotionConfig
  readonly role?: string
  readonly className?: string
  /** CSS strings preserve Foldkit's browser/server style contract; include length units. */
  readonly style?: Readonly<Record<string, string>>
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly children: (context: Presentation) => ReadonlyArray<Html | string>
  readonly animate: (node: Html, animation: BannerAnimation) => Html
}

export interface BannerViewInputs extends Omit<BannerProps, 'motion' | 'icons'> {
  readonly getMotion?: () => BannerMotionConfig
  readonly getIcons?: () => Partial<Record<IconName, Icon>>
}

/** Foldkit requires callbacks at the top level of ViewInputs. */
export function bannerViewInputs(props: BannerProps): BannerViewInputs {
  const { motion, icons, ...rest } = props

  const withMotion = motion === undefined ? rest : { ...rest, getMotion: () => motion }

  return icons === undefined ? withMotion : { ...withMotion, getIcons: () => icons }
}

const tone: Record<BannerStatus, string> = {
  default: 'var(--foreground)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--destructive)',
}

function initialBannerTransform(initial: boolean, reduced: boolean, fixed: boolean, scale: number) {
  if (!initial || reduced) {
    return 'none'
  }

  return fixed ? 'translateY(-100%)' : `scale(${scale})`
}

function bannerStyle(status: BannerStatus, contrast: BannerContrast, style: BannerProps['style']) {
  const palette = {
    '--banner-tone': tone[status],
    '--banner-fill':
      contrast === 'low'
        ? 'var(--hover)'
        : `color-mix(in oklab, var(--banner-tone) ${status === 'default' ? 8 : 12}%, transparent)`,
  }

  return { ...palette, ...style }
}

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const view = BannerComposition.makeView.withInputs<BannerViewInputs>((model, inputs, h) => {
  if (model.phase === 'Closed') {
    return h.empty
  }

  const presentation = resolvePresentation(inputs)
  const icons = inputs.getIcons === undefined ? presentation.icons : resolveIcons(inputs.getIcons())
  const compact = presentation.size.variant === 'compact'
  const status = inputs.status ?? 'default'
  const contrast = inputs.contrast ?? 'low'
  const fixed = inputs.variant === 'fixed'
  const config = inputs.getMotion?.() ?? bannerMotion

  const initialTransform = initialBannerTransform(
    model.initial,
    model.reduceMotion,
    fixed,
    config.appear.fromScale,
  )

  const outline = inputs.icon ?? (status === 'default' ? icons.info : undefined)
  const { x } = icons

  const completed = Events.OnCustomEvent({
    name: BANNER_EXIT_EVENT,
    f: (event) =>
      event instanceof CustomEvent && Predicate.isNumber(event.detail)
        ? Option.some(Message.CompletedExit({ generation: event.detail }))
        : Option.none(),
  })

  const renderGlyph = () => {
    if (outline !== undefined) {
      return outline({ size: compact ? 16 : 20, strokeWidth: 1.5 }, h)
    }

    return status === 'default' ? null : bannerGlyph(status, compact ? 16 : 20, h)
  }

  const renderBody = () =>
    h.div(
      sourceStyleAttributes(
        {
          ...(fixed ? { backgroundColor: 'var(--background)' } : {}),
          backgroundImage: 'linear-gradient(var(--banner-fill), var(--banner-fill))',
          ...bannerStyle(status, contrast, inputs.style),
        },
        [
          h.Class(
            cn(
              'group/banner @container/banner relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center text-foreground',
              'has-data-[slot=banner-description]:items-start',
              compact ? 'p-3' : 'p-4',
              !fixed && presentation.shape.container,
              inputs.className,
            ),
          ),
          h.Role(inputs.role ?? (status === 'error' || status === 'warning' ? 'alert' : 'status')),
          h.DataAttribute('slot', 'banner'),
          h.DataAttribute('status', status),
          h.DataAttribute('contrast', contrast),
          h.DataAttribute('variant', fixed ? 'fixed' : 'inline'),
          ...(inputs.attributes ?? []),
        ],
      ),
      [
        h.span(
          [
            h.AriaHidden(true),
            h.Class(
              cn(
                'col-start-1 row-start-1 flex items-center justify-center text-[color:var(--banner-tone)]',
                compact ? 'mr-2.5 h-[18px]' : 'mr-3 h-5',
              ),
            ),
          ],
          [renderGlyph()],
        ),
        ...inputs.children({
          context: createPresentationContext({
            ...inputs,
            shape: presentation.shape.variant,
            size: presentation.size.variant,
            surface: presentation.surface,
            icons,
          }),
          size: presentation.size.variant,
          shape: presentation.shape.variant,
          surface: presentation.surface,
        }),
        inputs.dismissible === true
          ? h.button(
              [
                h.Type('button'),
                h.OnClick(Message.ClickedDismiss()),
                h.AriaLabel(inputs.dismissLabel ?? 'Dismiss'),
                h.Class(
                  cn(
                    'col-start-4 row-start-1 flex size-7 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors duration-80 hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                    compact ? '-my-[5px] -mr-1.5 ml-1.5' : '-my-1 -mr-1.5 ml-2',
                    presentation.shape.button,
                  ),
                ),
              ],
              [x({ size: compact ? 13 : 15, strokeWidth: 1.5 }, h)],
            )
          : null,
      ],
    )

  return inputs.animate(
    h.keyed('div')(
      `${model.id}:${model.mountGeneration}`,
      [
        h.Class(cn('grid w-full', fixed && 'sticky top-0 z-[var(--z-sticky,30)]')),
        h.Id(model.id),
        h.Style({
          marginBottom: '0px',
          gridTemplateRows: model.initial ? '0fr' : '1fr',
          overflow: fixed ? 'hidden' : 'visible',
        }),
        completed,
      ],
      [
        h.div(
          [h.Class('min-h-0')],
          [
            h.div(
              [
                h.Class('origin-top'),
                h.Style({
                  opacity: model.initial ? '0' : '1',
                  transform: initialTransform,
                  pointerEvents: model.initial ? 'none' : 'auto',
                }),
              ],
              [renderBody()],
            ),
          ],
        ),
      ],
    ),
    {
      present: model.phase === 'Present',
      initial: model.initial,
      generation: model.generation,
      fixed,
      reduceMotion: model.reduceMotion,
      config,
    },
  )
})

export const layer = BannerBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: CaptureReducedMotion.layer,
})

export { BannerTitle, BannerDescription, BannerActions, BannerAction } from './banner-parts.js'

export type { BannerActionProps, BannerActionVariant, BannerPartProps } from './banner-parts.js'

export { bannerMotion, createBannerMotionScope } from './banner-motion.js'

export type { BannerAnimation, BannerMotionConfig, BannerMotionScope } from './banner-motion.js'

export const test = { CaptureReducedMotion }
