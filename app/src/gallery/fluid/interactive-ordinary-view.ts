import { createKeyedLazy } from 'foldkit/html'
import type { FluidGalleryBlock, FluidGalleryInputs, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import {
  renderDialog,
  renderDropdown,
  renderAskUserQuestions,
  renderInputGroup,
} from './interactive-controls-view'
import { renderSidebar } from './interactive-sidebar-view'
export const makeInteractiveDemos = (
  onSearch: typeof FluidGalleryBlock.Message.UpdatedThreadSearch,
) => {
  const lazy = createKeyedLazy()
  return (model: FluidGalleryModel, inputs: FluidGalleryInputs, h: FluidViewBuilder) => ({
    dialog: () =>
      lazy('dialog', renderDialog, [
        model.dialog,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    dropdown: () =>
      lazy('dropdown', renderDropdown, [
        model.dropdown,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'ask-user-questions': () =>
      lazy('ask-user-questions', renderAskUserQuestions, [
        model.ask,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'input-group': () =>
      lazy('input-group', renderInputGroup, [
        model.group,
        model.first,
        model.last,
        model.website,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    sidebar: () =>
      lazy('sidebar', renderSidebar, [
        model.sidebar,
        model.sidebarScroll,
        model.sidebarWorkspace,
        model.threadSearch,
        model.sidebarActions,
        model.threads,
        model.sidebarUser,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
        onSearch,
      ]),
  })
}
