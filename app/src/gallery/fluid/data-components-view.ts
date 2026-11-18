import { Match, Option } from 'effect'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { CodeBlockExample, ContextMenuExample, DataTableExample } from './data-components'
import type { ComponentPresentation } from '../../settings'
import { presentation } from '../../settings'
import type { Configuration as CodeConfiguration } from '../../playground/configs/code-block'
import type { Configuration as ContextConfiguration } from '../../playground/configs/context-menu'
import type { Configuration as DataConfiguration } from '../../playground/configs/data-table'
import { defaults as codeDefaults } from '../../playground/configs/code-block'
import { defaults as contextDefaults } from '../../playground/configs/context-menu'
import { defaults as dataDefaults } from '../../playground/configs/data-table'

export const renderDataComponent = (
  model: FluidGalleryModel,
  configuration: CodeConfiguration | ContextConfiguration | DataConfiguration,
  settings: ComponentPresentation,
  h: FluidViewBuilder,
) => {
  const appearance = { context: presentation({ ...settings, ...configuration.appearance }) }
  return Match.value(configuration).pipe(
    Match.tagsExhaustive({
      'code-block': (configuration) =>
        Option.isSome(model.codeBlockExample)
          ? h.block(
              CodeBlockExample.embedView({
                slotId: 'code-block-example',
                model: model.codeBlockExample.value,
                viewInputs: {
                  ...appearance,
                  language: configuration.language,
                  title: configuration.title,
                  lineNumbers: configuration.lineNumbers,
                  wrap: configuration.wrap,
                  hideHeader: configuration.hideHeader,
                },
              }),
            )
          : h.empty,
      'context-menu': (configuration) =>
        Option.isSome(model.contextMenuExample)
          ? h.block(
              ContextMenuExample.embedView({
                slotId: 'context-menu-example',
                model: model.contextMenuExample.value,
                viewInputs: {
                  ...appearance,
                  label: configuration.label,
                  showShortcuts: configuration.showShortcuts,
                },
              }),
            )
          : h.empty,
      'data-table': (configuration) =>
        Option.isSome(model.dataTableExample)
          ? h.block(
              DataTableExample.embedView({
                slotId: 'data-table-example',
                model: model.dataTableExample.value,
                viewInputs: {
                  ...appearance,
                  ...configuration,
                  savedViews: configuration.savedViews && configuration.filters,
                  selectionBar: configuration.selectionBar && configuration.selectable,
                },
              }),
            )
          : h.empty,
    }),
  )
}
export const dataComponentDemos = (
  model: FluidGalleryModel,
  settings: ComponentPresentation,
  h: FluidViewBuilder,
) => ({
  'code-block': () => renderDataComponent(model, codeDefaults, settings, h),
  'context-menu': () => renderDataComponent(model, contextDefaults, settings, h),
  'data-table': () =>
    renderDataComponent(
      model,
      {
        ...dataDefaults,
        title: 'Components',
        showTitle: false,
        search: true,
        searchMode: 'name',
        filters: false,
        savedViews: false,
        viewOptions: true,
        editable: false,
        resizableColumns: false,
        rowReorder: false,
        reorderColumns: true,
        selectionBar: false,
      },
      settings,
      h,
    ),
})
