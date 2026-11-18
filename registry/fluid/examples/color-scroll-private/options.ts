import { Schema } from 'effect'

export const colorScrollOptions: (search?: string) => ColorScrollOptions = function (search = '') {
  const params = new URLSearchParams(search)

  const shape = params.get('shape'),
    size = params.get('size'),
    orientation = params.get('orientation'),
    direction = params.get('direction')

  return {
    shape: Schema.is(Shape)(shape) ? shape : 'rounded',
    hoverMode:
      (params.get('hoverMode') ?? params.get('hover')) === 'standard' ? 'standard' : 'fluid',
    size: Schema.is(Size)(size) ? size : 'default',
    orientation: Schema.is(Orientation)(orientation) ? orientation : 'both',
    direction: Schema.is(Direction)(direction) ? direction : 'ltr',
    lifecycle: params.has('lifecycle'),
    controlled: params.has('controlled'),
    initialOpen: params.has('initialOpen'),
    overflow: !params.has('noOverflow'),
  } satisfies ColorScrollOptions
}

const Shape = Schema.Literals(['rounded', 'pill', 'sharp'])

const Size = Schema.Literals(['default', 'compact'])

const Orientation = Schema.Literals(['vertical', 'horizontal', 'both'])

const Direction = Schema.Literals(['ltr', 'rtl'])

export const ColorScrollOptions = Schema.Struct({
  shape: Shape,
  hoverMode: Schema.optionalKey(Schema.Literals(['fluid', 'standard'])),
  size: Size,
  orientation: Orientation,
  direction: Direction,
  lifecycle: Schema.Boolean,
  controlled: Schema.Boolean,
  initialOpen: Schema.Boolean,
  overflow: Schema.Boolean,
})

export type ColorScrollOptions = typeof ColorScrollOptions.Type
