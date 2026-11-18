import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'

import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Option, Schema, Match, Number } from 'effect'
import { ColorPickerEnvironment } from './color-picker-environment.js'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Render from 'foldkit/render'
import { spring } from './lib/springs.js'
import { popupMotionClass } from './lib/popup.js'
import { cn } from './lib/utils.js'
import type { MotionOptions } from './motion.js'
import { ColorPopupPositionArgs, observeColorPopup } from './color-picker-popup-observer.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export const ColorPopupModel = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(['menu', 'popover']),
  controlled: Schema.OptionFromNullOr(Schema.Boolean),
  open: Schema.Boolean,
  present: Schema.Boolean,
  generation: Schema.Natural,
  initialOpen: Schema.Boolean,
  focusIndex: Schema.Int,
  focusedIndex: Schema.Int,
  openingIndex: Schema.Int,
  search: Schema.String,
  searchVersion: Schema.Natural,
})

export interface ColorPopupConfig {
  readonly id: string
  readonly kind: 'menu' | 'popover'
  readonly open?: boolean
  readonly defaultOpen?: boolean
}

export interface ColorPopupProps extends Presentation {
  readonly triggerContent: () => ReadonlyArray<Html>
  readonly wrapTrigger?: (node: Html) => Html
  readonly triggerClassName?: string
  readonly triggerAttributes?: ReadonlyArray<ChildAttribute>
  readonly className?: string
  readonly content: () => ReadonlyArray<Html>
  readonly contentClassName?: string
  readonly contentAttributes?: ReadonlyArray<ChildAttribute>
  readonly portalContainerId?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
}

/** Internal trigger-only view: no retained body or animation payload. */
export interface ClosedColorPopupInputs extends Pick<
  ColorPopupProps,
  'triggerContent' | 'triggerClassName' | 'triggerAttributes' | 'className'
> {
  readonly body: 'absent'
  readonly animate?: never
  readonly content?: never
  readonly contentClassName?: never
  readonly contentAttributes?: never
  readonly portalContainerId?: never
  readonly wrapTrigger?: never
}

type ColorPopupViewInputs =
  | (ColorPopupProps & { readonly body?: 'animated' })
  | ClosedColorPopupInputs

const Model = ColorPopupModel

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedTrigger: {},
  PressedOpeningKey: { key: Schema.String },
  PointerArrived: {},
  Dismissed: { restore: Schema.Boolean },
  PressedKey: { key: Schema.String },
  FocusedItem: { index: Schema.Int, visible: Schema.Boolean },
  ClearedSearch: { version: Schema.Natural },
  CompletedExit: { generation: Schema.Natural },
  CompletedFocus: {},
})

const OutMessage = defineMessageUnion({
  OpenChanged: { open: Schema.Boolean },
  FocusChanged: { index: Schema.Int },
  Selected: { index: Schema.Int },
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { open: Schema.OptionFromNullOr(Schema.Boolean) },
  RequestedOpen: { open: Schema.Boolean },
  RequestedDismiss: { restore: Schema.Boolean },
})

export const ColorPopupKey = Symbol('ColorPopup')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment>()

export const ColorPopupBlock = Block.make('ColorPopup', {
  key: ColorPopupKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      kind: Schema.Literals(['menu', 'popover']),
      open: Schema.optionalKey(Schema.Boolean),
      defaultOpen: Schema.optionalKey(Schema.Boolean),
    }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  inMessageOutputs: { RequestedDismiss: { outMessage: OutMessage.OpenChanged } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<ColorPopupViewInputs>() },
  effects,
})

const Position = ColorPopupBlock.makeMountStream('Position', {
  args: ColorPopupPositionArgs.fields,
  messages: [
    Message.Dismissed,
    Message.PressedKey,
    Message.FocusedItem,
    Message.PointerArrived,
    Message.CompletedExit,
  ],
  *handler() {
    return observeColorPopup
  },
})

const FinishExit = ColorPopupBlock.makeCommand('FinishExit', {
  args: { generation: Schema.Natural, menu: Schema.Boolean },
  messages: [Message.CompletedExit],
  *handler() {
    return ({ generation, menu }) =>
      Effect.sleep(menu ? '120 millis' : '160 millis').pipe(
        Effect.as(Message.CompletedExit({ generation })),
      )
  },
})

const Focus = ColorPopupBlock.makeCommand('Focus', {
  args: { id: Schema.String, index: Schema.Int },
  messages: [Message.CompletedFocus],
  *handler() {
    const { document } = yield* ColorPickerEnvironment

    return ({ id, index }) =>
      Render.afterCommit.pipe(
        Effect.andThen(
          Effect.sync(() => {
            const target =
              index < 0
                ? document?.getElementById(`${id}-trigger`)
                : document
                    ?.getElementById(id)
                    ?.querySelector<HTMLElement>(`[data-color-format-index="${index}"]`)

            target?.focus({ preventScroll: true })

            return Message.CompletedFocus()
          }),
        ),
      )
  },
})

const ClearSearch = ColorPopupBlock.makeCommand('ClearSearch', {
  args: { version: Schema.Natural },
  messages: [Message.ClearedSearch],
  *handler() {
    return ({ version }) =>
      Effect.sleep('500 millis').pipe(Effect.as(Message.ClearedSearch({ version })))
  },
})

const ColorPopupComposition = ColorPopupBlock.makeComposition({ mounts: [Position] })

const init = ColorPopupComposition.makeInit((config: ColorPopupConfig) => {
  const open = config.open ?? config.defaultOpen ?? false

  return {
    model: {
      id: config.id,
      kind: config.kind,
      controlled: Option.fromNullishOr(config.open),
      open,
      present: open,
      generation: 0,
      initialOpen: open,
      focusIndex: -1,
      focusedIndex: -1,
      openingIndex: -1,
      search: '',
      searchVersion: 0,
    },
  }
})

const change = (model: Model, open: boolean) =>
  modifyFields(model, {
    open: () => open,
    present: (currentPresent) => open || currentPresent,
    initialOpen: () => false,
    focusedIndex: () => -1,
    focusIndex: () => -1,
    openingIndex: () => -1,
    generation: Number.increment,
  })

const dismiss = (model: Model, { restore }: Pick<typeof Message.Dismissed.Type, 'restore'>) => {
  if (!model.open || (Option.isSome(model.controlled) && model.kind === 'menu')) {
    return { model }
  }

  return {
    model: Option.isSome(model.controlled) ? model : change(model, false),
    outMessage: OutMessage.OpenChanged({ open: false }),
    commands: [
      ...(Option.isNone(model.controlled)
        ? [FinishExit({ generation: model.generation + 1, menu: model.kind === 'menu' })]
        : []),
      ...(restore ? [Focus({ id: model.id, index: -1 })] : []),
    ],
  }
}

const update = ColorPopupComposition.makeUpdate({
  PointerArrived: (model) => ({
    model: modifyFields(model, { focusedIndex: () => -1 }),
    outMessage: OutMessage.FocusChanged({ index: -1 }),
  }),
  PressedOpeningKey: (model, { key }) => {
    if (model.kind !== 'menu' || Option.isSome(model.controlled)) {
      return { model }
    }

    const index = key === 'ArrowUp' ? 3 : 0

    return {
      model: modifyFields(change(model, true), {
        openingIndex: () => index,
        focusIndex: () => index,
        focusedIndex: () => index,
      }),
      outMessage: OutMessage.OpenChanged({ open: true }),
      commands: [Focus({ id: model.id, index })],
    }
  },
  ClickedTrigger: (model) => {
    if (Option.isSome(model.controlled) && model.kind === 'menu') {
      return { model }
    }

    const open = !model.open

    const toggled = {
      model: Option.isSome(model.controlled) ? model : change(model, open),
      outMessage: OutMessage.OpenChanged({ open }),
    }

    return !open && Option.isNone(model.controlled)
      ? {
          ...toggled,
          commands: [FinishExit({ generation: model.generation + 1, menu: model.kind === 'menu' })],
        }
      : toggled
  },
  Dismissed: dismiss,
  PressedKey: (model, { key }) => {
    if (key === 'Enter' || key === ' ') {
      return model.focusIndex < 0
        ? { model }
        : { model, outMessage: OutMessage.Selected({ index: model.focusIndex }) }
    }

    const labels = ['hex', 'rgb', 'hsl', 'oklch']
    const typed = key.toLowerCase()

    let search = ''

    if (key.length === 1) {
      search =
        model.search !== '' && Array.from(model.search).every((character) => character === typed)
          ? typed
          : model.search + typed
    }

    const ordered = labels
      .flatMap((label, index) => (index > model.focusIndex ? [{ label, index }] : []))
      .concat(
        labels.flatMap((label, index) => (index <= model.focusIndex ? [{ label, index }] : [])),
      )

    const index = Match.value(key).pipe(
      Match.when('Home', () => 0),
      Match.when('End', () => 3),
      Match.when('ArrowDown', () => (model.focusIndex + 1) % 4),
      Match.when('ArrowUp', () => (model.focusIndex < 0 ? 3 : (model.focusIndex + 3) % 4)),
      Match.orElse(() => ordered.find((item) => item.label.startsWith(search))?.index ?? -1),
    )

    return index < 0
      ? { model }
      : {
          model: modifyFields(model, {
            focusIndex: () => index,
            focusedIndex: () => index,
            search: () => search,
            searchVersion: Number.increment,
          }),
          commands: [
            Focus({ id: model.id, index }),
            ClearSearch({ version: model.searchVersion + 1 }),
          ],
        }
  },
  FocusedItem: (model, { index, visible }) => ({
    model: modifyFields(model, {
      focusIndex: () => index,
      focusedIndex: () => (visible ? index : -1),
      initialOpen: () => false,
    }),
    outMessage: OutMessage.FocusChanged({ index: visible ? index : -1 }),
  }),
  ClearedSearch: (model, { version }) => ({
    model: version === model.searchVersion ? modifyFields(model, { search: () => '' }) : model,
  }),
  CompletedExit: (model, { generation }) => ({
    model:
      generation === model.generation && !model.open
        ? modifyFields(model, { present: () => false })
        : model,
  }),
  CompletedFocus: (model) => ({ model }),
})

const inMessageUpdate = ColorPopupComposition.makeInMessageUpdate({
  RequestedOpen: (model, { open }) => {
    const changed = { model: change(model, open) }

    return open
      ? changed
      : {
          ...changed,
          commands: [FinishExit({ generation: model.generation + 1, menu: model.kind === 'menu' })],
        }
  },
  RequestedConfigure: (model, { open }) => {
    const next = Option.getOrElse(open, () => model.open)

    const changed = {
      model:
        next === model.open
          ? modifyFields(model, { controlled: () => open })
          : modifyFields(change(model, next), { controlled: () => open }),
    }

    return !next && model.open
      ? {
          ...changed,
          commands: [FinishExit({ generation: model.generation + 1, menu: model.kind === 'menu' })],
        }
      : changed
  },
  RequestedDismiss: dismiss,
})

const view = ColorPopupComposition.makeView.withInputs<ColorPopupViewInputs>((model, props, h) => {
  if (props.body === 'absent' && (model.open || model.present)) {
    throw new Error('A trigger-only ColorPopup cannot be open or retain a body')
  }
  const triggerIdAttribute = props.triggerAttributes?.findLast(
    ({ attribute }) => attribute._tag === 'Id',
  )?.attribute
  const triggerId =
    triggerIdAttribute !== undefined &&
    'value' in triggerIdAttribute &&
    typeof triggerIdAttribute.value === 'string'
      ? triggerIdAttribute.value
      : `${model.id}-trigger`
  const hasContentName = props.contentAttributes?.some(
    ({ attribute }) => attribute._tag === 'AriaLabel' || attribute._tag === 'AriaLabelledBy',
  )

  const trigger = h.button(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      h.Id(`${model.id}-trigger`),
      h.Type('button'),
      h.AriaHasPopup(model.kind === 'menu' ? 'menu' : 'dialog'),
      h.AriaExpanded(model.open),
      h.OnClick(Message.ClickedTrigger()),
      h.OnKeyDownPreventDefault((key) =>
        model.kind === 'menu' && ['ArrowUp', 'ArrowDown'].includes(key)
          ? Option.some(Message.PressedOpeningKey({ key }))
          : Option.none(),
      ),
      h.Class(props.triggerClassName ?? ''),
      ...(props.triggerAttributes ?? []),
    ]),
    props.triggerContent(),
  )

  return h.div(
    [h.Class(cn(model.kind === 'menu' ? 'contents' : 'inline-flex', props.className))],
    [
      props.wrapTrigger?.(trigger) ?? trigger,
      ...(model.present && props.body !== 'absent'
        ? [
            h.div(
              [
                h.Class('absolute w-max z-[var(--z-popover,60)] outline-none overflow-visible!'),
                h.Id(model.id),
                h.DataAttribute('color-popup', ''),
                h.DataAttribute('side', 'bottom'),
                h.Style({ '--anchor-width': 'var(--button-width)' }),
                h.OnMount(
                  Position({
                    id: model.id,
                    generation: model.generation,
                    portalContainerId: props.portalContainerId ?? '',
                    initialOpen: model.initialOpen,
                    kind: model.kind,
                    openingIndex: model.openingIndex,
                  }),
                ),
              ],
              [
                props.animate(
                  h.div(
                    [
                      h.Class(
                        cn(
                          popupMotionClass,
                          model.kind === 'popover' &&
                            'origin-top-left [[data-side=top]_&]:origin-bottom-left',
                          'origin-[top_left]',
                        ),
                      ),
                    ],
                    [
                      h.div(
                        [
                          h.Role(model.kind === 'menu' ? 'menu' : 'dialog'),
                          ...(hasContentName ? [] : [h.AriaLabelledBy(triggerId)]),
                          h.Tabindex(-1),
                          h.Class(props.contentClassName ?? 'outline-none'),
                          ...(props.contentAttributes ?? []),
                        ],
                        props.content(),
                      ),
                    ],
                  ),
                  {
                    initial: { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
                    animate: model.open
                      ? { opacity: 1, y: 0, scaleY: 1 }
                      : { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
                    exit: { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
                    present: model.open,
                    transition: model.open ? spring.fast : spring.fast.exit,
                    reducedMotion: resolvePresentation(props).reducedMotion,
                  },
                ),
              ],
            ),
          ]
        : []),
    ],
  )
})

export const layer = ColorPopupBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Position.layer, FinishExit.layer, Focus.layer, ClearSearch.layer),
})

export const test = { Focus, ClearSearch, FinishExit }
