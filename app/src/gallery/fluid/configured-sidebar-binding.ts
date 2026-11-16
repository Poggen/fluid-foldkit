import { Option } from 'effect'
import { initAndSet } from 'foldkit/binding'
import { FluidGalleryBlock } from './block'
import { ConfiguredSidebarBlock } from './blocks'

export const ConfiguredSidebarBinding = FluidGalleryBlock.makeOptionalFieldBinding(
  ConfiguredSidebarBlock,
  {
    field: 'configuredSidebar',
  },
)

export const admitConfiguredSidebar = FluidGalleryBlock.makeStep((model) =>
  Option.isSome(model.configuredSidebar)
    ? { model }
    : initAndSet(ConfiguredSidebarBinding, model, { args: [] }),
)
