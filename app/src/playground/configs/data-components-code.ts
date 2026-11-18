import type { Configuration as CodeConfiguration } from './code-block'
import type { Configuration as ContextConfiguration } from './context-menu'
import type { Configuration as DataConfiguration } from './data-table'

export const dataComponentCode = (
  configuration: CodeConfiguration | ContextConfiguration | DataConfiguration,
) => {
  const component =
    configuration._tag === 'code-block'
      ? 'CodeBlock'
      : configuration._tag === 'context-menu'
        ? 'ContextMenu'
        : 'DataTable'
  const props =
    configuration._tag === 'code-block'
      ? {
          language: configuration.language,
          title: configuration.title,
          lineNumbers: configuration.lineNumbers,
          wrap: configuration.wrap,
          hideHeader: configuration.hideHeader,
        }
      : configuration._tag === 'context-menu'
        ? { label: configuration.label, showShortcuts: configuration.showShortcuts }
        : Object.fromEntries(
            Object.entries(configuration).filter(
              ([key]) => key !== '_tag' && key !== 'appearance' && key !== 'pageSize',
            ),
          )
  return `import { ${component}ExampleBlock, layer } from './${configuration._tag}-example-block'\n\n// Bind the example once in your parent Block.\nconst Example = Parent.makeRequiredFieldBinding(${component}ExampleBlock, {\n  field: 'example',\n  init: { contextToArgs: () => ['my-${configuration._tag}'${configuration._tag === 'data-table' ? ", 'catalogue'" : ''}] },\n})\nconst Composition = Parent.makeComposition({ bindings: [Example] })\n\n// Provide layer to Parent's construction Layer. Render with the current Model.\nh.block(Example.embedView({\n  slotId: 'example',\n  model: model.example,\n  viewInputs: ${JSON.stringify(props, null, 2)},\n}))${configuration._tag === 'code-block' ? `\n\n// Reconcile the editable source through a native parent operation.\nExample.requestCode({ code: ${JSON.stringify(configuration.code)} })` : configuration._tag === 'context-menu' ? `\n\nExample.requestDisabled({ disabled: ${configuration.disabled} })` : `\n\nExample.requestOptions(${JSON.stringify({ pageSize: configuration.pageSize, pagination: configuration.pagination, selectable: configuration.selectable, editable: configuration.editable, searchMode: configuration.searchMode }, null, 2)})`}`
}
