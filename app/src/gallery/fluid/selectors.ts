import { Option } from 'effect'
import type { FluidGalleryModel } from './block'
import { configuredSidebarIsOpen } from './blocks'

export const configuredSidebarOpen: (model: FluidGalleryModel) => Option.Option<boolean> = (
  model: FluidGalleryModel,
) => Option.map(model.configuredSidebar, configuredSidebarIsOpen)
