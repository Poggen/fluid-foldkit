import { items, type Configuration } from './dropdown'
export const dropdownCode = (
  c: Configuration,
) => `import { ${c.mode === 'menu' ? 'DropdownMenuBlock' : 'DropdownBlock'}, DropdownSubBlock } from '@foldkit-visuals/fluid/dropdown'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { DropdownSearch, DropdownLabel, DropdownSeparator } from '@foldkit-visuals/fluid/dropdown-parts'
import { DropdownSubTrigger } from '@foldkit-visuals/fluid/dropdown-sub'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const items = ${JSON.stringify(items)}
const Menu = Page.makeRequiredFieldBinding(${c.mode === 'menu' ? 'DropdownMenuBlock' : 'DropdownBlock'}, { field: 'menu', init: { contextToArgs: () => [{ id: 'settings', disabled: ${c.disabled}${c.selection === 'single' ? ', checkedIndex: 0' : c.selection === 'multiple' ? ', checkedIndices: [0, 1]' : ''} }] } })
${c.submenu && c.mode === 'menu' ? "const Theme = Page.makeRequiredFieldBinding(DropdownSubBlock, { field: 'theme', init: { contextToArgs: () => [{ id: 'theme', rootId: 'settings', parentId: 'settings', checkedIndex: 2 }] } })" : ''}
const rows = ${c.search && c.mode === 'menu' ? 'items.filter(item => item.label.toLowerCase().includes(model.query.toLowerCase()))' : 'items'}
Menu.embedView({ slotId: 'menu', model: model.menu, viewInputs: {
  context, animate, openOnHover: ${c.openOnHover}, side: '${c.side}', align: '${c.align}',
  ${c.mode === 'menu' ? `trigger: attributes => h.button(attributes, [${JSON.stringify(c.label)}]),` : ''}
  content: menu => [
    ${c.search && c.mode === 'menu' ? 'DropdownSearch({ context, value: model.query, onValueChange: value => Message.ChangedQuery({ value }) }, h),' : ''}
    ...rows.flatMap((item, index) => [
      ${c.groups && !c.search ? '...(index === 0 || rows[index - 1].group !== item.group ? [DropdownLabel({ context, children: [item.group] }, h)] : []),' : ''}
      ${c.submenu && c.mode === 'menu' ? "item.value === 'Theme' ? h.block(Theme.embedView({ slotId: 'theme', model: model.theme, viewInputs: { context, animate, trigger: attributes => DropdownSubTrigger({ index, label: 'Theme', animate, attributes }, menu, h), content: sub => ['Light', 'Dark', 'System'].map((label, index) => DropdownItem({ index, label, checked: model.themeName === label, animate }, sub, h)) } })) :" : ''}
      DropdownItem({ index, label: item.label, ${c.icons ? 'icon: defaultIcons[item.icon],' : ''} ${c.selection === 'none' ? '' : 'checked: model.selected.includes(item.value),'} disabled: ${c.disabledRow ? "item.value === 'Privacy'" : 'false'}, closeOnClick: ${c.selection !== 'multiple'}, animate }, menu, h),
    ]),
    ${c.creatable && c.search && c.mode === 'menu' ? "...(model.query.trim() !== '' && !items.some(item => item.label.toLowerCase() === model.query.trim().toLowerCase()) ? [DropdownItem({ index: rows.length, label: `Create “${model.query.trim()}”`, closeOnClick: false, animate }, menu, h)] : [])," : ''}
  ],
} })`
