import { modifyFields } from 'foldkit/struct'
import { displayColorNumber } from './color-number-locale.js'
import { Option, Predicate, Match, Record } from 'effect'
import type { Channel } from './color-picker-state.js'
import {
  colorEmit,
  colorWhole,
  colorChannel,
  channelSpecs,
  boundChannel,
} from './color-picker-state.js'
import { clamp01 } from './color-picker-math.js'
import type { Message } from './color-picker-block.js'
import {
  ColorPickerBlock,
  ColorPickerComposition,
  ResolveSwatches,
  ResolveWhole,
  Pick,
  Field,
  emit,
  selectFormat,
  commitChannel,
  valueEvents,
} from './color-picker-block.js'

const parseChannelDisplay = (value: string) =>
  // eslint-disable-next-line unicorn/prefer-number-coercion -- Color channel displays include numeric prefixes and percent suffixes; Number changes valid committed values.
  Number.parseFloat(value)

const channelStep = (alt: boolean, shift: boolean, small: number, large: number) => {
  if (alt) {
    return 0.1
  }

  return shift ? large : small
}

const wrapScrubCursor = (value: number, half: number, low: number, high: number) => {
  if (value + half < low) {
    return high - half
  }

  return value + half > high ? low - half : value
}

export const update = ColorPickerComposition.makeUpdate({
  Mounted: ColorPickerBlock.makeStep(
    (model, { supported, numberDisplay }: typeof Message.Mounted.Type) => ({
      model: modifyFields(model, {
        color: (currentColor) =>
          modifyFields(currentColor, {
            mounted: () => true,
            numberDisplay: (currentNumberDisplay) => numberDisplay ?? currentNumberDisplay,
            eyedropperSupported: () => supported,
            dragging: () => Option.none(),
            scrub: () => Option.none(),
            scrubCursor: () => Option.none(),
          }),
      }),
      commands: [
        ResolveSwatches({
          swatches: model.color.settings.swatches.map((swatch) =>
            Predicate.isString(swatch) ? swatch : swatch.color,
          ),
        }),
      ],
    }),
  ),
  Whole: ColorPickerBlock.makeStep((model, { value }: typeof Message.Whole.Type) => ({
    model,
    commands: [ResolveWhole({ value })],
  })),
  ResolvedWhole: ColorPickerBlock.makeStep((model, { color }: typeof Message.ResolvedWhole.Type) =>
    Option.isSome(color) ? emit(colorWhole(model.color, color.value)) : { model },
  ),
  ResolvedSwatches: ColorPickerBlock.makeStep(
    (model, { swatches }: typeof Message.ResolvedSwatches.Type) => ({
      model: modifyFields(model, {
        color: (currentColor) => modifyFields(currentColor, { resolvedSwatches: () => swatches }),
      }),
    }),
  ),
  Format: ColorPickerBlock.makeStep((model, { format }: typeof Message.Format.Type) =>
    selectFormat(model, format),
  ),
  Screen: ColorPickerBlock.makeStep((model) => ({ model, commands: [Pick()] })),
  ScreenPicked: ColorPickerBlock.makeStep((model, { value }: typeof Message.ScreenPicked.Type) => ({
    model,
    commands: Option.isSome(value) ? [ResolveWhole({ value: value.value })] : [],
  })),
  SquareHover: ColorPickerBlock.makeStep((model, { hovered }: typeof Message.SquareHover.Type) => ({
    model: modifyFields(model, {
      color: (currentColor) =>
        modifyFields(currentColor, {
          squareHovered: () => hovered,
          cursor: (currentCursor) => (hovered ? currentCursor : Option.none()),
        }),
    }),
  })),
  SquareFocus: ColorPickerBlock.makeStep((model, { focused }: typeof Message.SquareFocus.Type) => ({
    model: modifyFields(model, {
      color: (currentColor) => modifyFields(currentColor, { squareFocused: () => focused }),
    }),
  })),
  SquarePointer: ColorPickerBlock.makeStep((model, point) => {
    if (point.phase === 'up' || point.phase === 'cancel') {
      return {
        model: modifyFields(model, {
          color: (currentColor) => modifyFields(currentColor, { dragging: () => Option.none() }),
        }),
      }
    }

    if (point.width <= 0 || point.height <= 0) {
      return { model }
    }

    const s = clamp01((point.x - point.left) / point.width)
    const y = clamp01((point.y - point.top) / point.height)

    const color = modifyFields(model.color, {
      dragging: (currentDragging) =>
        point.phase === 'down' ? Option.some(point.pointer) : currentDragging,
      cursor: () => Option.some({ x: s * 100, y: y * 100 }),
    })

    return point.phase === 'down' || Option.getOrNull(model.color.dragging) === point.pointer
      ? emit(colorEmit(color, modifyFields(color.hsv, { s: () => s, v: () => 1 - y })))
      : { model: modifyFields(model, { color: () => color }) }
  }),
  SquareKey: ColorPickerBlock.makeStep((model, { key, shift }: typeof Message.SquareKey.Type) => {
    const step = shift ? 0.1 : 0.01
    const { hsv } = model.color

    return emit(
      colorEmit(model.color, {
        ...hsv,
        s: clamp01(
          hsv.s +
            Match.value(key).pipe(
              Match.when('ArrowRight', () => step),
              Match.when('ArrowLeft', () => -step),
              Match.orElse(() => 0),
            ),
        ),
        v: clamp01(
          hsv.v +
            Match.value(key).pipe(
              Match.when('ArrowUp', () => step),
              Match.when('ArrowDown', () => -step),
              Match.orElse(() => 0),
            ),
        ),
      }),
    )
  }),
  FieldFocus: ColorPickerBlock.makeStep((model, { channel }: typeof Message.FieldFocus.Type) => {
    if (Option.isSome(model.color.scrub)) {
      return { model }
    }

    const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)

    return {
      model: modifyFields(model, {
        color: (currentColor) =>
          modifyFields(currentColor, {
            editing: () => Option.some(channel),
            drafts: () =>
              Record.set(
                currentColor.drafts,
                channel,
                !spec || channel === 'hex'
                  ? (spec?.value ?? '')
                  : displayColorNumber(spec.value, spec.percent, currentColor.numberDisplay),
              ),
          }),
      }),
    }
  }),
  FieldDraft: ColorPickerBlock.makeStep(
    (model, { channel, value }: typeof Message.FieldDraft.Type) => ({
      model: modifyFields(model, {
        color: (currentColor) =>
          modifyFields(currentColor, {
            drafts: (currentDrafts) => Record.set(currentDrafts, channel, value),
          }),
      }),
    }),
  ),
  FieldBlur: ColorPickerBlock.makeStep(
    (model, { channel, value }: typeof Message.FieldBlur.Type) => {
      if (Option.getOrNull(model.color.editing) !== channel) {
        return { model }
      }

      const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)

      const next = modifyFields(model, {
        color: (currentColor) =>
          modifyFields(currentColor, { editing: () => Option.none<typeof Channel.Type>() }),
      })

      return value === spec?.value ? { model: next } : commitChannel(next, channel, value)
    },
  ),
  FieldAutofill: ColorPickerBlock.makeStep(
    (model, { channel, value }: typeof Message.FieldAutofill.Type) =>
      commitChannel(model, channel, value),
  ),
  FieldKey: ColorPickerBlock.makeStep(
    (model, { channel, key, shift, alt, numeric }: typeof Message.FieldKey.Type) => {
      if (key === 'Enter' || key === 'Escape') {
        return {
          model:
            key === 'Escape'
              ? modifyFields(model, {
                  color: (currentColor) =>
                    modifyFields(currentColor, { editing: () => Option.none() }),
                })
              : model,
          commands: [Field({ id: model.color.id, channel, operation: 'blur' })],
        }
      }

      const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)

      if (!spec || channel === 'hex') {
        return { model }
      }

      const raw = model.color.drafts[channel] ?? spec.value

      if (
        !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key) ||
        (spec.wrap && ['Home', 'End'].includes(key))
      ) {
        return { model }
      }

      const number =
        numeric ??
        (Number.isFinite(parseChannelDisplay(raw))
          ? parseChannelDisplay(raw)
          : parseChannelDisplay(spec.value))

      const next = Match.value(key).pipe(
        Match.when('Home', () => spec.min),
        Match.when('End', () => spec.max),
        Match.orElse(
          () =>
            number +
            (key === 'ArrowDown' || key === 'PageDown' ? -1 : 1) *
              channelStep(alt === true, shift || key.startsWith('Page'), spec.step, spec.largeStep),
        ),
      )

      return commitChannel(model, channel, String(next))
    },
  ),
  FieldWheel: ColorPickerBlock.makeStep(
    (model, { channel, delta, shift, alt }: typeof Message.FieldWheel.Type) => {
      const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)

      return spec && channel !== 'hex'
        ? commitChannel(
            model,
            channel,
            String(
              parseChannelDisplay(spec.value) +
                (delta < 0 ? 1 : -1) * channelStep(alt === true, shift, spec.step, spec.largeStep),
            ),
          )
        : { model }
    },
  ),
  ScrubDown: ColorPickerBlock.makeStep(
    (model, { channel, pointer, x, y, scale, cursor }: typeof Message.ScrubDown.Type) => {
      if (Option.isSome(model.color.scrub)) {
        return { model }
      }

      const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)

      return {
        model: modifyFields(model, {
          color: (currentColor) =>
            modifyFields(currentColor, {
              scrubCursor: () =>
                Option.some({
                  x: x - 12,
                  y: (y ?? 7) - 7,
                  scale: scale ?? 1,
                  visible: cursor ?? true,
                }),
              scrub: () =>
                Option.some({
                  channel,
                  pointer,
                  start: x,
                  value: parseChannelDisplay(spec?.value ?? '0'),
                  movement: 0,
                  moved: false,
                }),
            }),
        }),
      }
    },
  ),
  ScrubMove: ColorPickerBlock.makeStep(
    (
      model,
      {
        pointer,
        x,
        movement,
        locked,
        shift,
        alt,
        movementY,
        left,
        top,
        right,
        bottom,
        scale,
      }: typeof Message.ScrubMove.Type,
    ) => {
      const scrub = Option.getOrNull(model.color.scrub)

      if (!scrub || scrub.pointer !== pointer) {
        return { model }
      }

      const spec = channelSpecs(model.color).find(
        (candidate) => candidate.channel === scrub.channel,
      )

      if (!spec || scrub.channel === 'hex') {
        return { model }
      }

      const total = locked ? scrub.movement + movement : x - scrub.start
      const delta = locked ? movement : total - scrub.movement

      if (!scrub.moved && Math.abs(total) < 1) {
        return { model }
      }

      const cursor = Option.getOrNull(model.color.scrubCursor)

      const color = modifyFields(model.color, {
        scrubCursor: () =>
          cursor
            ? Option.some({
                ...cursor,
                x: wrapScrubCursor(
                  Math.round(cursor.x + movement),
                  12,
                  left ?? 0,
                  right ?? Number.MAX_SAFE_INTEGER,
                ),
                y: wrapScrubCursor(
                  Math.round(cursor.y + (movementY ?? 0)),
                  7,
                  top ?? 0,
                  bottom ?? Number.MAX_SAFE_INTEGER,
                ),
                scale: scale ?? cursor.scale,
              })
            : Option.none(),
        scrub: () => Option.some({ ...scrub, movement: total, moved: true }),
      })

      const result = colorChannel(
        color,
        scrub.channel,
        boundChannel(
          parseChannelDisplay(spec.value) +
            delta * channelStep(alt === true, shift, spec.step, spec.largeStep),
          spec,
        ),
      )

      return emit(result, valueEvents(result), [])
    },
  ),
  ScrubLock: ColorPickerBlock.makeStep((model, { locked }: typeof Message.ScrubLock.Type) => ({
    model: modifyFields(model, {
      color: (currentColor) =>
        modifyFields(currentColor, {
          scrubCursor: (currentScrubCursor) =>
            currentScrubCursor.pipe(Option.map((cursor) => ({ ...cursor, visible: locked }))),
        }),
    }),
  })),
  ScrubUp: ColorPickerBlock.makeStep((model, { pointer }: typeof Message.ScrubUp.Type) => {
    const scrub = Option.getOrNull(model.color.scrub)

    return !scrub || scrub.pointer !== pointer
      ? { model }
      : {
          model: modifyFields(model, {
            color: (currentColor) =>
              modifyFields(currentColor, {
                scrub: () => Option.none(),
                scrubCursor: () => Option.none(),
              }),
          }),
        }
  }),
  Pressed: ColorPickerBlock.makeStep((model, { pressed }: typeof Message.Pressed.Type) => ({
    model: modifyFields(model, {
      color: (currentColor) => modifyFields(currentColor, { pressed: () => pressed }),
    }),
  })),
  CompletedField: ColorPickerBlock.makeStep((model) => ({ model })),
  Unmounted: ColorPickerBlock.makeStep((model) => ({
    model: modifyFields(model, {
      color: (currentColor) =>
        modifyFields(currentColor, {
          mounted: () => false,
          dragging: () => Option.none(),
          editing: () => Option.none(),
          scrub: () => Option.none(),
          scrubCursor: () => Option.none(),
          squareHovered: () => false,
          squareFocused: () => false,
          cursor: () => Option.none(),
          pressed: () => false,
        }),
    }),
  })),
})

export { inMessageUpdate } from './color-picker-configuration.js'
