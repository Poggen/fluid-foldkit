import { VirtualList } from '@foldkit/ui'
import type { CommandMenuItem } from './command-menu-contracts.js'

export const CommandResultsBlock = VirtualList.makeBlock<CommandMenuItem>()
export const commandGroupKey = (heading: string | undefined) =>
  heading === undefined ? 'ungrouped' : `group:${heading}`
export const commandGroups = (rows: ReadonlyArray<CommandMenuItem>) => {
  const groups = new Map<string | undefined, CommandMenuItem[]>()
  for (const item of rows) {
    const group = groups.get(item.group)
    if (group === undefined) groups.set(item.group, [item])
    else group.push(item)
  }
  return groups
}
