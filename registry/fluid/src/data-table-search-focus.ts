import { Effect, Schema } from 'effect'
import * as Render from 'foldkit/render'
import { DataTableBlock, Message } from './data-table-definition.js'

export const FocusSearch = DataTableBlock.makeCommand('FocusSearch', {
  args: { id: Schema.String, target: Schema.Literals(['input', 'button']) },
  messages: [Message.SearchFocusCompleted],
  *handler() {
    return ({ id, target }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        yield* Effect.sync(() =>
          document
            .getElementById(id)
            ?.querySelector<HTMLElement>(
              target === 'input' ? '[data-grid-search-input]' : '[data-grid-search-button]',
            )
            ?.focus({ preventScroll: true }),
        )
        return Message.SearchFocusCompleted()
      })
  },
})
