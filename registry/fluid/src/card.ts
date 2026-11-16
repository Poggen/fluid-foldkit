import { sourceChildStyleAttributes } from './lib/source-style-attributes.js'
import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CardGroupRefs } from './card-resources.js'

import { childAttributes, inertHtml } from 'foldkit/html'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverViewState } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { CardBorder, CardContext, CardOrientation } from './card-parts.js'

export {
  CardGroupRefs,
  makeCardGroupRefsLayer,
  CardGroupRefsServerLayer,
  CardGroupRefsDefaultLayer,
} from './card-resources.js'

export type { CardGroupRef } from './card-resources.js'

export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  CardMedia,
  CardImage,
  CardFeature,
  CardButton,
} from './card-parts.js'

export type {
  CardOrientation,
  CardBorder,
  CardLogo,
  CardContext,
  CardPartProps,
  CardMediaProps,
  CardImageProps,
  CardFeatureProps,
  CardButtonVariant,
  CardButtonProps,
} from './card-parts.js'

export interface CardGroupContext extends CardContext {
  readonly columns: number
  readonly count: number
  readonly separated: boolean
  readonly outlined: boolean
  readonly activeIndex: number | null
  readonly selectedIndex: number
  readonly itemAttributes: HoverViewState['itemAttributes']
}

export interface CardProps<Message, Requirements = never> extends Presentation {
  readonly onClick?: Message
  readonly href?: string
  readonly external?: boolean
  readonly label?: string
  readonly selected?: boolean
  readonly disabled?: boolean
  readonly dismissible?: boolean
  readonly dismissOnHover?: boolean
  readonly onDismiss?: Message
  readonly index?: number
  readonly className?: string
  readonly attributes?: Parameters<HtmlBuilder<Message, Requirements>['div']>[0]
  readonly group?: CardGroupContext
  readonly image?: (context: CardContext) => Html
  readonly children: (context: CardContext) => ReadonlyArray<Html | string>
}

export function Card<Message, Requirements = never>(
  props: CardProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const inherited = { ...props.group, ...props }
  const { shape, size, icons } = resolvePresentation(inherited)
  const compact = size.variant === 'compact'
  const { group } = props
  const orientation = group?.orientation ?? 'card'
  const inline = orientation === 'inline'
  const inlineImage = inline && props.image !== undefined
  const clickable = Boolean(props.href) || props.onClick !== undefined

  const borders = () => {
    const columns = group?.columns ?? 1
    const self = props.index ?? -1
    const selected = group?.selectedIndex ?? -1
    const active = group?.activeIndex ?? -1
    const divided = group !== undefined && !group.separated

    const bottom =
      divided &&
      self >= 0 &&
      self + columns < group.count &&
      ![self, self + columns].includes(active) &&
      ![self, self + columns].includes(selected)

    const right =
      divided &&
      self >= 0 &&
      self % columns < columns - 1 &&
      self + 1 < group.count &&
      ![self, self + 1].includes(active) &&
      ![self, self + 1].includes(selected)

    return { bottom, right }
  }

  const { bottom, right } = borders()

  const context: CardContext = {
    context: createPresentationContext(inherited),
    orientation,
    emphasized: props.selected ?? false,
    hasImage: props.image !== undefined,
  }

  const overlayAttributes = [
    h.Class(
      'absolute inset-0 z-20 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] rounded-[inherit]',
    ),
    ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
    ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
  ]

  const overlay = () => {
    if (!clickable || props.disabled === true) {
      return null
    }

    if (props.href !== undefined && props.href !== '') {
      return h.a([
        ...overlayAttributes,
        h.Href(props.href),
        ...(props.external === true ? [h.Target('_blank'), h.Rel('noopener noreferrer')] : []),
      ])
    }

    return h.button([
      ...overlayAttributes,
      h.Type('button'),
      ...(props.selected === undefined ? [] : [h.AriaPressed(String(props.selected))]),
    ])
  }

  const layoutClass = () => {
    if (inlineImage) {
      return cn('flex flex-row items-center', compact ? 'gap-2.5' : 'gap-3')
    }

    if (inline) {
      return cn('flex flex-row items-center', compact ? 'gap-2.5 pl-3' : 'gap-3 pl-4')
    }

    return cn('flex flex-col', compact ? 'pb-3' : 'pb-4')
  }

  const containmentClass = () => {
    if (group === undefined) {
      return cn(shape.container, 'overflow-hidden')
    }

    return group.separated && group.outlined
      ? cn(shape.container, 'overflow-hidden border border-border/60')
      : ''
  }

  const children = props.children(context)
  const image = props.image?.(context) ?? null

  const body = inlineImage
    ? [
        image,
        h.div(
          [
            h.Class(
              cn(
                'flex min-w-0 flex-1 flex-col justify-center gap-2',
                compact ? 'py-2.5 pr-3' : 'py-3.5 pr-4',
              ),
            ),
          ],
          [...children],
        ),
      ]
    : [image, ...children]

  const attributes = () => [
    h.DataAttribute('slot', 'card'),
    h.DataAttribute('orientation', orientation),
    ...(clickable && group && props.index !== undefined ? group.itemAttributes(props.index) : []),
    ...(props.selected === true ? [h.DataAttribute('selected', 'true')] : []),
    ...(props.disabled === true ? [h.AriaDisabled(true)] : []),
    h.Class(
      cn(
        'group/card relative z-10 min-w-0 min-h-[60px]',
        layoutClass(),
        !group &&
          clickable &&
          props.disabled !== true &&
          'transition-colors duration-80 hover:bg-hover',
        props.dismissible === true &&
          inline &&
          ((props.dismissOnHover ?? true)
            ? '[&:hover_[data-slot=card-header]]:pr-10 [&:focus-within_[data-slot=card-header]]:pr-10'
            : '[&_[data-slot=card-header]]:pr-10'),
        containmentClass(),
        props.disabled === true && 'opacity-50 pointer-events-none',
        props.className,
      ),
    ),
    ...(props.attributes ?? []),
  ]

  const content = () => [
    props.selected === true
      ? h.span([
          h.AriaHidden(true),
          h.Class(cn('absolute inset-0 -z-10 bg-active pointer-events-none', shape.container)),
        ])
      : null,
    bottom
      ? h.span([
          h.AriaHidden(true),
          h.Class('absolute inset-x-0 bottom-0 h-px bg-border/60 pointer-events-none -z-10'),
        ])
      : null,
    right
      ? h.span([
          h.AriaHidden(true),
          h.Class(
            cn(
              'absolute top-0 right-0 w-px bg-border/60 pointer-events-none -z-10',
              bottom ? 'bottom-px' : 'bottom-0',
            ),
          ),
        ])
      : null,
    overlay(),
    ...body,
    props.dismissible === true
      ? h.button(
          [
            h.Type('button'),
            ...(props.onDismiss === undefined ? [] : [h.OnClick(props.onDismiss)]),
            h.AriaLabel('Dismiss'),
            h.Class(
              cn(
                'absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer outline-none transition-colors duration-80 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                props.image ? 'bg-card/70 backdrop-blur-sm hover:bg-card' : 'hover:bg-hover',
                (props.dismissOnHover ?? true) &&
                  'pointer-events-none opacity-0 transition-opacity duration-80 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                shape.button,
              ),
            ),
          ],
          [icons.x({ size: compact ? 13 : 15, strokeWidth: 1.5 }, inertHtml)],
        )
      : null,
  ]

  return h.div(attributes(), content())
}

const Model = Schema.Struct({
  id: Schema.String,
  refIdentity: Schema.String,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

export const CardGroupKey = Symbol('FluidCardGroup')

const effects = Block.makeEffectsContract<never, CardGroupRefs>()

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedRef: { identity: Schema.String },
  RequestedFluidHover: { enabled: Schema.Boolean },
})

export const CardGroupBlock = Block.make('CardGroup', {
  key: CardGroupKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      refIdentity: Schema.optionalKey(Schema.String),
      fluidHover: Schema.optionalKey(Schema.Boolean),
      hoverMode: Schema.optionalKey(HoverMode),
    }),
  ]),
  Model,
  Message: defineMessageUnion({ CapturedRef: {} }),
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<CardGroupProps>() },
})

const ObserveRef = CardGroupBlock.makeMountStream('ObserveRef', {
  args: { id: Schema.String, identity: Schema.String },
  messages: [CardGroupBlock.Message.CapturedRef],
  *handler() {
    const refs = yield* CardGroupRefs

    return ({ id, identity, element, viewStateChanges }) =>
      refs.observe(id, identity, element, viewStateChanges)
  },
})

export interface CardGroupConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly refIdentity?: string
  readonly fluidHover?: boolean
}

const Highlight = CardGroupBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: CardGroupConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Hover = CardGroupBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: CardGroupConfig) => [
      {
        id: config.id,
        pointerHandlers: config.fluidHover ?? true,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: CardGroupBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      CardGroupBlock.makeStep((model) =>
        Highlight.informOfSource({
          snapshot,
          hidden: !model.hover.pointerHandlers,
          mode: model.hover.mode,
        }),
      ),
  }),
})

const CardGroupComposition = CardGroupBlock.makeComposition({
  bindings: [Hover, Highlight],
  mounts: [ObserveRef],
})

const init = CardGroupComposition.makeInit((config: CardGroupConfig) => ({
  model: { id: config.id, refIdentity: config.refIdentity ?? 'default' },
  childInitContext: config,
}))

const update = CardGroupComposition.makeUpdate({
  CapturedRef: CardGroupBlock.makeNoopStep(),
})

const inMessageUpdate = CardGroupComposition.makeInMessageUpdate({
  RequestedHoverMode: CardGroupBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedFluidHover: CardGroupBlock.makeStep(
    (model, { enabled }: typeof InMessage.RequestedFluidHover.Type) =>
      Update.combineSteps([
        Hover.requestPointerHandlers({ enabled }),
        Highlight.informOfSource({
          snapshot: model.hover,
          hidden: !enabled,
          mode: model.hover.mode,
        }),
      ]),
  ),
  RequestedRef: (model, { identity }) => ({
    model: modifyFields(model, { refIdentity: () => identity }),
  }),
})

export interface CardGroupProps extends Presentation {
  readonly orientation?: CardOrientation
  readonly columns?: number
  readonly border?: CardBorder
  readonly separated?: boolean
  readonly selectedIndex?: number
  readonly count: number
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly children: (context: CardGroupContext) => ReadonlyArray<Html>
}

const view = CardGroupComposition.makeView.withInputs<CardGroupProps>((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)
  const columns = inputs.columns ?? 1
  const orientation = inputs.orientation ?? 'card'
  const separated = inputs.separated ?? false
  const outlined = inputs.border === 'outlined'

  return h.block(
    Hover.embedView({
      slotId: model.hover.id,
      model: model.hover,
      viewInputs: {
        className: cn(
          'relative grid',
          outlined &&
            !separated &&
            `border border-border/60 overflow-hidden ${presentation.shape.container}`,
          separated ? 'gap-2' : 'gap-0',
          inputs.className,
        ),
        content: (hover) => [
          h.keyed('span')(model.refIdentity, [
            h.Class('contents'),
            h.OnMount(ObserveRef({ id: model.id, identity: model.refIdentity })),
          ]),
          h.block(
            Highlight.embedView({
              slotId: model.highlight.id,
              model: model.highlight,
              viewInputs: {
                animate: inputs.animateHighlight,
                mode: model.hover.mode,
                className: cn('z-0', presentation.shape.container),
              },
            }),
          ),
          ...inputs.children({
            context: createPresentationContext(inputs),
            orientation,
            columns,
            count: inputs.count,
            separated,
            outlined,
            activeIndex: hover.activeIndex,
            selectedIndex: inputs.selectedIndex ?? -1,
            itemAttributes: hover.itemAttributes,
          }),
        ],
        attributes: sourceChildStyleAttributes({}, [
          ...childAttributes([
            h.DataAttribute('slot', 'card-group'),
            h.DataAttribute('orientation', orientation),
            h.Style({
              gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
            }),
          ]),
          ...(inputs.attributes ?? []),
        ]),
      },
    }),
  )
})

export const layer = CardGroupBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveRef.layer,
}).pipe(Layer.provide(Layer.merge(HoverLayer, HighlightLayer)))

/** @deprecated A card starts with its title. Retained for source compatibility. */
export { renderCardEyebrow as CardEyebrow } from './card-parts.js'

export const hoverModeOf = (model: typeof CardGroupBlock.Model.Type) => model.hover.mode

export const fluidHoverEnabledOf = (model: typeof CardGroupBlock.Model.Type) =>
  model.hover.pointerHandlers
