// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import type { SelectConfig } from './block.js'
import { SelectComposition } from './composition.js'

export const init = SelectComposition.makeInit((config: SelectConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    items: config.items,
    value: config.value ?? config.defaultValue ?? '',
    initialValue: config.defaultValue ?? '',
    controlled: config.value !== undefined,
    disabled: config.disabled ?? false,
    acknowledgement: 0,
    search: '',
    searchGeneration: 0,
  },
}))
