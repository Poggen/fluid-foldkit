import { Schema } from 'effect'

export const accordionAppearanceProperty = 'shape'

export const AccordionFixtureCase = Schema.Struct({
  hoverMode: Schema.optionalKey(Schema.Literals(['fluid', 'standard'])),
  [accordionAppearanceProperty]: Schema.optionalKey(Schema.Literals(['rounded', 'pill', 'sharp'])),
  size: Schema.optionalKey(Schema.Literals(['default', 'compact'])),
  type: Schema.optionalKey(Schema.Literals(['single', 'multiple'])),
  highlight: Schema.optionalKey(Schema.Literals(['item', 'trigger'])),
  collapsible: Schema.optionalKey(Schema.Boolean),
  controlled: Schema.optionalKey(Schema.Boolean),
  callback: Schema.optionalKey(Schema.Boolean),
  omitToolbar: Schema.optionalKey(Schema.Boolean),
  customIds: Schema.optionalKey(Schema.Boolean),
  noItemsHint: Schema.optionalKey(Schema.Boolean),
  scale: Schema.optionalKey(Schema.Finite),
  firstValue: Schema.optionalKey(Schema.String),
})

export type AccordionFixtureCase = typeof AccordionFixtureCase.Type

export const accordionCase = (query: URLSearchParams): AccordionFixtureCase => {
  const scale = Number(query.get('scale') ?? 1)

  return {
    firstValue: query.get('firstValue') ?? 'first',
    [accordionAppearanceProperty]:
      query.get('shape') === 'sharp' ? 'sharp' : query.get('shape') === 'pill' ? 'pill' : 'rounded',
    hoverMode: (query.get('hoverMode') ?? query.get('hover')) === 'standard' ? 'standard' : 'fluid',
    size: query.get('size') === 'compact' ? 'compact' : 'default',
    type: query.get('type') === 'multiple' ? 'multiple' : 'single',
    highlight: query.get('highlight') === 'trigger' ? 'trigger' : 'item',
    collapsible: query.get('collapsible') !== '0',
    controlled: query.get('controlled') === '1',
    callback: query.get('callback') === '1',
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
    noItemsHint: query.get('noItemsHint') === '1',
    customIds: query.get('customIds') === '1',
  }
}
