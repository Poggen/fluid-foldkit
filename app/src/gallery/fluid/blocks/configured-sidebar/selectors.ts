import type { ConfiguredSidebarModel } from './block'

export const isOpen: (model: ConfiguredSidebarModel) => boolean = (model: ConfiguredSidebarModel) =>
  model.sidebar.open
