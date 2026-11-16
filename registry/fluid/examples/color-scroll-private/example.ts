import { Boolean } from 'effect'
import { ColorScrollOptions } from './options.js'
import { DocumentTooltipBlock, layer as tooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import type { TooltipDom } from '@foldkit-visuals/fluid/tooltip'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  ColorPickerBlock,
  colorPickerChannelTooltipEntries,
  layer as pickerLayer,
} from '@foldkit-visuals/fluid/color-picker'
import type {
  ColorPickerConfig,
  ColorPickerProps,
  ColorPickerEnvironment,
  ColorChannelTooltip,
} from '@foldkit-visuals/fluid/color-picker'

import {
  ColorPickerPopoverBlock,
  layer as popoverLayer,
} from '@foldkit-visuals/fluid/color-picker-popover'
import type { ColorPickerPopoverConfig } from '@foldkit-visuals/fluid/color-picker-popover'

import { ScrollAreaBlock, layer as scrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import type { ScrollAreaConfig } from '@foldkit-visuals/fluid/scroll-area'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createSliderMotionScope } from '@foldkit-visuals/fluid/slider-motion'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'

const Model = Schema.Struct({
  tooltips: DocumentTooltipBlock.Model,
  hex: ColorPickerBlock.Model,
  rgb: ColorPickerBlock.Model,
  hsl: ColorPickerBlock.Model,
  oklch: ColorPickerBlock.Model,
  popover: ColorPickerPopoverBlock.Model,
  scroll: ScrollAreaBlock.Model,
  events: Schema.Array(Schema.String),
  options: ColorScrollOptions,
  shown: Schema.Boolean,
})

const Message = defineMessageUnion({ ClickedToggle: {} })

export const ColorScrollExampleKey = Symbol('ColorScrollExample')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment | TooltipDom>()

export const ColorScrollExample = Block.make('ColorScrollExample', {
  key: ColorScrollExampleKey,
  InitArgs: Schema.Tuple([ColorScrollOptions]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

export const swatches = [
  '#6B97FF',
  '#FFF',
  'rgb(255, 0, 0)',
  { color: 'tomato', label: 'Tomato' },
  { color: '#0000ff80', label: 'Blue' },
  '#000',
]

const colorConfig = (
  id: string,
  defaultFormat: 'hex' | 'rgb' | 'hsl' | 'oklch',
  options: ColorScrollOptions,
): ColorPickerConfig => {
  const picker: ColorPickerConfig = {
    id,
    hoverMode: options.hoverMode ?? 'fluid',
    defaultValue: '#6B97FF',
    defaultFormat,
    hideEyedropper: true,
    swatches,
  }

  const configured = options.controlled
    ? { ...picker, value: '#6B97FF', format: defaultFormat }
    : picker

  return id === 'hex' && options.initialOpen
    ? { ...configured, defaultFormatOpen: true }
    : configured
}

const Hex = ColorScrollExample.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'hex',
  init: {
    contextToArgs: (options: ColorScrollOptions): [ColorPickerConfig] => [
      { ...colorConfig('hex', 'hex', options), channelTooltipProvider: 'ancestor' },
    ],
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ColorPickerBlock, {
    Events: ({ events }) =>
      ColorScrollExample.makeFieldsStep(() => ({
        events: (events) => [...events, ...events.map((event) => JSON.stringify(event))].slice(-8),
      })),
  }),
})

const Rgb = ColorScrollExample.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'rgb',
  init: {
    contextToArgs: (options: ColorScrollOptions): [ColorPickerConfig] => [
      colorConfig('rgb', 'rgb', options),
    ],
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ColorPickerBlock, {
    Events: () => ColorScrollExample.makeNoopStep(),
  }),
})

const Hsl = ColorScrollExample.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'hsl',
  init: {
    contextToArgs: (options: ColorScrollOptions): [ColorPickerConfig] => [
      colorConfig('hsl', 'hsl', options),
    ],
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ColorPickerBlock, {
    Events: () => ColorScrollExample.makeNoopStep(),
  }),
})

const Oklch = ColorScrollExample.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'oklch',
  init: {
    contextToArgs: (options: ColorScrollOptions): [ColorPickerConfig] => [
      colorConfig('oklch', 'oklch', options),
    ],
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ColorPickerBlock, {
    Events: () => ColorScrollExample.makeNoopStep(),
  }),
})

const Popover = ColorScrollExample.makeRequiredFieldBinding(ColorPickerPopoverBlock, {
  field: 'popover',
  init: {
    contextToArgs: (options: ColorScrollOptions): [ColorPickerPopoverConfig] => {
      const picker = colorConfig('popover', 'hex', options)

      return [options.initialOpen ? { ...picker, defaultOpen: true } : picker]
    },
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ColorPickerPopoverBlock, {
    PickerEvents: () => ColorScrollExample.makeNoopStep(),
    OpenChanged: () => ColorScrollExample.makeNoopStep(),
    Removed: () => ColorScrollExample.makeNoopStep(),
  }),
})

const Scroll = ColorScrollExample.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: {
    contextToArgs: (options: ColorScrollOptions) => [
      {
        id: 'scroll',
        orientation: options.orientation,
        direction: options.direction,
      } satisfies ScrollAreaConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: () => ColorScrollExample.makeNoopStep(),
  }),
})

const Tooltips = ColorScrollExample.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: ColorScrollExample.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: () => ColorScrollExample.makeNoopStep(),
  }),
})

const ambientEntries = [
  { key: 'app-tooltip', groupKey: 'app-tooltips', options: { delayDuration: 300 } },
  ...colorPickerChannelTooltipEntries('hex').map((entry) => ({
    ...entry,
    groupKey: 'app-tooltips',
  })),
]

const ColorScrollComposition = ColorScrollExample.makeComposition({
  bindings: [Tooltips, Hex, Rgb, Hsl, Oklch, Popover, Scroll],
})

const init = ColorScrollComposition.makeInit((options: ColorScrollOptions) => ({
  model: { events: [], options, shown: true },
  childInitContext: options,
  steps: ambientEntries.map((entry) => Tooltips.requestAdd(entry)),
}))

const update = ColorScrollComposition.makeUpdate({
  ClickedToggle: ColorScrollExample.makeStep((model) =>
    Update.combineSteps([
      ColorScrollExample.makeFieldsStep(() => ({ shown: Boolean.not })),
      ...ambientEntries.map((entry) =>
        model.shown ? Tooltips.requestRemove({ key: entry.key }) : Tooltips.requestAdd(entry),
      ),
    ]),
  ),
})

const motion = createMotionScope('fluid-color-scroll')

const slider = createSliderMotionScope('fluid-color-scroll-slider')

const baseProps: ColorPickerProps = {
  animate: motion.node,
  sliderMotion: slider.node,
  highlightMotion: hoverHighlightAnimation(motion),
}

const view = ColorScrollComposition.makeView((model, h) => {
  if (!model.shown) {
    return {
      title: 'Fluid Color and Scroll',
      body: h.div(
        [h.Class('page p-6')],
        [
          h.button(
            [
              h.Type('button'),
              h.DataAttribute('action', 'toggle'),
              h.OnClick(Message.ClickedToggle()),
            ],
            ['Remount'],
          ),
        ],
      ),
    }
  }

  const toggleAttributes = childAttributes([
    h.Type('button'),
    h.DataAttribute('action', 'toggle'),
    h.OnClick(Message.ClickedToggle()),
  ])

  const triggers = new Map<string, Parameters<ColorChannelTooltip>[0]['render']>()

  const props: ColorPickerProps = {
    ...baseProps,
    shape: model.options.shape,
    size: model.options.size,
  }

  const scrollContent = [
    h.div(
      [
        h.Class(
          [
            'scroll-content w-120 p-3 [&_p]:m-0 [&_p]:h-8',
            model.options.overflow ? '' : 'w-[100px]',
          ].join(' '),
        ),
      ],
      Array.from({ length: model.options.overflow ? 12 : 1 }, (_, i) =>
        h.p([], ['Scroll item ', String(i + 1), ': native overflow content']),
      ),
    ),
  ]

  return {
    title: 'Fluid Color and Scroll',
    body: h.block(
      Tooltips.embedView({
        slotId: 'ambient-tooltips',
        model: model.tooltips,
        viewInputs: {
          renderTrigger: (key, context) => {
            const render = triggers.get(key)

            if (render === undefined) {
              throw new Error(`Missing color tooltip trigger ${key}`)
            }

            return render(context)
          },
          renderDocument: (content, popups) => h.div([], [content, ...popups]),
          render: ({ tooltip }) => {
            const channelTooltip: ColorChannelTooltip = ({ key, content, render }) => {
              triggers.set(key, render)

              return tooltip(key, {
                content,
                shapeClass: resolvePresentation(props).shape.bg,
                reducedMotion: resolvePresentation(props).reducedMotion,
                animate: motion.node,
              })
            }

            return h.div(
              [h.Class('page p-6')],
              [
                ...(model.options.lifecycle ? [h.button(toggleAttributes, ['Unmount'])] : []),
                channelTooltip({
                  key: 'app-tooltip',
                  content: 'App tooltip',
                  render: ({ button }) => button([], ['App tooltip']),
                }),
                h.div(
                  [h.Class('panels grid grid-cols-[280px_280px] gap-6')],
                  [
                    h.block(
                      Hex.embedView({
                        slotId: 'hex',
                        model: model.hex,
                        viewInputs: { ...props, channelTooltip },
                      }),
                    ),
                    h.block(Rgb.embedView({ slotId: 'rgb', model: model.rgb, viewInputs: props })),
                    h.block(Hsl.embedView({ slotId: 'hsl', model: model.hsl, viewInputs: props })),
                    h.block(
                      Oklch.embedView({ slotId: 'oklch', model: model.oklch, viewInputs: props }),
                    ),
                  ],
                ),
                h.div(
                  [
                    h.Class(
                      'toolbar flex gap-3 m-[16px_0] [&_button]:[border:1px_solid_var(--border)] [&_button]:p-[4px_8px]',
                    ),
                  ],
                  [
                    h.block(
                      Popover.embedView({
                        slotId: 'popover',
                        model: model.popover,
                        viewInputs: { ...props, triggerLabel: 'Color', triggerShowRemove: true },
                      }),
                    ),
                  ],
                ),
                h.div(
                  [h.Class('scrolls flex gap-6 mt-6')],
                  [
                    h.block(
                      Scroll.embedView({
                        slotId: 'scroll',
                        model: model.scroll,
                        viewInputs: {
                          className: 'scroll-case w-70 h-35 [border:1px_solid_var(--border)]',
                          children: scrollContent,
                        },
                      }),
                    ),
                  ],
                ),
                h.output(
                  [h.Class('block mt-6 text-[12px] max-w-146 wrap-anywhere'), h.Id('events')],
                  [JSON.stringify(model.events)],
                ),
              ],
            )
          },
        },
      }),
    ),
  }
})

export const ColorScrollExampleLayer = ColorScrollExample.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(pickerLayer, popoverLayer, scrollLayer, tooltipLayer)),
)

export const ColorScrollMotionLayer = Layer.merge(motion.layer, slider.layer)
