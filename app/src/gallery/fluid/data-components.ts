import { Option } from 'effect'
import { CodeBlockExampleBlock } from '../../../../registry/fluid/examples/src/code-block-example-block'
import { ContextMenuExampleBlock } from '../../../../registry/fluid/examples/src/context-menu-example-block'
import { DataTableExampleBlock } from '../../../../registry/fluid/examples/src/data-table-example-block'
import { FluidGalleryBlock, type FluidGalleryFlags } from './block'

export const CodeBlockExample = FluidGalleryBlock.makeOptionalFieldBinding(CodeBlockExampleBlock, {
  field: 'codeBlockExample',
  init: {
    contextToArgs: (flags: typeof FluidGalleryFlags.Type) =>
      flags.componentSlug === undefined || flags.componentSlug === 'code-block'
        ? Option.some(['preview-code-block'] as const)
        : Option.none(),
  },
})
export const ContextMenuExample = FluidGalleryBlock.makeOptionalFieldBinding(
  ContextMenuExampleBlock,
  {
    field: 'contextMenuExample',
    init: {
      contextToArgs: (flags: typeof FluidGalleryFlags.Type) =>
        flags.componentSlug === undefined || flags.componentSlug === 'context-menu'
          ? Option.some(['preview-context-menu'] as const)
          : Option.none(),
    },
  },
)
export const DataTableExample = FluidGalleryBlock.makeOptionalFieldBinding(DataTableExampleBlock, {
  field: 'dataTableExample',
  init: {
    contextToArgs: (flags: typeof FluidGalleryFlags.Type) =>
      flags.componentSlug === undefined || flags.componentSlug === 'data-table'
        ? Option.some([
            'preview-data-table',
            flags.componentSlug === 'data-table' ? 'catalogue' : 'showcase',
          ] as const)
        : Option.none(),
  },
})
export const dataComponentBindings = [CodeBlockExample, ContextMenuExample, DataTableExample]
