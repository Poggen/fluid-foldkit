import { Schema } from 'effect'
import type { Html } from 'foldkit/html'

export type LegendContent =
  | Html
  | string
  | number
  | bigint
  | boolean
  | undefined
  | ReadonlyArray<LegendContent>

const isText = Schema.is(Schema.String)

const isNumber = Schema.is(Schema.Number)

const isBigInt = Schema.is(Schema.BigInt)

const isBoolean = Schema.is(Schema.Boolean)

const isArray = Schema.is(Schema.Array(Schema.Unknown))

const isLegendFragment = (value: LegendContent): value is ReadonlyArray<LegendContent> =>
  isArray(value)

/** Native fragments retain text-node structure instead of adding wrapper elements. */
export function legendChildren(content: LegendContent): ReadonlyArray<Html | string> {
  if (content === undefined || content === null || isBoolean(content)) {
    return []
  }

  if (isNumber(content) || isBigInt(content)) {
    return [String(content)]
  }

  if (isText(content)) {
    return [content]
  }

  if (isLegendFragment(content)) {
    return content.flatMap(legendChildren)
  }

  return [content]
}
