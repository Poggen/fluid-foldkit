import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { FluidGalleryBlock } from './block'
import { CodeBlockExample, ContextMenuExample, DataTableExample } from './data-components'
import type { Configuration as CodeConfiguration } from '../../playground/configs/code-block'
import type { Configuration as ContextConfiguration } from '../../playground/configs/context-menu'
import type { Configuration as DataConfiguration } from '../../playground/configs/data-table'

export const reconcileDataComponent = (
  configuration: CodeConfiguration | ContextConfiguration | DataConfiguration,
) =>
  FluidGalleryBlock.makeStep(() =>
    Update.combineSteps([
      FluidGalleryBlock.makeStep((model) =>
        configuration._tag === 'code-block' && Option.isNone(model.codeBlockExample)
          ? CodeBlockExample.init({
              args: ['preview-code-block'],
              toParentModel: (child) =>
                modifyFields(model, { codeBlockExample: () => Option.some(child) }),
            })
          : configuration._tag === 'context-menu' && Option.isNone(model.contextMenuExample)
            ? ContextMenuExample.init({
                args: ['preview-context-menu'],
                toParentModel: (child) =>
                  modifyFields(model, { contextMenuExample: () => Option.some(child) }),
              })
            : configuration._tag === 'data-table' && Option.isNone(model.dataTableExample)
              ? DataTableExample.init({
                  args: ['preview-data-table', 'catalogue'],
                  toParentModel: (child) =>
                    modifyFields(model, { dataTableExample: () => Option.some(child) }),
                })
              : { model },
      ),
      ...(configuration._tag === 'code-block'
        ? [CodeBlockExample.requestCode({ code: configuration.code })]
        : configuration._tag === 'context-menu'
          ? [ContextMenuExample.requestDisabled({ disabled: configuration.disabled })]
          : configuration._tag === 'data-table'
            ? [
                DataTableExample.requestOptions({
                  pageSize: configuration.pageSize,
                  pagination: configuration.pagination,
                  selectable: configuration.selectable,
                  editable: configuration.editable,
                  searchMode: configuration.searchMode,
                  wrap: configuration.wrap,
                }),
              ]
            : []),
    ]),
  )
