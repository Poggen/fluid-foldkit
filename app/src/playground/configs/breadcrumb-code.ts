import { dropdownIndex, visibleItems, type Configuration } from './breadcrumb'

export const breadcrumbCode = (configuration: Configuration) => {
  const items = visibleItems(configuration)
  return `import { BreadcrumbBlock, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbButton, BreadcrumbEllipsis } from '@foldkit-visuals/fluid/breadcrumb'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

// Register these bindings once on your page's existing Composition.
const Trail = Page.makeRequiredFieldBinding(BreadcrumbBlock, {
  field: 'trail',
  init: { contextToArgs: () => [{ id: 'trail', count: ${items.length}, collapse: ${JSON.stringify(configuration.collapse)} }] },
})
const Menu = Page.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'menu', init: { contextToArgs: () => [{ id: 'trail-menu' }] },
})
const HiddenMenu = Page.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'hiddenMenu', init: { contextToArgs: () => [{ id: 'trail-hidden' }] },
})
const items = ${JSON.stringify(items, null, 2)}
const dropdownIndex = ${dropdownIndex(configuration)}
const sections = ['Drafts', 'Published', 'Archive']

Trail.embedView({
  slotId: 'trail', model: model.trail,
  viewInputs: {
    context, animate,
    ${configuration.separator === 'slash' ? "separator: '/'," : '// The default separator is the chevron icon.'}
    content: crumbs => [BreadcrumbList({
      children: items.flatMap((item, index) => {
        if (index > 0 && index <= crumbs.hiddenCount) return []
        const children = [${configuration.icons ? 'defaultIcons[item.icon]({}, h), ' : ''}item.label]
        const content = index === items.length - 1
          ? BreadcrumbPage({ id: item.id, children }, crumbs, h)
          : index === dropdownIndex
            ? h.block(Menu.embedView({ slotId: 'menu', model: model.menu, viewInputs: {
                context, animate, openOnHover: ${configuration.openOnHover},
                trigger: attributes => BreadcrumbButton({ id: item.id, attributes, children }, crumbs, h),
                content: menu => sections.map((label, index) => DropdownItem({ index, label, animate }, menu, h)),
              } }))
            : BreadcrumbLink({ id: item.id, href: '#', children }, crumbs, h)
        const hidden = index === 0 && crumbs.hiddenCount > 0
          ? ${
            configuration.reveal === 'expand'
              ? 'crumbs.toggle()'
              : `h.block(HiddenMenu.embedView({ slotId: 'hidden', model: model.hiddenMenu, viewInputs: {
              context, animate, openOnHover: ${configuration.openOnHover},
              trigger: attributes => BreadcrumbButton({ id: 'hidden-trigger', attributes, children: [BreadcrumbEllipsis({}, h)] }, crumbs, h),
              content: menu => items.slice(1, 1 + crumbs.hiddenCount).map((item, index) => DropdownItem({ index, label: item.label, animate }, menu, h)),
            } }))`
          }
          : undefined
        return [BreadcrumbItem({ children: [content] }, h), ...(hidden === undefined ? [] : [BreadcrumbItem({ children: [hidden] }, h)])]
      }),
    }, h)],
  },
})`
}
