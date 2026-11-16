import { VirtualList } from '@foldkit/ui'
import { Option } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { commandMenuContract } from './command-menu-definition.js'
import type { CommandMenuItem } from './command-menu-contracts.js'
import { CommandResultsBlock, commandGroups, commandGroupKey } from './command-menu-virtual.js'

export const commandMenuVirtualPlans = <const Key extends symbol>(
  CommandMenuBlock: ReturnType<typeof Block.make<'CommandMenu', Key, typeof commandMenuContract>>,
  rowsFor: (model: typeof commandMenuContract.Model.Type) => ReadonlyArray<CommandMenuItem>,
) => {
  const Lists = CommandMenuBlock.makeRecordBinding(CommandResultsBlock, {
    field: 'virtualLists',
  }).withOutMessagePolicy({
    fold: () =>
      CommandMenuBlock.makeOutMessageFold(CommandResultsBlock, {
        ObservedContainerScroll: CommandMenuBlock.makeNoopStep,
        EndedContainerScroll: CommandMenuBlock.makeNoopStep,
        ApproachedLoadedStart: CommandMenuBlock.makeNoopStep,
      }),
  })
  const synchronizeLists = CommandMenuBlock.makeStep((model) => {
    const groups = model.virtualized
      ? commandGroups(rowsFor(model))
      : new Map<string | undefined, CommandMenuItem[]>()
    const keys = new Set(Array.from(groups.keys(), commandGroupKey))
    return Update.combineSteps([
      CommandMenuBlock.makeFieldsStep(() => ({
        virtualLists: (lists) =>
          Object.fromEntries(Object.entries(lists).filter(([key]) => keys.has(key))),
      })),
      ...Array.from(groups, ([heading, items]) => {
        const key = commandGroupKey(heading)
        return CommandMenuBlock.makeStep((current) =>
          current.virtualLists[key] === undefined
            ? initAndInsert(Lists, current, {
                key,
                args: [
                  {
                    id: `${current.id}-results-${encodeURIComponent(key)}`,
                    rowHeightPx: 32,
                    scrollContainer: VirtualList.ScrollContainer.Ancestor({
                      selector: '[data-slot="scroll-area-viewport"]',
                    }),
                  },
                ],
              })
            : Lists.informOfItemsChanged(
                key,
                items.map((item) => item.value),
              ),
        )
      }),
    ])
  })
  const revealActive = CommandMenuBlock.makeStep((model) => {
    const rows = rowsFor(model)
    const active = Option.getOrNull(model.activeIndex)
    const item = active === null ? undefined : rows[active]
    if (!model.virtualized || item === undefined) return { model }
    const items = commandGroups(rows).get(item.group) ?? []
    return Lists.requestScrollToIndex(commandGroupKey(item.group), items.indexOf(item), {
      alignment: 'Nearest',
    })
  })

  return { Lists, synchronizeLists, revealActive }
}
