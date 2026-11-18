import { Schema, SchemaTransformation } from 'effect'
import { Side } from './domain.js'

const Offset = Schema.Union([Schema.Literal('-0'), Schema.toCodecJson(Schema.Number)]).pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transform({
      decode: (value: number | '-0') => (value === '-0' ? -0 : value),
      encode: (value: number) => (Object.is(value, -0) ? '-0' : value) satisfies number | '-0',
    }),
  ),
)
export const PopupPresentation = Schema.Struct({
  side: Side,
  sideOffset: Offset,
  followCursor: Schema.Literals(['none', 'x', 'y']),
})
export const POPUP_PRESENTATION_ATTRIBUTE = 'data-tooltip-presentation'
const Json = Schema.fromJsonString(PopupPresentation)
export const encodePopupPresentation = Schema.encodeSync(Json)
const decodePresentation = Schema.decodeUnknownOption(Json)

export const readPopupPresentation = (element: Element) =>
  decodePresentation(element.getAttribute(POPUP_PRESENTATION_ATTRIBUTE))
