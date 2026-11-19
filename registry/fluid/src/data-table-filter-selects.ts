import { DataTableBlock, RawFilterSelects, Message } from './data-table-definition.js'
import { selectedFilter } from './data-table-filter-options.js'
import { dataTableUpdate } from './data-table-update.js'
import { applyDataTableResult } from './data-table-transitions.js'
import type { SelectBlock } from './select.js'

export const FilterSelects = RawFilterSelects.withOutMessagePolicy({
  fold: (key: string, out: typeof SelectBlock.OutMessage.Type) =>
    DataTableBlock.makeStep((model) => {
      const filter = out._tag === 'Selected' ? selectedFilter(model, key, out.value) : undefined
      return filter
        ? applyDataTableResult(dataTableUpdate(model, Message.FilterChanged(filter)))
        : { model }
    }),
})
