import { dataComponentBindings } from './data-components'
import { dataComponentDemos } from './data-components-view'
import { ConfiguredSidebarBinding } from './configured-sidebar-binding'
import { makeConfiguredView } from './configured-view'
import { fluidPages } from '../../../../lib/catalogue'
import { makePreviewCard, previewBody, previewAdmitted } from '../card'
import type { Html } from 'foldkit/html'
import { FluidGalleryBlock } from './block'
import { playgroundBindings } from './playground-bindings'
import { coreBindings } from './core-bindings'
import { makeCoreDemos } from './core-view'
import { datesBindings } from './dates-bindings'
import { makeDateDemos } from './dates-view'
import { detailsBindings } from './details-bindings'
import { makeDetailsDemos } from './details-view'
import { interactiveBindings } from './interactive-bindings'
import { makeInteractiveTooltipDemos } from './interactive-view'
import { makeInteractiveDemos } from './interactive-ordinary-view'
export const FluidGalleryComposition = FluidGalleryBlock.makeComposition({
  bindings: [
    ConfiguredSidebarBinding,
    ...dataComponentBindings,
    ...coreBindings,
    ...detailsBindings,
    ...interactiveBindings,
    ...datesBindings,
    ...playgroundBindings,
  ],
})
export type FluidViewBuilder = Parameters<
  Parameters<typeof FluidGalleryComposition.makeView.withInputs>[0]
>[2]
export const makeView = () => {
  const previewCard = makePreviewCard()
  const configuredView = makeConfiguredView({
    ChangedDropdownQuery: FluidGalleryBlock.Message.ChangedDropdownQuery,
    DismissedBanner: FluidGalleryBlock.Message.DismissedBanner,
    DismissedCard: FluidGalleryBlock.Message.DismissedCard,
    HoveredCarousel: FluidGalleryBlock.Message.HoveredCarousel,
    PickedCarousel: FluidGalleryBlock.Message.PickedCarousel,
    Refreshed: FluidGalleryBlock.Message.Refreshed,
    RequestedCopyBanner: FluidGalleryBlock.Message.RequestedCopyBanner,
    SelectedCard: FluidGalleryBlock.Message.SelectedCard,
  })
  const detailsDemos = makeDetailsDemos(FluidGalleryBlock.Message.Refreshed)
  const interactiveDemos = makeInteractiveDemos(FluidGalleryBlock.Message.UpdatedThreadSearch)
  const interactiveTooltipCards = makeInteractiveTooltipDemos()
  const dateCards = makeDateDemos()
  const coreDemos = makeCoreDemos({
    press: FluidGalleryBlock.Message.Refreshed,
    pick: FluidGalleryBlock.Message.PickedCarousel,
    hovered: FluidGalleryBlock.Message.HoveredCarousel,
    copy: FluidGalleryBlock.Message.RequestedCopyBanner,
    dismiss: FluidGalleryBlock.Message.DismissedBanner,
  })
  return FluidGalleryComposition.makeView.withInputs((model, inputs, h) => {
    const pages = fluidPages.filter(
      (page) => inputs.only === undefined || page.href === inputs.only,
    )
    const configuration = inputs.configuration
    if (
      configuration !== undefined &&
      configuration._tag !== 'chart' &&
      configuration._tag !== 'none'
    ) {
      const page = pages.find((page) => page.slug === configuration._tag)
      return page === undefined
        ? h.empty
        : previewCard(
            page,
            inputs.settings,
            previewBody(
              page,
              inputs,
              () => configuredView(model, configuration, inputs.settings, h),
              h,
            ),
            h,
            !previewAdmitted(page, inputs),
            inputs.only !== undefined,
          )
    }
    const buildCards = (demos: Record<string, () => Html>) => {
      const cards = new Map<string, Html>()
      for (const page of pages) {
        const render = demos[page.slug]
        if (render !== undefined)
          cards.set(
            page.slug,
            previewCard(
              page,
              inputs.settings,
              previewBody(page, inputs, render, h),
              h,
              !previewAdmitted(page, inputs),
              inputs.only !== undefined,
            ),
          )
      }
      return cards
    }
    // Construct ordinary occurrences in the gallery frame before entering tooltip providers.
    const ordinary = buildCards({
      ...coreDemos(model, inputs, h),
      ...dataComponentDemos(model, inputs.settings, h),
      ...detailsDemos(model, inputs, h),
      ...interactiveDemos(model, inputs, h),
    })
    const completeCards = {
      ...interactiveTooltipCards(model, inputs, h),
      ...dateCards(model, inputs, h),
    }
    return h.div(
      [h.Class('contents')],
      pages.map((page) => ordinary.get(page.slug) ?? completeCards[page.slug]?.() ?? h.empty),
    )
  })
}
