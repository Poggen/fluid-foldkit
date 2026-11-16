import type { CoreEvents } from './render-presentation'
import { createKeyedLazy } from 'foldkit/html'
import type { FluidGalleryInputs, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import {
  renderInput,
  renderTextarea,
  renderCheckbox,
  renderSwitch,
  renderSelect,
  renderTabs,
  renderAccordion,
  renderThinkingIndicator,
  renderSlider,
  renderCarouselDots,
} from './core-controls-view'
import {
  renderBanner,
  renderButton,
  renderBadge,
  renderCard,
  renderField,
  renderTable,
} from './core-content-view'
export const makeCoreDemos = (events: CoreEvents) => {
  const lazy = createKeyedLazy()
  return (model: FluidGalleryModel, inputs: FluidGalleryInputs, h: FluidViewBuilder) => ({
    input: () =>
      lazy('input', renderInput, [
        model.input,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    textarea: () =>
      lazy('textarea', renderTextarea, [
        model.textarea,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    checkbox: () =>
      lazy('checkbox', renderCheckbox, [
        model.checkbox,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    switch: () =>
      lazy('switch', renderSwitch, [
        model.switch,
        model.sound,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    select: () =>
      lazy('select', renderSelect, [
        model.select,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    tabs: () =>
      lazy('tabs', renderTabs, [
        model.tabs,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    accordion: () =>
      lazy('accordion', renderAccordion, [
        model.accordion,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        inputs.only,
        h,
      ]),
    'thinking-indicator': () =>
      lazy('thinking-indicator', renderThinkingIndicator, [
        model.thinking,
        inputs.settings.size,
        h,
      ]),
    slider: () =>
      lazy('slider', renderSlider, [
        model.slider,
        model.volume,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    'carousel-dots': () =>
      lazy('carousel-dots', renderCarouselDots, [
        model.carousel,
        model.carouselDirection,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
        events,
      ]),
    banner: () =>
      lazy('banner', renderBanner, [
        model.banner,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
        events,
      ]),
    button: () =>
      lazy('button', renderButton, [
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    badge: () =>
      lazy('badge', renderBadge, [
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    card: () =>
      lazy('card', renderCard, [
        model.cardGroup,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        inputs.settings.accent,
        inputs.settings.theme,
        h,
        events,
      ]),
    field: () =>
      lazy('field', renderField, [
        model.search,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
    table: () =>
      lazy('table', renderTable, [
        model.table,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ]),
  })
}
