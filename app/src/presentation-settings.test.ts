import * as SliderConfiguration from './playground/configs/slider'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { BannerBlock, test as bannerTest } from '@foldkit-visuals/fluid/banner'
import { SliderBlock } from '@foldkit-visuals/fluid/slider'
import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { Story } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { expect } from 'vitest'
import { PreferencesBlock, layer as preferencesLayer } from './preferences'
import { componentPresentation, defaults } from './settings'
import { FluidGalleryBlock, layer as fluidLayer } from './gallery/fluid'
import { prepareGalleryFlags } from './gallery/flags'
import { Volume } from './gallery/fluid/core-bindings'
import { AuthoredDatesBlock, layer as datesLayer } from './reference/authored-dates'

const settleShape = Story.steps(
  Story.Command.expectExact(
    hoverTest.ControlHover({
      id: 'presentation-preferences-shape-select-hover',
      action: 'Remeasure',
      index: null,
      enabled: true,
    }),
  ),
  Story.Command.resolve(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
)

it.effect('acknowledges shape and reset without disturbing unrelated preference controls', () =>
  Story.story(
    { block: PreferencesBlock, layer: preferencesLayer },
    Story.init({ id: 'presentation-preferences', settings: defaults }),
    Story.models(
      Story.steps(
        Story.inMessage(
          PreferencesBlock.InMessage.InformedOfSelections({
            settings: { ...defaults, shape: 'pill' },
          }),
        ),
      ),
      (before, after) => {
        expect(after.shape.value).toBe('pill')
        expect(after.theme).toEqual(before.theme)
        expect(after.font).toEqual(before.font)
        expect(after.hover).toEqual(before.hover)
        expect(after.rowHover).toEqual(before.rowHover)
      },
    ),
    settleShape,
    Story.message(PreferencesBlock.Message.ClickedReset()),
    Story.expectOutMessage(PreferencesBlock.OutMessage.RequestedReset()),
    Story.inMessage(PreferencesBlock.InMessage.InformedOfSelections({ settings: defaults })),
    Story.model((model) => {
      expect(model.shape.value).toBe(defaults.shape)
    }),
    settleShape,
    Story.Command.expectNone(),
  ),
)

it.effect('shape updates preserve gallery slider, calendar, color and hover state', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    yield* Story.story(
      { block: FluidGalleryBlock, layer: fluidLayer },
      Story.init(flags),
      Story.Command.resolve(
        bannerTest.CaptureReducedMotion,
        BannerBlock.Message.CapturedReducedMotion({ value: false, mountGeneration: 0 }),
      ),
      Story.models(
        Story.steps(
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfPresentation({
              presentation: { ...componentPresentation(defaults), shape: 'pill' },
            }),
          ),
        ),
        (before, after) => {
          expect(after.slider).toEqual(before.slider)
          expect(after.volume).toEqual(before.volume)
          expect(after.calendar).toEqual(before.calendar)
          expect(after.picker).toEqual(before.picker)
          expect(after.select).toEqual(before.select)
          expect(after.color).toEqual(before.color)
          expect(after.checks.radius).toBe(16)
          expect(after.checks.hover).toEqual(before.checks.hover)
        },
      ),
      Story.Command.expectNone(),
    )
  }),
)

it.effect('shape changes retain authored date selections and pending calendar state', () =>
  Story.story(
    { block: AuthoredDatesBlock, layer: datesLayer },
    Story.init(),
    Story.models(
      Story.steps(
        Story.inMessage(
          AuthoredDatesBlock.InMessage.InformedOfPresentation({
            presentation: { ...componentPresentation(defaults), shape: 'pill' },
          }),
        ),
      ),
      (before, after) => {
        expect(after.pickers).toEqual(before.pickers)
        expect(after.docTabs).toEqual(before.docTabs)
      },
    ),
    Story.Command.expectNone(),
  ),
)

it.effect(
  'preview overrides reconcile and reset against current presentation without a prior snapshot',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      const presentation = componentPresentation(defaults)
      yield* Story.withBlock({ block: FluidGalleryBlock, layer: fluidLayer }, (gallery) => {
        const initial = gallery.init(flags).model
        const configured = gallery.inMessageUpdate(
          initial,
          FluidGalleryBlock.InMessage.InformedOfPresentation({ presentation }),
        ).model
        const overridden = gallery.inMessageUpdate(
          configured,
          FluidGalleryBlock.InMessage.InformedOfConfiguration({
            configuration: {
              ...SliderConfiguration.defaults,
              appearance: {
                shape: 'rounded',
                size: 'compact',
                hover: 'standard',
              },
              min: 10,
              max: 50,
              step: 5,
            },
            presentation,
          }),
        ).model
        expect(overridden.checks.radius).toBe(8)
        expect(overridden.ask.radius).toBe(8)
        expect(overridden.select.menu.hover.mode).toBe('standard')
        expect(overridden.picker.presentation.compact).toBe(true)
        expect(overridden.volume.settings.compact).toBe(true)
        expect(overridden.slider.settings).toMatchObject({ min: 10, max: 50, step: 5 })

        const reset = gallery.inMessageUpdate(
          overridden,
          FluidGalleryBlock.InMessage.InformedOfConfiguration({
            configuration: SliderConfiguration.defaults,
            presentation,
          }),
        ).model
        expect(reset.checks.radius).toBe(0)
        expect(reset.ask.radius).toBe(0)
        expect(reset.select.menu.hover.mode).toBe('fluid')
        expect(reset.picker.presentation.compact).toBe(false)
        expect(reset.volume.settings.compact).toBe(false)
        expect(reset.slider.settings).toMatchObject({ min: 0, max: 100, step: 1 })
        const repeated = gallery.inMessageUpdate(
          reset,
          FluidGalleryBlock.InMessage.InformedOfPresentation({ presentation }),
        ).model
        expect(repeated).toBe(reset)
      })
    }),
)

it.effect('volume accepts keyboard changes without replacing its active presentation', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    yield* Story.withBlock({ block: FluidGalleryBlock, layer: fluidLayer }, (gallery) => {
      const initial = gallery.init(flags).model
      const before = gallery.inMessageUpdate(
        initial,
        FluidGalleryBlock.InMessage.InformedOfPresentation({
          presentation: { ...componentPresentation(defaults), size: 'compact' },
        }),
      ).model
      const message = toParentMessageFor(gallery)(
        Volume,
        SliderBlock.Message.CapturedKey({
          index: 0,
          key: 'ArrowRight',
          shift: false,
          alt: false,
          ctrl: false,
          meta: false,
        }),
      )
      const after = gallery.update(before, message).model
      expect(after.volume.settings).toEqual({ ...before.volume.settings, value: 61 })
      expect(after.volume.settings.compact).toBe(true)
    })
  }),
)
