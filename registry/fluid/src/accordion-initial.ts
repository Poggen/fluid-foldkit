// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { accordionValues, accordionItems } from './accordion-state.js'
import type { AccordionConfig, AccordionState } from './accordion-state.js'

export const initializeAccordion = (
  config: AccordionConfig,
): { readonly childInitContext: AccordionConfig; readonly model: AccordionState } => {
  const values = accordionValues(config.value ?? config.defaultValue)

  return {
    childInitContext: config,
    model: {
      id: config.id,
      type: config.type ?? 'single',
      grouped: config.grouped ?? false,
      controlled: config.value !== undefined,
      callback: config.onValueChange ?? false,
      collapsible: config.collapsible ?? true,
      disabled: config.disabled ?? false,
      disabledTriggers: [],
      orientation: config.orientation ?? 'vertical',
      direction: config.direction ?? 'ltr',
      loopFocus: config.loopFocus ?? true,
      highlight: config.highlight ?? 'item',
      values,
      internalSingleValue:
        (config.type ?? 'single') === 'single'
          ? (accordionValues(config.defaultValue)[0] ?? '')
          : '',
      internalMultipleValues:
        config.type === 'multiple' ? accordionValues(config.defaultValue) : [],
      items: accordionItems(
        (config.items ?? []).map((item) => ({
          value: item.value,
          index: item.index ?? null,
          disabled: item.disabled ?? false,
          highlight: item.highlight ?? 'item',
        })),
        values,
        [],
        0,
      ),
      layout: [],
      tints: config.grouped
        ? []
        : values.map((value) => ({
            value,
            rect: { top: 0, left: 0, width: 0, height: 0 },
            present: true,
            generation: 0,
          })),
      hovered: [],
      focusTint: null,
      pointerValue: null,
      focusedValue: null,
      focusVisible: false,
      generation: 0,
      reduceMotion: false,
    },
  }
}
