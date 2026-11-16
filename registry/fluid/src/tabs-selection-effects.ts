// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Option, Schema } from 'effect'
import * as Render from 'foldkit/render'
import { TabsBlock, Message } from './tabs-definition.js'
import { captureTabsRoot, acceptedSelectionTabStop, TabsObserverRoots } from './tabs-observer.js'

export const SynchronizeSelection = TabsBlock.makeCommand('SynchronizeSelection', {
  args: { id: Schema.String, selectedIndex: Schema.Int, generation: Schema.Natural },
  messages: [Message.ObservedSelectionTabStop],
  *handler() {
    const roots = yield* TabsObserverRoots

    return ({ id, selectedIndex, generation }) =>
      Effect.gen(function* synchronizeSelection() {
        const root = captureTabsRoot(roots, id)
        yield* Render.afterCommit

        const index =
          root !== null && root.isCurrent()
            ? acceptedSelectionTabStop(root.element, selectedIndex)
            : null

        return Message.ObservedSelectionTabStop({
          selectedIndex,
          generation,
          index: Option.fromNullishOr(index),
        })
      })
  },
})
