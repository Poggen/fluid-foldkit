import type { Configuration } from './combobox'
export const comboboxCode = (
  c: Configuration,
) => `import { ComboboxBlock } from '@foldkit-visuals/fluid/combobox'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const items = [{ value: 'button', label: 'Button' }, { value: 'combobox', label: 'Combobox' }, { value: 'card', label: 'Card' }]
const ComponentsRequests = Page.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'components', init: { contextToArgs: () => [{ id: 'components', items, multiple: ${c.multiple}, disabled: ${c.disabled}, hideSelected: ${c.multiple && c.hideSelected}, allowCreate: ${c.creatable}, defaultValue: ${c.multiple ? "['button', 'combobox']" : "''"} }] },
})
const Components = ComponentsRequests.withOutMessagePolicy({ fold: Page.makeOutMessageFold(ComboboxBlock, {
  Selected: Page.makeNoopStep,
  ValuesChanged: Page.makeNoopStep,
  CreateRequested: ${c.creatable ? "({ query }) => ComponentsRequests.requestAcceptCreated({ item: { value: query.toLowerCase().replace(/\\s+/gu, '-'), label: query } })" : 'Page.makeNoopStep'},
}) })

Components.embedView({ slotId: 'components', model: model.components, viewInputs: {
  context, animate, placeholder: ${JSON.stringify(c.placeholder)}, variant: '${c.variant}', clearable: ${c.clearable},
  ${c.icon ? 'icon: defaultIcons.search,' : ''}
  ${c.error ? "error: 'Choose at least one component.'," : ''}
  emptyText: 'No component found.', allSelectedText: 'All components selected.', ariaLabel: 'Components',
} })`
