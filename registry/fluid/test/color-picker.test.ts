import { TooltipStoryLayer } from './tooltip-story-services.js'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import {
  ColorPickerBlock,
  layer as pickerLayer,
  InMessage,
  createColorPickerLayer,
  colorSettings,
  parseColor,
  buildParsed,
} from '../src/color-picker.js'
import { Field } from '../src/color-picker-block.js'
import {
  ColorPopupBlock,
  layer as popupLayer,
  test as popupTest,
} from '../src/color-picker-popup.js'

const codec = Schema.fromJsonString(Schema.toCodecJson(ColorPickerBlock.Model))
const replay = (model: typeof ColorPickerBlock.Model.Type) =>
  Schema.encodeEffect(codec)(model).pipe(Effect.flatMap(Schema.decodeEffect(codec)))
const picker = { block: ColorPickerBlock, layer: pickerLayer }
const popup = { block: ColorPopupBlock, layer: popupLayer }
const resources = Layer.merge(createColorPickerLayer(), TooltipStoryLayer)
const assertEvents =
  (assert: (out: typeof ColorPickerBlock.OutMessage.Type | undefined) => void) =>
  <Model, Message>(
    simulation: Story.StorySimulation<Model, Message, typeof ColorPickerBlock.OutMessage.Type>,
  ) => {
    assert(simulation.outMessage)
    return simulation
  }

describe('ColorPicker public owner', () => {
  test('parses source formats, clips channels, and preserves alpha precision', () => {
    expect(parseColor('#1234')).toEqual({ r: 17, g: 34, b: 51, a: 68 / 255 })
    expect(parseColor('#12345')).toBeNull()
    expect(parseColor('rgba(300, -1, 30, 50%)')).toEqual({ r: 255, g: 0, b: 30, a: 0.5 })
    expect(parseColor('hsl(120 100% 50% / 25%)')).toEqual({ r: 0, g: 255, b: 0, a: 0.25 })
    expect(parseColor('tomato')).toBeNull()
    expect(buildParsed(240, 1, 1, 0.5)).toMatchObject({
      hex: '#0000ff80',
      rgb: 'rgba(0, 0, 255, 0.5)',
      hsl: 'hsla(240, 100%, 50%, 0.5)',
    })
  })
  it.effect(
    'outside updates preserve achromatic hue, ignore invalid strings and reject rounded echo snapping',
    () =>
      Effect.gen(function* () {
        const gray = yield* Story.story(
          picker,
          Story.init({ id: 'color', value: '#00ff00' }),
          Story.inMessage(
            InMessage.RequestedConfigure({
              settings: colorSettings({ id: 'color', value: '#808080' }),
            }),
          ),
          Story.model((model) => {
            expect(model.color.hsv.h).toBe(120)
            expect(model.hue.settings.value).toBe(120)
          }),
        )
        const dragged = yield* Story.story(
          picker,
          Story.given(yield* replay(gray)),
          Story.inMessage(
            InMessage.RequestedConfigure({
              settings: colorSettings({ id: 'color', value: 'unreadable' }),
            }),
          ),
          Story.model((model) => expect(model.color.hsv.h).toBe(120)),
          Story.message(
            ColorPickerBlock.Message.SquarePointer({
              phase: 'down',
              pointer: 1,
              x: 33.333333,
              y: 22.222222,
              left: 0,
              top: 0,
              width: 100,
              height: 100,
            }),
          ),
          assertEvents((out) => expect(out?._tag).toBe('Events')),
        )
        yield* Story.story(
          picker,
          Story.given(dragged),
          Story.models(
            Story.steps(
              Story.inMessage(InMessage.RequestedConfigure({ settings: dragged.color.settings })),
            ),
            (before, after) => expect(after).toBe(before),
          ),
          Story.Command.expectNone(),
        )
        yield* Story.story(
          picker,
          Story.given(yield* replay(dragged)),
          Story.inMessage(
            InMessage.RequestedConfigure({
              settings: colorSettings({ id: 'color', value: dragged.color.lastEmitted }),
            }),
          ),
          Story.model((model) => expect(model.color.hsv).toEqual(dragged.color.hsv)),
        )
        yield* Story.story(
          picker,
          Story.given(dragged),
          Story.inMessage(
            InMessage.RequestedConfigure({
              settings: {
                ...dragged.color.settings,
                value: Option.some(dragged.color.lastEmitted),
                swatches: [...dragged.color.settings.swatches],
                hideEyedropper: true,
              },
            }),
          ),
          Story.model((model) => {
            expect(model.color.settings.swatches).toBe(dragged.color.settings.swatches)
            expect(model.color.settings.hideEyedropper).toBe(true)
            expect(model.color.dragging).toEqual(dragged.color.dragging)
            expect(model.color.hsv).toEqual(dragged.color.hsv)
            expect(model.hue).toBe(dragged.hue)
            expect(model.alpha).toBe(dragged.alpha)
          }),
          Story.Command.expectNone(),
        )
      }).pipe(Effect.provide(resources)),
  )
  it.effect('controlled format emits callback order while retaining current display format', () =>
    Story.story(
      picker,
      Story.init({ id: 'color', value: '#ff0000', format: 'hex' }),
      Story.inMessage(InMessage.RequestedFormat({ format: 'rgb' })),
      Story.model((model) => expect(Option.getOrNull(model.color.settings.format)).toBe('hex')),
      assertEvents((out) =>
        expect(out?.events).toMatchObject([
          { type: 'format', format: 'rgb' },
          { type: 'value', value: 'rgb(255, 0, 0)' },
        ]),
      ),
    ).pipe(Effect.provide(resources)),
  )
  it.effect('keyboard square changes source coordinates and unmount drops active gestures', () =>
    Effect.gen(function* () {
      const dragged = yield* Story.story(
        picker,
        Story.init({ id: 'color', defaultValue: '#808080' }),
        Story.message(ColorPickerBlock.Message.SquareKey({ key: 'ArrowRight', shift: true })),
        Story.model((model) => expect(model.color.hsv.s).toBe(0.1)),
        Story.message(
          ColorPickerBlock.Message.SquarePointer({
            phase: 'down',
            pointer: 2,
            x: 40,
            y: 50,
            left: 0,
            top: 0,
            width: 100,
            height: 100,
          }),
        ),
      )
      yield* Story.story(
        picker,
        Story.given(yield* replay(dragged)),
        Story.message(ColorPickerBlock.Message.Unmounted()),
        Story.model((model) => {
          expect(Option.isNone(model.color.dragging)).toBe(true)
          expect(model.color.pressed).toBe(false)
        }),
      )
    }).pipe(Effect.provide(resources)),
  )
})

it.effect(
  'controlled format menu ignores user toggle while controlled popover reports intent',
  () =>
    Effect.gen(function* () {
      yield* Story.story(
        popup,
        Story.init({ id: 'm', kind: 'menu', open: false }),
        Story.message(ColorPopupBlock.Message.ClickedTrigger()),
        Story.expectNoOutMessage(),
        Story.model((model) => expect(model.open).toBe(false)),
      )
      yield* Story.story(
        popup,
        Story.init({ id: 'p', kind: 'popover', open: false }),
        Story.message(ColorPopupBlock.Message.ClickedTrigger()),
        Story.expectOutMessage(ColorPopupBlock.OutMessage.OpenChanged({ open: true })),
        Story.model((model) => expect(model.open).toBe(false)),
      )
    }).pipe(Effect.provide(resources)),
)

it.effect(
  'numeric scrubbing applies modifier changes to each movement rather than rescaling previous travel',
  () =>
    Effect.gen(function* () {
      const scrubbed = yield* Story.story(
        picker,
        Story.init({ id: 'scrub', defaultFormat: 'rgb', defaultValue: '#6B97FF' }),
        Story.message(ColorPickerBlock.Message.ScrubDown({ channel: 'r', pointer: 1, x: 100 })),
        Story.message(ColorPickerBlock.Message.FieldFocus({ channel: 'r' })),
        Story.model((model) => expect(Option.isNone(model.color.editing)).toBe(true)),
        Story.message(
          ColorPickerBlock.Message.ScrubMove({
            pointer: 1,
            x: 101,
            movement: 1,
            locked: true,
            shift: false,
          }),
        ),
      )
      yield* Story.story(
        picker,
        Story.given(yield* replay(scrubbed)),
        Story.message(
          ColorPickerBlock.Message.ScrubMove({
            pointer: 1,
            x: 101,
            movement: 1,
            locked: true,
            shift: true,
          }),
        ),
        Story.model((model) => expect(model.color.lastEmitted).toBe('rgb(118, 151, 255)')),
      )
    }).pipe(Effect.provide(resources)),
)

it.effect(
  'numeric editing nudges from the last displayed value, preserves a draft until blur, and Escape reverts it',
  () =>
    Story.story(
      picker,
      Story.init({ id: 'draft', defaultFormat: 'rgb', defaultValue: '#6B97FF' }),
      Story.message(ColorPickerBlock.Message.FieldFocus({ channel: 'r' })),
      Story.message(ColorPickerBlock.Message.FieldDraft({ channel: 'r', value: '109' })),
      Story.model((model) => expect(model.color.lastEmitted).toBe('')),
      Story.message(
        ColorPickerBlock.Message.FieldKey({ channel: 'r', key: 'ArrowUp', shift: false }),
      ),
      Story.message(
        ColorPickerBlock.Message.FieldKey({ channel: 'r', key: 'ArrowUp', shift: false }),
      ),
      Story.model((model) => {
        expect(model.color.lastEmitted).toBe('rgb(111, 151, 255)')
        expect(model.color.drafts.r).toBe('111')
      }),
      Story.message(ColorPickerBlock.Message.FieldDraft({ channel: 'r', value: '999' })),
      Story.message(
        ColorPickerBlock.Message.FieldKey({ channel: 'r', key: 'Escape', shift: false }),
      ),
      Story.Command.expectExactInOrder(Field({ id: 'draft', channel: 'r', operation: 'blur' })),
      Story.Command.resolve(Field, ColorPickerBlock.Message.CompletedField()),
      Story.message(ColorPickerBlock.Message.FieldBlur({ channel: 'r', value: '999' })),
      Story.expectNoOutMessage(),
      Story.model((model) => expect(model.color.lastEmitted).toBe('rgb(111, 151, 255)')),
    ).pipe(Effect.provide(resources)),
)

it.effect(
  'numeric virtual cursor wraps at viewport edges and a cancelled gesture cannot continue changing color',
  () =>
    Effect.gen(function* () {
      const pressed = yield* Story.story(
        picker,
        Story.init({ id: 'cursor', defaultFormat: 'rgb' }),
        Story.message(
          ColorPickerBlock.Message.ScrubDown({
            channel: 'r',
            pointer: 7,
            x: 99,
            y: 10,
            cursor: true,
            scale: 2,
          }),
        ),
      )
      yield* Story.story(
        picker,
        Story.given(yield* replay(pressed)),
        Story.message(
          ColorPickerBlock.Message.ScrubMove({
            pointer: 7,
            x: 99,
            movement: 2,
            movementY: -20,
            locked: true,
            shift: false,
            left: 0,
            top: 0,
            right: 100,
            bottom: 80,
            scale: 2,
          }),
        ),
        Story.model((model) =>
          expect(Option.getOrNull(model.color.scrubCursor)).toEqual({
            x: -12,
            y: 73,
            scale: 2,
            visible: true,
          }),
        ),
        Story.message(ColorPickerBlock.Message.ScrubLock({ locked: false })),
        Story.model((model) =>
          expect(Option.getOrNull(model.color.scrubCursor)?.visible).toBe(false),
        ),
        Story.message(ColorPickerBlock.Message.ScrubUp({ pointer: 7, cancelled: true })),
        Story.models(
          Story.steps(
            Story.message(
              ColorPickerBlock.Message.ScrubMove({
                pointer: 7,
                x: 99,
                movement: 80,
                locked: true,
                shift: true,
              }),
            ),
          ),
          (before, after) => {
            expect(after.color.lastEmitted).toBe(before.color.lastEmitted)
            expect(Option.isNone(after.color.scrubCursor)).toBe(true)
          },
        ),
      )
    }).pipe(Effect.provide(resources)),
)

it.effect(
  'format trigger arrows choose first or last row and repeated typeahead cycles matching labels',
  () =>
    Story.story(
      popup,
      Story.init({ id: 'format-keys', kind: 'menu' }),
      Story.message(ColorPopupBlock.Message.PressedOpeningKey({ key: 'ArrowUp' })),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.focusIndex).toBe(3)
      }),
      Story.Command.expectExactInOrder(popupTest.Focus({ id: 'format-keys', index: 3 })),
      Story.Command.resolve(popupTest.Focus, ColorPopupBlock.Message.CompletedFocus()),
      Story.message(ColorPopupBlock.Message.PressedKey({ key: 'h' })),
      Story.model((model) => expect(model.focusIndex).toBe(0)),
      Story.Command.expectExactInOrder(
        popupTest.Focus({ id: 'format-keys', index: 0 }),
        popupTest.ClearSearch({ version: 1 }),
      ),
      Story.Command.resolve(popupTest.Focus, ColorPopupBlock.Message.CompletedFocus()),
      Story.message(ColorPopupBlock.Message.PressedKey({ key: 'h' })),
      Story.model((model) => expect(model.focusIndex).toBe(2)),
      Story.Command.expectExactInOrder(
        popupTest.ClearSearch({ version: 1 }),
        popupTest.Focus({ id: 'format-keys', index: 2 }),
        popupTest.ClearSearch({ version: 2 }),
      ),
      Story.Command.resolve(popupTest.Focus, ColorPopupBlock.Message.CompletedFocus()),
      Story.message(ColorPopupBlock.Message.FocusedItem({ index: 2, visible: true })),
      Story.model((model) => expect(model.focusedIndex).toBe(2)),
      Story.message(ColorPopupBlock.Message.PointerArrived()),
      Story.model((model) => {
        expect(model.focusedIndex).toBe(-1)
        expect(model.focusIndex).toBe(2)
      }),
      Story.Command.resolve(
        popupTest.ClearSearch({ version: 1 }),
        ColorPopupBlock.Message.ClearedSearch({ version: 1 }),
      ),
      Story.model((model) => expect(model.search).toBe('h')),
      Story.Command.resolve(
        popupTest.ClearSearch({ version: 2 }),
        ColorPopupBlock.Message.ClearedSearch({ version: 2 }),
      ),
      Story.model((model) => expect(model.search).toBe('')),
    ).pipe(Effect.provide(resources)),
)
