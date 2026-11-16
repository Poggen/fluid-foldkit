import type { AccordionFixtureCase } from './case.js'

export const initialItems = (config: AccordionFixtureCase) => [
  { value: config.firstValue ?? 'first', index: 0 },
  { value: 'second', index: 1 },
  { value: 'disabled', index: 2, disabled: true },
]

export const initialConfig = (id: string, config: AccordionFixtureCase) => {
  const base = {
    id,
    hoverMode: config.hoverMode ?? 'fluid',
    type: config.type ?? 'single',
    defaultValue:
      config.type === 'multiple' ? [config.firstValue ?? 'first'] : (config.firstValue ?? 'first'),
    onValueChange: config.callback ?? false,
    collapsible: config.collapsible ?? true,
    highlight: config.highlight ?? 'item',
  }

  const declared = config.noItemsHint === true ? base : { ...base, items: initialItems(config) }

  return config.controlled === true
    ? {
        ...declared,
        value:
          config.type === 'multiple'
            ? [config.firstValue ?? 'first']
            : (config.firstValue ?? 'first'),
      }
    : declared
}
