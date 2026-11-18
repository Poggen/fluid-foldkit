import { DataComponents } from './authored-composition'
import { layer as DataComponentsLayer } from './authored-data-components'
import { modifyFields } from 'foldkit/struct'
import { authoredView } from './authored-view'
import { layer as SidebarsLayer } from './authored-sidebars'
import { layer as MessagesLayer } from './authored-messages'
import { layer as CommandsLayer } from './authored-commands'
import { layer as DatesLayer } from './authored-dates'
import { layer as DialogsLayer } from './authored-dialogs'
import { layer as QuestionsLayer } from './authored-questions'
import { createChatMessageExampleLayer } from '../../../registry/fluid/examples/src/chat-message-example-block'
const ChatLayer = Layer.unwrap(Effect.sync(createChatMessageExampleLayer))
import { layer as BannerLayer } from './authored-banner'
import { layer as CalendarLayer } from '../../../registry/fluid/examples/src/calendar-authored-block'
import {
  Calendar,
  Banner,
  Chat,
  Questions,
  Dates,
  Dialogs,
  Sidebars,
  Messages,
  Commands,
  Standalone,
  Single,
  Multiple,
  Highlight,
  Forms,
  Controls,
  Charts,
  Menus,
  Thinking,
  Surfaces,
  Copy,
  Colors,
  Choices,
  Tooltip,
  AuthoredExamplesComposition,
  initFeatureIfMissing,
  PreviewTabs,
} from './authored-composition'
import { layer as ChoicesLayer } from './authored-choices'
import { layer as TooltipLayer } from '../../../registry/fluid/examples/src/tooltip-example-block'

import { layer as ColorsLayer } from './authored-colors'
import { AuthoredExamplesBlock } from './authored-block'
export { AuthoredExamplesBlock } from './authored-block'
import { layer as CopyLayer } from './authored-copy'
import { layer as SurfacesLayer } from './authored-surfaces'
import { layer as ThinkingLayer } from './authored-thinking'
import { layer as MenusLayer } from './authored-menus'
import { layer as ChartsLayer } from './authored-charts'
import { layer as ControlsLayer } from './authored-controls'
import { layer as FormsLayer } from './authored-forms'
/* @license Derived from Fluid Functionalism cc276ca0 docs. MIT, copyright 2026 Micka Touillaud. */
import { AccordionLayer, AccordionGroupLayer } from '@foldkit-visuals/fluid/accordion'
import { layer as PreviewControlsLayer } from '../../../components/docs/preview-controls'
import { previewCodeTabId } from '../../../components/docs/preview-code-tabs'

import { Effect, Layer } from 'effect'
import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'

import type { ComponentPresentation } from '../settings'
import { hoverModeOf as accordionHoverModeOf } from '@foldkit-visuals/fluid/accordion'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'

const WaitBeforeLoadCompletion = AuthoredExamplesBlock.makeCommand('WaitBeforeLoadCompletion', {
  messages: [AuthoredExamplesBlock.Message.CompletedWaitBeforeLoadCompletion],
  *handler() {
    return () =>
      Effect.sleep('2 seconds').pipe(
        Effect.as(AuthoredExamplesBlock.Message.CompletedWaitBeforeLoadCompletion()),
      )
  },
})
const localSections = [
  'Variants',
  'With Icons',
  'Loading & Disabled',
  'Standalone',
  'Single Expand',
  'Multi Expand',
  'Row highlight',
] as const
const initPreviewTabs = AuthoredExamplesBlock.makeStep(() =>
  Update.combineSteps(
    localSections.map((section) =>
      AuthoredExamplesBlock.makeStep((model) =>
        initAndInsert(PreviewTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('authored', section),
              idPrefix: previewCodeTabId('authored', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const reconcilePresentation = (settings: ComponentPresentation) =>
  AuthoredExamplesBlock.makeStep((model) =>
    Update.combineSteps([
      Forms.informOfPage({ slug: model.slug, presentation: settings }),
      DataComponents.informOfPresentation({ presentation: settings }),
      Controls.informOfPresentation({ presentation: settings }),
      Charts.informOfPresentation({ presentation: settings }),
      Menus.informOfPresentation({ presentation: settings }),
      Thinking.informOfPresentation({ presentation: settings }),
      Surfaces.informOfPresentation({ presentation: settings }),
      Copy.informOfPresentation({ presentation: settings }),
      Colors.informOfPresentation({ presentation: settings }),
      Choices.informOfPresentation({ presentation: settings }),
      Dates.informOfPresentation({ presentation: settings }),
      Dialogs.informOfPresentation({ presentation: settings }),
      Sidebars.informOfPresentation({ presentation: settings }),
      Messages.informOfPresentation({ presentation: settings }),
      Commands.informOfPresentation({ presentation: settings }),
      Questions.informOfPresentation({ presentation: settings }),
      Banner.informOfPresentation({ presentation: settings }),
      Chat.informOfDocumentation({
        embedded: true,
        shape: settings.shape,
        size: settings.size,
        hoverMode: settings.hover,
      }),
      Calendar.informOfDocumentation({
        embedded: true,
        shape: settings.shape,
        size: settings.size,
        hoverMode: settings.hover,
      }),
      Tooltip.informOfDocumentation({
        embedded: true,
        shape: settings.shape,
        size: settings.size,
        hoverMode: settings.hover,
      }),
      ...(accordionHoverModeOf(model.standalone) === settings.hover
        ? []
        : [Standalone.requestHoverMode({ mode: settings.hover })]),
      ...(accordionHoverModeOf(model.single) === settings.hover
        ? []
        : [Single.requestHoverMode({ mode: settings.hover })]),
      ...(accordionHoverModeOf(model.multiple) === settings.hover
        ? []
        : [Multiple.requestHoverMode({ mode: settings.hover })]),
      ...(accordionHoverModeOf(model.highlight) === settings.hover
        ? []
        : [Highlight.requestHoverMode({ mode: settings.hover })]),
      ...Object.entries(model.previewTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === settings.hover
          ? []
          : [PreviewTabs.requestHoverMode(section, { mode: settings.hover })],
      ),
    ]),
  )
const plans = {
  inMessageUpdate: AuthoredExamplesComposition.makeInMessageUpdate({
    InformedOfPage: AuthoredExamplesBlock.makeStep.fromMessage(({ slug, presentation }) =>
      Update.combineSteps([
        AuthoredExamplesBlock.makeFieldsStep(() => ({ slug: () => slug })),
        initFeatureIfMissing(slug),
        reconcilePresentation(presentation),
      ]),
    ),
    InformedOfPresentation: AuthoredExamplesBlock.makeStep.fromMessage(({ presentation }) =>
      reconcilePresentation(presentation),
    ),
  }),
  init: AuthoredExamplesComposition.makeInit((slug, presentation) => ({
    childInitContext: slug,
    model: { slug, isLoading: false, previewTabs: {} },
    steps: [initPreviewTabs, reconcilePresentation(presentation)],
  })),
  update: AuthoredExamplesComposition.makeUpdate({
    ClickedLoad: AuthoredExamplesBlock.makeStep((model) => ({
      model: modifyFields(model, { isLoading: () => true }),
      commands: [WaitBeforeLoadCompletion()],
    })),
    CompletedWaitBeforeLoadCompletion: AuthoredExamplesBlock.makeFieldsStep(() => ({
      isLoading: () => false,
    })),
  }),
  view: authoredView(AuthoredExamplesBlock.Message),
  EffectsLayer: WaitBeforeLoadCompletion.layer,
}
export const layer = AuthoredExamplesBlock.makeLayer<typeof plans>(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      AccordionLayer,
      AccordionGroupLayer,
      PreviewControlsLayer,
      FormsLayer,
      DataComponentsLayer,
      ControlsLayer,
      ChartsLayer,
      MenusLayer,
      ThinkingLayer,
      SurfacesLayer,
      CopyLayer,
      ColorsLayer,
      ChoicesLayer,
      TooltipLayer,
      CalendarLayer,
      BannerLayer,
      ChatLayer,
      QuestionsLayer,
      DialogsLayer,
      DatesLayer,
      SidebarsLayer,
      MessagesLayer,
      CommandsLayer,
    ),
  ),
)
