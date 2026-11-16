import { createKeyedLazy } from 'foldkit/html'
import type { FluidGalleryBlock, FluidGalleryInputs, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import {
  renderColorPicker,
  renderRadioGroup,
  renderCheckboxGroup,
  renderCombobox,
  renderChatMessage,
  renderCommandMenu,
} from './details-controls-view'
import { renderBreadcrumb } from './breadcrumb-view'
import { renderThinkingSteps } from './details-thinking-view'
import * as BreadcrumbConfiguration from '../../playground/configs/breadcrumb'
export const makeDetailsDemos = (stay: typeof FluidGalleryBlock.Message.Refreshed) => {
  const lazy = createKeyedLazy()
  return (model: FluidGalleryModel, inputs: FluidGalleryInputs, h: FluidViewBuilder) => ({
    'color-picker': () =>
      lazy('color-picker', renderColorPicker, [
        model.color,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'radio-group': () =>
      lazy('radio-group', renderRadioGroup, [
        model.radio,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'checkbox-group': () =>
      lazy('checkbox-group', renderCheckboxGroup, [
        model.checks,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    combobox: () =>
      lazy('combobox', renderCombobox, [
        model.combo,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'chat-message': () =>
      lazy('chat-message', renderChatMessage, [
        model.userChat,
        model.chat,
        inputs.settings.shape,
        inputs.settings.hover,
        h,
      ]),
    'command-menu': () =>
      lazy('command-menu', renderCommandMenu, [
        model.commands,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    breadcrumb: () =>
      lazy('breadcrumb', renderBreadcrumb, [
        model.breadcrumb,
        model.crumbHidden,
        model.crumbMenu,
        model.crumbSection,
        inputs.configuration?._tag === 'breadcrumb'
          ? inputs.configuration
          : BreadcrumbConfiguration.defaults,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
        stay,
      ]),
    'thinking-steps': () =>
      lazy('thinking-steps', renderThinkingSteps, [
        model.steps,
        model.profile,
        model.portfolio,
        model.portfolioDetails,
        model.recent,
        model.analysis,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
  })
}
