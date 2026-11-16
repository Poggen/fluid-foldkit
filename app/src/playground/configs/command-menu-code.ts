import type { Configuration } from './command-menu'
import { commandItems } from '../../gallery/fluid/command-data'

export const commandMenuCode = (c: Configuration) => `import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { CommandMenuBlock, CommandMenuLayer, CommandMenuFooter } from '@foldkit-visuals/fluid/command-menu'
import type { CommandMenuItem, CommandMenuViewInputs } from '@foldkit-visuals/fluid/command-menu'
import { CommandMenuDialogBlock, CommandMenuDialogLayer } from '@foldkit-visuals/fluid/command-menu-dialog'
import { CommandMenuTabsBlock, CommandMenuTabsLayer, CommandMenuFilters } from '@foldkit-visuals/fluid/command-menu-tabs'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { Button } from '@foldkit-visuals/fluid/button'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const groups = [{ value: 'all', label: 'All' }, { value: 'Actions', label: 'Actions' }, { value: 'Go to', label: 'Go to' }, { value: 'Help', label: 'Help' }]
const sortItems = [{ value: 'default', label: 'Default' }, { value: 'az', label: 'A to Z' }]
const items: ReadonlyArray<CommandMenuItem> = ${JSON.stringify(
  commandItems.map(({ icon: _icon, description, shortcut, ...item }) => ({
    ...item,
    ...(c.descriptions && description !== undefined ? { description } : {}),
    ...(c.shortcuts && shortcut !== undefined ? { shortcut } : {}),
  })),
  null,
  2,
)}
const icons = { ${commandItems.map((item) => `${JSON.stringify(item.value)}: defaultIcons[${JSON.stringify(item.icon)}]`).join(', ')} }
const motion = createMotionScope('command-menu-example')
const target = createTargetMotionScope('command-menu-target')
const context = createPresentationContext(${JSON.stringify({ shape: c.appearance.shape, size: c.appearance.size, hoverMode: c.appearance.hover, reducedMotion: 'user', hasShapeProvider: true, hasSizeProvider: true })})
const key = Symbol('CommandMenuPage')
export const Page = Block.make('CommandMenuPage', {
  key,
  Model: Schema.Struct({
    menu: CommandMenuBlock.Model,
    dialog: CommandMenuDialogBlock.Model,
    ${c.tabs ? 'tabs: CommandMenuTabsBlock.Model,' : ''}
    ${c.filters ? 'filter: SelectBlock.Model, sort: SelectBlock.Model,' : ''}
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<never, DropdownResources | DialogResources>(),
  view: { kind: 'Document' },
})
const RawMenu = Page.makeRequiredFieldBinding(CommandMenuBlock, { field: 'menu', init: { contextToArgs: () => [{ id: 'commands', items }] } })
const Menu = RawMenu.withOutMessagePolicy({ fold: Page.makeOutMessageFold(CommandMenuBlock, {
  Selected: Page.makeNoopStep,
  QueryChanged: () => reconcile(),
}) })
const RawDialog = Page.makeRequiredFieldBinding(CommandMenuDialogBlock, { field: 'dialog', init: { contextToArgs: () => [{ id: 'commands', items, shortcut: ${JSON.stringify(c.shortcut)} }] } })
const Dialog = RawDialog.withOutMessagePolicy({ fold: Page.makeOutMessageFold(CommandMenuDialogBlock, {
  OpenChanged: Page.makeNoopStep,
  Selected: Page.makeNoopStep,
  QueryChanged: () => reconcile(),
}) })
${
  c.tabs
    ? `const RawTabs = Page.makeRequiredFieldBinding(CommandMenuTabsBlock, { field: 'tabs', init: { contextToArgs: () => [{ id: 'command-tabs', inputId: 'commands-input', tabs: groups, value: 'all' }] } })
const Tabs = RawTabs.withOutMessagePolicy({ fold: Page.makeOutMessageFold(CommandMenuTabsBlock, {
  ValueChanged: ({ value }) => Page.makeStep(() => Update.combineSteps([
    RawTabs.requestConfigureValue({ value }), reconcile(),
  ])),
}) })`
    : ''
}
${
  c.filters
    ? `const RawFilter = Page.makeRequiredFieldBinding(SelectBlock, { field: 'filter', init: { contextToArgs: () => [{ id: 'command-filter', items: groups, value: 'all' }] } })
const Filter = RawFilter.withOutMessagePolicy({ fold: Page.makeOutMessageFold(SelectBlock, {
  Selected: ({ value }) => Page.makeStep(() => Update.combineSteps([
    RawFilter.requestConfigure({ items: groups, value }), reconcile(),
  ])),
  OpenChanged: Page.makeNoopStep,
}) })
const RawSort = Page.makeRequiredFieldBinding(SelectBlock, { field: 'sort', init: { contextToArgs: () => [{ id: 'command-sort', items: sortItems, value: 'default' }] } })
const Sort = RawSort.withOutMessagePolicy({ fold: Page.makeOutMessageFold(SelectBlock, {
  Selected: ({ value }) => Page.makeStep(() => Update.combineSteps([
    RawSort.requestConfigure({ items: sortItems, value }), reconcile(),
  ])),
  OpenChanged: Page.makeNoopStep,
}) })`
    : ''
}
const rows = (model: typeof Page.Model.Type, query: string) => {
  const filtered = items.filter((item) => ${c.tabs ? "(model.tabs.value === 'all' || item.group === model.tabs.value)" : 'true'} && ${c.filters ? "(model.filter.value === 'all' || item.group === model.filter.value)" : 'true'})
  ${c.filters ? "if (model.sort.value === 'az') filtered.sort((a, b) => a.label.localeCompare(b.label))" : ''}
  ${
    c.suggestions
      ? `if (query !== '') return filtered
  const suggested = ['new-file', 'search', 'settings']
  return [
    ...filtered.filter((item) => suggested.includes(item.value)).map((item) => ({ ...item, group: 'Suggestions' })),
    ...filtered.filter((item) => !suggested.includes(item.value)),
  ]`
      : 'return filtered'
  }
}
const reconcile = () => Page.makeStep((model) => Update.combineSteps([
  RawMenu.requestConfigure({ items: rows(model, model.menu.query), query: Option.none() }),
  RawDialog.requestConfigure({ items: rows(model, model.dialog.menu.query), query: Option.none() }),
]))
const checkedBindings = [Menu, Dialog${c.tabs ? ', Tabs' : ''}${c.filters ? ', Filter, Sort' : ''}] as const
const Composition = Page.makeComposition({ bindings: checkedBindings })
export const layer = Page.makeLayer({
  init: Composition.makeInit(() => ({ model: {}, steps: [reconcile()] })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => {
    ${
      c.filters
        ? `const filters = (ambientContext: PresentationContext, inTabsRow: boolean) => CommandMenuFilters({
      context: ambientContext, inTabsRow,
      children: (filterContext) => [
        h.block(Filter.embedView({ slotId: 'command-filter', model: model.filter,
          viewInputs: { context: filterContext, animate: target.node, variant: 'borderless', ariaLabel: 'Filter commands', placeholder: 'Filter' } })),
        h.block(Sort.embedView({ slotId: 'command-sort', model: model.sort,
          viewInputs: { context: filterContext, animate: target.node, variant: 'borderless', ariaLabel: 'Sort commands', placeholder: 'Sort' } })),
      ],
    }, h)`
        : ''
    }
    const viewInputs: CommandMenuViewInputs = {
      context, animate: motion.node, placeholder: ${JSON.stringify(c.placeholder)},
      itemIconFor: (item) => Object.entries(icons).find(([value]) => value === item.value)?.[1],
      ${
        c.tabs
          ? `header: () => h.div([h.Class('flex items-center gap-2 border-b border-border')], [h.block(Tabs.embedView({ slotId: 'command-tabs', model: model.tabs,
        viewInputs: { context, animate: motion.node${c.filters ? ', filters: (tabsContext) => filters(tabsContext, true)' : ''} } }))]),`
          : c.filters
            ? "header: () => h.div([h.Class('flex items-center gap-2 border-b border-border')], [filters(context, false)]),"
            : ''
      }
    }
    const footer = (inDialog: boolean) => (activeItem: CommandMenuItem | undefined, mac: boolean) =>
      CommandMenuFooter({ context, ...(activeItem === undefined ? {} : { activeItem }), mac, hasTabs: ${c.tabs}, inDialog }, h)
    const dialogVisible = model.dialog.dialog.mounted && model.dialog.dialog.phase !== 'Closed'
    return { title: 'Command menu', body: h.main([], [
      dialogVisible ? null : h.block(Menu.embedView({ slotId: 'menu', model: model.menu,
        viewInputs: { ...viewInputs${c.footer ? ', footer: footer(false)' : ''} } })),
      h.block(Dialog.embedView({ slotId: 'dialog', model: model.dialog,
        viewInputs: { ...viewInputs, title: 'Command menu',
          trigger: (attributes) => Button({ context, variant: 'ghost', attributes, children: ['Open command menu'] }, h)${c.footer ? ', footer: footer(true)' : ''} } })),
    ]) }
  }),
}).pipe(Layer.provide(Layer.mergeAll(CommandMenuLayer, CommandMenuDialogLayer, CommandMenuTabsLayer, SelectLayer, motion.layer, target.layer)))`
