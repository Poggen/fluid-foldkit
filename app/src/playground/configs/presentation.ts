import { Schema } from 'effect'

export const Appearance = Schema.Struct({
  shape: Schema.optionalKey(Schema.Literals(['sharp', 'rounded', 'pill'])),
  size: Schema.optionalKey(Schema.Literals(['default', 'compact'])),
  hover: Schema.optionalKey(Schema.Literals(['fluid', 'standard'])),
})
export type Appearance = typeof Appearance.Type
