import { modifyFields } from 'foldkit/struct'
import type { HoverMode } from './hover-observation.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { popupShape } from './lib/shape.js'
import { Layer } from 'effect'
import { Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { ScrollAreaBlock, layer as ScrollAreaLayer } from './scroll-area.js'
import type { ScrollAreaConfig } from './scroll-area.js'
import { popupScrollAreaClass, popupViewportClass } from './lib/popup.js'
import { PopupBlock, layer as PopupLayer } from './date-picker-popup.js'
import type { PopupConfig } from './date-picker-popup-definition.js'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { TargetMotionOptions } from './motion-target.js'
import { sizeMap } from './lib/size.js'
import { fontWeights } from './lib/font-weight.js'
import { formatDuration } from './date-picker-format.js'
import type { InMessage } from './date-picker-time-definition.js'
import { TimeFieldBlock, Message, OutMessage } from './date-picker-time-definition.js'
import { InputResource } from './date-picker-time-mount.js'
import type { TimeFieldConfig } from './date-picker-time-state.js'
import { TimeFieldAction, transitionTimeField } from './date-picker-time-state.js'

const Highlight = TimeFieldBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (
      config: typeof TimeFieldConfig.Type,
    ): [{ readonly id: string; readonly mode: HoverMode }] => [
      { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})

const Hover = TimeFieldBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: typeof TimeFieldConfig.Type): [HoverConfig] => [
      { id: `${config.id}-list`, axis: 'y', gapClick: true, mode: config.hoverMode ?? 'fluid' },
    ],
  },
}).withOutMessagePolicy({
  fold: TimeFieldBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      TimeFieldBlock.makeStep((model) =>
        Update.combineSteps([
          TimeFieldBlock.makeFieldsStep(() => ({
            field: (field) => modifyFields(field, { activeIndex: () => snapshot.activeIndex }),
          })),
          Highlight.informOfSource({ snapshot, hidden: !model.field.open, mode: model.hover.mode }),
        ]),
      ),
  }),
})

const Scroll = TimeFieldBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: {
    contextToArgs: (config: typeof TimeFieldConfig.Type): [ScrollAreaConfig] => [
      { id: `${config.id}-scroll` },
    ],
  },
}).withOutMessagePolicy({
  fold: TimeFieldBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: () => TimeFieldBlock.makeNoopStep(),
  }),
})

const RawPopup = TimeFieldBlock.makeRequiredFieldBinding(PopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (config: typeof TimeFieldConfig.Type): [PopupConfig, boolean, boolean] => [
      {
        id: `${config.id}-popup`,
        anchorId: config.id,

        kind: 'anchor',
        align: 'start',
      },
      false,
      false,
    ],
  },
})
// Configuration and user input share child synchronization; only user input
// can commit a value. The public Configured message keeps that channel silent.

const synchronizeField = (
  action: TimeFieldAction,
  result: ReturnType<typeof transitionTimeField>,
  wasOpen: boolean,
) =>
  Update.combineSteps([
    TimeFieldBlock.makeFieldsStep(() => ({
      field: () => result.state,
      scrollSerial: (serial) => (result.scroll === null ? serial : serial + 1),
      scrollMode: (mode) => result.scroll ?? mode,
    })),
    ...(TimeFieldAction.isAnyOf(['Configured'])(action)
      ? [
          Hover.requestConfigure({
            options: {
              mode: action.config.hoverMode ?? 'fluid',
              axis: 'y',
              nearest: true,
              gapClick: true,
              maxDistance: Infinity,
            },
          }),
          RawPopup.requestConfigure({
            config: {
              id: `${action.config.id}-popup`,
              anchorId: action.config.id,

              kind: 'anchor',
              align: 'start',
            },
          }),
        ]
      : []),
    RawPopup.requestVisibility({ open: result.state.open, escapeBlocked: false }),
    Hover.requestHighlight({ index: result.state.activeIndex }),
    result.state.open ? TimeFieldBlock.makeNoopStep() : Highlight.requestHide(),
    result.state.open && !wasOpen ? Hover.requestRemeasure() : TimeFieldBlock.makeNoopStep(),
  ])

const apply = (action: TimeFieldAction) =>
  TimeFieldBlock.makeStep((model) => {
    const result = transitionTimeField(model.field, action)
    const { committed } = result

    if (result.state === model.field && committed === null) {
      return TimeFieldBlock.makeNoopStep()
    }

    const steps = synchronizeField(action, result, model.field.open)

    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(registered),
        committed === null ? undefined : OutMessage.Committed({ minutes: committed }),
      )
  })

const Popup = RawPopup.withOutMessagePolicy({
  fold: TimeFieldBlock.makeOutMessageFold(PopupBlock, {
    DismissRequested: () => apply(TimeFieldAction.cases.Dismissed.make({})),
    Released: () => TimeFieldBlock.makeNoopStep(),
  }),
})

const Composition = TimeFieldBlock.makeComposition({
  bindings: [Highlight, Hover, Popup, Scroll],
  mounts: [InputResource],
})

const init = Composition.makeInit((config: typeof TimeFieldConfig.Type) => ({
  childInitContext: config,
  model: {
    field: { config, open: false, draft: null, activeIndex: null, openTarget: null },
    scrollSerial: 0,
    scrollMode: 'center',
  },
}))

const reset = TimeFieldBlock.makeStep(() =>
  Update.combineSteps([
    TimeFieldBlock.makeFieldsStep(() => ({
      field: (field) =>
        modifyFields(field, {
          open: () => false,
          draft: () => null,
          activeIndex: () => null,
          openTarget: () => null,
        }),
    })),
    RawPopup.requestReset(),
    Hover.requestClear(),
    Highlight.requestHide(),
  ]),
)

const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedHoverMode: TimeFieldBlock.makeStep(
    (model, { mode }: typeof InMessage.RequestedHoverMode.Type) => {
      const config = { ...model.field.config, hoverMode: mode }
      return Update.combineSteps([
        TimeFieldBlock.makeFieldsStep(() => ({
          field: (field) => modifyFields(field, { config: () => config }),
        })),
        Hover.requestConfigure({
          options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
        }),
        Highlight.informOfSource({ snapshot: model.hover, hidden: !model.field.open, mode }),
      ])
    },
  ),
  RequestedConfigure: TimeFieldBlock.makeStep(
    (model, { config }: typeof InMessage.RequestedConfigure.Type) => {
      const action = TimeFieldAction.cases.Configured.make({ config })

      return synchronizeField(action, transitionTimeField(model.field, action), model.field.open)
    },
  ),
  RequestedAction: TimeFieldBlock.makeStep(
    (_model, { action }: typeof InMessage.RequestedAction.Type) => apply(action),
  ),
  RequestedReset: reset,
  RequestedDismiss: TimeFieldBlock.makeStep(() => apply(TimeFieldAction.cases.Dismissed.make({}))),
})

const update = Composition.makeUpdate({
  Requested: TimeFieldBlock.makeStep.fromMessage(({ action }: typeof Message.Requested.Type) =>
    apply(action),
  ),
  Disposed: TimeFieldBlock.makeStep(() =>
    Update.combineSteps([
      TimeFieldBlock.makeFieldsStep(() => ({
        field: (field) =>
          modifyFields(field, {
            open: () => false,
            draft: () => null,
            activeIndex: () => null,
            openTarget: () => null,
          }),
      })),
      RawPopup.requestReset(),
      Hover.requestClear(),
      Highlight.requestHide(),
    ]),
  ),
})

export interface TimeFieldViewInputs extends Presentation {
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly compact: boolean
  readonly segmentClass: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly prefix?: Html
  readonly suffix?: Html
}

// Both frozen DatePicker wrappers share the Radix ScrollArea imported by
// DatePickerCore; only their popup positioning/dismissal policies differ.
const view = Composition.makeView.withInputs<TimeFieldViewInputs>((model, inputs, h) => {
  const shape = popupShape(resolvePresentation(inputs).shape.variant)
  const { field } = model
  const { config } = field
  const size = sizeMap[inputs.compact ? 'compact' : 'default']
  const text = field.draft ?? config.display

  const measure = (value: string) =>
    h.span(
      [
        h.AriaHidden(true),
        h.Class('invisible col-start-1 row-start-1 whitespace-pre tabular-nums'),
      ],
      [value],
    )

  const anchor = h.span(
    [
      ...(inputs.attributes ?? []),
      h.Id(config.id),
      h.DataAttribute('date-picker-anchor', config.id),
      h.DataAttribute('slot', 'date-picker-time'),
      h.DataAttribute('time-open', String(field.open)),
      h.DataAttribute('time-draft', String(field.draft !== null)),
      h.Class(
        `${inputs.segmentClass} ${inputs.compact ? 'gap-1' : 'gap-1.5'} cursor-text has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-[color:var(--focus-ring,#6B97FF)] ${size.field}`,
      ),
      h.OnMount(InputResource({ role: 'Input' })),
      h.OnUnmount(Message.Disposed()),
    ],
    [
      ...(inputs.prefix ? [inputs.prefix] : []),
      h.span(
        [h.Class('inline-grid')],
        [
          measure(text || config.placeholder),
          ...config.widestLabels.map(measure),
          h.input([
            h.Type('text'),
            h.InputMode('text'),
            h.Size(1),
            h.Role('combobox'),
            h.AriaLabel(config.label),
            h.AriaExpanded(field.open),
            ...(field.open ? [h.AriaControls(`${config.id}-list`)] : []),
            ...(field.open && field.activeIndex !== null
              ? [h.AriaActiveDescendant(`${config.id}-list-${field.activeIndex}`)]
              : []),
            h.AriaAutocomplete('list'),
            h.Autocomplete('off'),
            h.Spellcheck(false),
            h.Disabled(config.disabled),
            h.Placeholder(config.placeholder),
            h.Value(text),
            h.Class(
              `col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-left tabular-nums text-inherit outline-none placeholder:text-muted-foreground ${size.field} rounded-none`,
            ),
          ]),
        ],
      ),
      ...(inputs.suffix
        ? [
            h.span(
              [
                h.Class(`inline-flex${field.open || field.draft !== null ? ' invisible' : ''}`),
                h.DataAttribute('editing', String(field.open || field.draft !== null)),
              ],
              [inputs.suffix],
            ),
          ]
        : []),
    ],
  )

  const list = h.block(
    Hover.embedView({
      slotId: 'slots',
      model: model.hover,
      viewInputs: {
        attributes: childAttributes([
          h.Id(`${config.id}-list`),
          h.Role('listbox'),
          h.AriaLabel(config.label),
          h.DataAttribute('time-open', String(field.open)),
          h.DataAttribute('time-scroll', String(model.scrollSerial)),
          h.DataAttribute('time-scroll-mode', model.scrollMode),
          ...(field.openTarget === null
            ? []
            : [h.DataAttribute('time-open-target', String(field.openTarget))]),
        ]),
        className: `relative flex flex-col p-1 ${config.slots.some((slot) => slot.duration !== null) ? 'min-w-[180px]' : 'min-w-[112px]'}`,
        content: (snapshot) => [
          h.block(
            Highlight.embedView({
              slotId: 'highlight',
              model: model.highlight,
              viewInputs: {
                animate: inputs.highlight,
                className: shape.bg,
                mode: model.hover.mode,
              },
            }),
          ),
          ...config.slots.map((slot, index) =>
            h.keyed('div')(
              String(slot.minutes),
              [
                h.Id(`${config.id}-list-${index}`),
                h.Role('option'),
                h.AriaSelected(slot.minutes === config.value),
                h.Class(
                  `relative z-10 flex shrink-0 cursor-pointer items-center gap-1.5 ${shape.bg} tabular-nums ${size.control} ${size.itemPx} ${size.type.body} transition-[color] duration-80 ${slot.minutes === config.value || index === snapshot.activeIndex ? 'text-foreground' : 'text-muted-foreground'}`,
                ),
                ...snapshot.itemAttributes(index),
                h.OnClick(
                  Message.Requested({ action: TimeFieldAction.cases.Picked.make({ index }) }),
                ),
              ],
              [
                h.span(
                  [h.Class('inline-grid')],
                  [
                    ...[slot.label, ...config.widestLabels].map((label) =>
                      h.span(
                        [
                          h.Class(
                            'invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]',
                          ),
                          h.AriaHidden(true),
                          h.Style({ fontVariationSettings: fontWeights.semibold }),
                        ],
                        [label],
                      ),
                    ),
                    h.span(
                      [
                        h.Class(
                          'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
                        ),
                        h.Style({
                          fontVariationSettings:
                            slot.minutes === config.value
                              ? fontWeights.semibold
                              : fontWeights.normal,
                        }),
                      ],
                      [slot.label],
                    ),
                  ],
                ),
                ...(slot.duration === null
                  ? []
                  : [
                      h.span(
                        [
                          h.Class(
                            'text-muted-foreground opacity-60 [text-box:trim-both_cap_alphabetic]',
                          ),
                        ],
                        [formatDuration(slot.duration)],
                      ),
                    ]),
              ],
            ),
          ),
        ],
      },
    }),
  )

  return h.div(
    [
      h.Class('contents'),
      h.DataAttribute('time-list-id', `${config.id}-list`),
      h.OnMount(InputResource({ role: 'List' })),
    ],
    [
      anchor,
      h.block(
        Popup.embedView({
          slotId: 'popup',
          model: model.popup,
          viewInputs: {
            animate: inputs.animate,
            ariaLabel: config.label,
            content: () => [
              h.block(
                Scroll.embedView({
                  slotId: 'scroll',
                  model: model.scroll,
                  viewInputs: {
                    className: `${popupScrollAreaClass} max-h-[min(240px,var(--popup-available-height,240px))]`,
                    viewportClassName: `${popupViewportClass} scroll-fade`,
                    children: [],
                    content: () => [list],
                  },
                }),
              ),
            ],
          },
        }),
      ),
    ],
  )
})

export const layer = TimeFieldBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: InputResource.layer,
}).pipe(Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer, PopupLayer, ScrollAreaLayer)))

export { TimeFieldBlock, TimeFieldKey, InMessage } from './date-picker-time-definition.js'
