// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- actual ColorPicker and canonical document Tooltip resources
import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schedule, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import { expect } from 'vitest'
import {
  ColorPickerBlock,
  colorValueOf,
  settingsOf,
  colorPickerChannelTooltipEntries,
  layer as pickerLayer,
  createColorPickerLayer,
} from '../src/color-picker.js'
import { DocumentTooltipBlock, layer as tooltipLayer } from '../src/tooltip-native/document.js'
import type { ColorChannelTooltip, ColorPickerConfig } from '../src/color-picker.js'
import { createPresentationContext } from '../src/presentation.js'
import { makeTooltipDomLayer } from '../src/tooltip-native/resources.js'
import { createMotionScope } from '../src/motion.js'
import { createSliderMotionScope } from '../src/slider-motion.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 60, schedule: Schedule.spaced('20 millis') }))

const trigger = (key: string) => {
  const node = document.querySelector<HTMLElement>(
    `[data-tooltip-trigger="named-color-tooltip-${key}"]`,
  )

  if (node === null) {
    throw new Error(`Missing ColorPicker tooltip ${key}`)
  }

  return node
}

const hover = (key: string) => {
  const node = trigger(key)
  node.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  node.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', movementX: 2 }),
  )
}

const Message = defineMessageUnion({
  Hex: {},
  Rgb: {},
  Oklch: {},
  Toggle: {},
  TweakOne: {},
  TweakTwo: {},
  ReplaceSwatches: {},
})

export const ColorTooltipConsumerKey = Symbol('ColorTooltipConsumer')

const Consumer = Block.make('ColorTooltipConsumer', {
  key: ColorTooltipConsumerKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    picker: ColorPickerBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
    shown: Schema.Boolean,
  }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ColorPickerBlock>['programRequirements']
  >(),
})

const PickerRequests = Consumer.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'picker',
  init: {
    contextToArgs: () =>
      [
        {
          id: 'named-color',
          channelTooltipProvider: 'ancestor',
          defaultFormat: 'rgb',
          value: '#808080',
          swatches: [
            { color: '#ff0000', label: 'Scarlet' },
            { color: '#0000ff', label: 'Ocean' },
            '#00ff00',
            { color: '#ffffff', label: '' },
          ],
        },
      ] satisfies [ColorPickerConfig],
  },
})
const Picker = PickerRequests.withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(ColorPickerBlock, {
    Events: ({ events }) =>
      Consumer.makeStep((model) => {
        const settings = settingsOf(model.picker)
        return Update.combineSteps(
          events.flatMap((event) =>
            event.type === 'value'
              ? [
                  PickerRequests.requestConfigure({
                    settings: {
                      ...settings,
                      value: Option.some(event.value),
                      swatches: settings.swatches.map((swatch) =>
                        typeof swatch === 'string' ? swatch : { ...swatch },
                      ),
                    },
                  }),
                ]
              : [],
          ),
        )
      }),
  }),
})

const Tooltips = Consumer.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: () => Consumer.makeNoopStep(),
  }),
})

const composition = Consumer.makeComposition({ bindings: [Picker, Tooltips] })

it.live(
  'ColorPicker shares ancestor channel tooltips, preserves swatch clicks and releases portals with JS-motion fallback',
  () =>
    Effect.gen(function* colorTooltipLifetime() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('ColorPicker tooltip test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )
      const motion = createMotionScope('color-tooltip-test')
      const slider = createSliderMotionScope('color-tooltip-slider-test')

      const layer = Consumer.makeLayer({
        init: composition.makeInit(() => ({
          model: { shown: true },
          steps: [
            Tooltips.requestAdd({ key: 'app', groupKey: 'ambient', options: { delayDuration: 0 } }),
            ...colorPickerChannelTooltipEntries('named-color').map((entry) =>
              Tooltips.requestAdd({ ...entry, groupKey: 'ambient' }),
            ),
          ],
        })),
        update: composition.makeUpdate({
          ReplaceSwatches: Consumer.makeStep((model) =>
            Picker.requestConfigure({
              settings: {
                ...settingsOf(model.picker),
                swatches: [
                  { color: '#0000ff', label: 'Sea' },
                  '#00ff00',
                  { color: '#ff0000', label: 'Ruby' },
                ],
              },
            }),
          ),
          TweakOne: Picker.requestColor({ value: '#456789' }),
          TweakTwo: Picker.requestColor({ value: '#56789a' }),
          Hex: Picker.requestFormat({ format: 'hex' }),
          Rgb: Picker.requestFormat({ format: 'rgb' }),
          Oklch: Picker.requestFormat({ format: 'oklch' }),
          Toggle: (model) => ({ model: { ...model, shown: !model.shown } }),
        }),
        view: composition.makeView((model, h) => {
          const hexAttributes = childAttributes([h.Id('format-hex'), h.OnClick(Message.Hex())])
          const rgbAttributes = childAttributes([h.Id('format-rgb'), h.OnClick(Message.Rgb())])

          const toggleAttributes = childAttributes([
            h.Id('toggle-picker'),
            h.OnClick(Message.Toggle()),
          ])

          const triggers = new Map<string, Parameters<ColorChannelTooltip>[0]['render']>()

          return h.block(
            Tooltips.embedView({
              slotId: 'tooltips',
              model: model.tooltips,
              viewInputs: {
                renderTrigger: (key, context) => {
                  const render = triggers.get(key)

                  if (render === undefined) {
                    throw new Error(`Missing tooltip ${key}`)
                  }

                  return render(context)
                },
                renderDocument: (content, popups) => h.div([], [content, ...popups]),
                render: ({ tooltip }) => {
                  const channelTooltip: ColorChannelTooltip = ({ key, content, render }) => {
                    triggers.set(key, render)

                    return tooltip(key, {
                      content,
                      animate: motion.node,
                      shapeClass: 'rounded-lg',
                      reducedMotion: 'always',
                    })
                  }

                  return h.div(
                    [],
                    [
                      h.button(toggleAttributes, ['Toggle picker']),
                      h.button(
                        [h.Id('replace-swatches'), h.OnClick(Message.ReplaceSwatches())],
                        ['Replace swatches'],
                      ),
                      h.button([h.Id('tweak-one'), h.OnClick(Message.TweakOne())], ['First color']),
                      h.button(
                        [h.Id('tweak-two'), h.OnClick(Message.TweakTwo())],
                        ['Second color'],
                      ),
                      h.output([h.Id('current-color')], [colorValueOf(model.picker)]),
                      h.button(hexAttributes, ['Hex']),
                      h.button(rgbAttributes, ['RGB']),
                      h.button([h.Id('format-oklch'), h.OnClick(Message.Oklch())], ['OKLCH']),
                      channelTooltip({
                        key: 'app',
                        content: 'App',
                        render: ({ button }) => button([], ['App']),
                      }),
                      model.shown
                        ? h.block(
                            Picker.embedView({
                              slotId: 'picker',
                              model: model.picker,
                              viewInputs: {
                                channelTooltip,
                                animate: motion.node,
                                sliderMotion: slider.node,
                                highlightMotion: hoverHighlightAnimation(motion),
                                context: createPresentationContext({ reducedMotion: 'always' }),
                              },
                            }),
                          )
                        : h.empty,
                    ],
                  )
                },
              },
            }),
          )
        }),
      }).pipe(Layer.provide(Layer.mergeAll(pickerLayer, tooltipLayer)))

      const host = document.createElement('div')
      host.id = 'color-tooltip-consumer'
      document.body.append(host)

      const program = Runtime.embed(
        Program.makeElement({ block: Consumer, layer, container: host }).provide(
          Layer.mergeAll(
            motion.layer,
            slider.layer,
            createColorPickerLayer(document),
            makeTooltipDomLayer(document, window),
          ),
        ),
      )

      try {
        yield* eventually(() => {
          expect(
            document.querySelector('[data-tooltip-trigger="named-color-tooltip-r"]'),
          ).not.toBeNull()
        })
        document.querySelector<HTMLElement>('#format-oklch')?.click()
        yield* eventually(() => {
          for (const label of ['Lightness', 'Chroma']) {
            expect(
              document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)?.inputMode,
            ).toBe('decimal')
          }
          expect(
            document.querySelector<HTMLInputElement>('[data-color-channel="H"] input[type="text"]')
              ?.inputMode,
          ).toBe('numeric')
        })
        document.querySelector<HTMLElement>('#format-rgb')?.click()
        yield* eventually(() => {
          expect(
            document.querySelector<HTMLInputElement>('input[aria-label="Red"]')?.inputMode,
          ).toBe('numeric')
        })
        const retainedSwatches = [trigger('swatch-0'), trigger('swatch-1')]
        const plain = document.querySelector<HTMLElement>('[aria-label="Select color #00ff00"]')
        expect(plain).not.toBeNull()
        expect(plain?.hasAttribute('data-tooltip-trigger')).toBe(false)
        expect(
          document.querySelector('[data-tooltip-trigger="named-color-tooltip-swatch-3"]'),
        ).toBeNull()
        document.querySelector<HTMLElement>('#tweak-one')?.click()
        yield* eventually(() => {
          expect(document.querySelector('#current-color')?.textContent).toBe('#456789')
        })
        document.querySelector<HTMLElement>('#tweak-two')?.click()
        yield* eventually(() => {
          expect(document.querySelector('#current-color')?.textContent).toBe('#56789a')
          expect(trigger('swatch-0')).toBe(retainedSwatches[0])
          expect(trigger('swatch-1')).toBe(retainedSwatches[1])
        })
        const app = document.querySelector<HTMLElement>('[data-tooltip-trigger="app"]')

        if (app === null) {
          throw new Error('Missing ambient app tooltip')
        }

        yield* eventually(() => {
          app.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
          app.dispatchEvent(
            new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', movementX: 2 }),
          )
          expect(document.querySelector<HTMLElement>('#app-popup')?.textContent).toBe('App')
        })
        hover('r')
        yield* Effect.try(() => {
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-r-popup')?.textContent,
          ).toBe('Red')
        }).pipe(Effect.retry({ times: 8, schedule: Schedule.spaced('10 millis') }))
        expect(trigger('r').getAttribute('aria-describedby')).toBe('named-color-tooltip-r-popup')
        trigger('r').dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
        )
        yield* eventually(() => {
          expect(document.querySelector<HTMLElement>('#named-color-tooltip-r-popup')).toBeNull()
        })
        hover('b')
        yield* eventually(() => {
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-b-popup')?.textContent,
          ).toBe('Blue')
        })
        const blueBefore = trigger('b')

        document.querySelector<HTMLElement>('#format-rgb')?.click()
        yield* eventually(() => {
          expect(trigger('b')).toBe(blueBefore)
          expect(trigger('b').dataset.state).toBe('open')
        })
        document.querySelector<HTMLElement>('#format-hex')?.click()
        yield* eventually(() => {
          expect(
            document.querySelector('[data-tooltip-trigger="named-color-tooltip-b"]'),
          ).toBeNull()
        })
        document.querySelector<HTMLElement>('#format-rgb')?.click()
        yield* eventually(() => {
          expect(trigger('b').isConnected).toBe(true)
          expect(trigger('b').dataset.state).toBe('closed')
          expect(document.querySelector<HTMLElement>('#named-color-tooltip-b-popup')).toBeNull()
        })
        hover('swatch-0')
        expect(
          document.querySelector<HTMLElement>('#named-color-tooltip-swatch-0-popup'),
        ).toBeNull()
        yield* eventually(() => {
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-swatch-0-popup')?.textContent,
          ).toBe('Scarlet')
        })
        hover('swatch-1')
        yield* eventually(() => {
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-swatch-1-popup')?.textContent,
          ).toBe('Ocean')
          expect(trigger('swatch-0').hasAttribute('aria-describedby')).toBe(false)
        })
        trigger('swatch-1').dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* eventually(() => {
          expect(trigger('swatch-1').getAttribute('aria-pressed')).toBe('true')
        })
        hover('swatch-0')
        yield* eventually(() => {
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-swatch-0-popup')?.textContent,
          ).toBe('Scarlet')
        })
        document.querySelector<HTMLElement>('#replace-swatches')?.click()
        yield* eventually(() => {
          expect(trigger('swatch-0').getAttribute('aria-label')).toBe('Sea')
          expect(trigger('swatch-2').getAttribute('aria-label')).toBe('Ruby')
          expect(
            document.querySelector('[data-tooltip-trigger="named-color-tooltip-swatch-1"]'),
          ).toBeNull()
          expect(document.querySelector('#named-color-tooltip-swatch-0-popup')?.textContent).toBe(
            'Sea',
          )
        })
        trigger('swatch-0').dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* eventually(() => {
          expect(document.querySelector('#current-color')?.textContent).toBe('#0000ff')
          expect(trigger('swatch-0').getAttribute('aria-pressed')).toBe('true')
        })
        document.querySelector<HTMLElement>('#toggle-picker')?.click()
        yield* eventually(() => {
          expect(document.querySelector<HTMLElement>('#named-color')).toBeNull()
        })
        document.querySelector<HTMLElement>('#toggle-picker')?.click()
        yield* eventually(() => {
          expect(trigger('swatch-0').isConnected).toBe(true)
          expect(trigger('swatch-0').dataset.state).toBe('closed')
          expect(
            document.querySelector<HTMLElement>('#named-color-tooltip-swatch-0-popup'),
          ).toBeNull()
        })
      } finally {
        yield* Effect.promise(program.dispose)
        host.remove()
      }

      expect(document.querySelector('[data-tooltip-popup^="named-color-tooltip-"]')).toBeNull()
    }),
)
