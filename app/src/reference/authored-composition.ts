import { AuthoredDataComponentsBlock } from './authored-data-components'
import { modifyFields } from 'foldkit/struct'
import { AuthoredSidebarsBlock } from './authored-sidebars'
import { AuthoredMessagesBlock } from './authored-messages'
import { AuthoredCommandsBlock } from './authored-commands'
import { AuthoredDatesBlock } from './authored-dates'
import { AuthoredDialogsBlock } from './authored-dialogs'
import { AuthoredQuestionsBlock } from './authored-questions'
import { ChatMessageExampleBlock } from '../../../registry/fluid/examples/src/chat-message-example-block'
import { AuthoredBannerBlock } from './authored-banner'
import { TooltipShowcaseBlock } from '../../../registry/fluid/examples/src/tooltip-example-block'
import { CalendarAuthoredBlock } from '../../../registry/fluid/examples/src/calendar-authored-definition'
import { AuthoredChoicesBlock } from './authored-choices'
import { AuthoredColorsBlock } from './authored-colors'
import { AuthoredCopyBlock } from './authored-copy'
import { AuthoredSurfacesBlock } from './authored-surfaces'
import { AuthoredThinkingBlock } from './authored-thinking'
import { AuthoredMenusBlock } from './authored-menus'
import { AuthoredChartsBlock } from './authored-charts'
import { AuthoredControlsBlock } from './authored-controls'
import { AuthoredFormsBlock } from './authored-forms'
import { AccordionBlock, AccordionGroupBlock } from '@foldkit-visuals/fluid/accordion'
import { PreviewControlsBlock } from '../../../components/docs/preview-controls'
import type { AccordionConfig } from '@foldkit-visuals/fluid/accordion'
import { Option } from 'effect'
import { Update } from 'foldkit'
import { AuthoredExamplesBlock } from './authored-block'
import { authoredFeature } from './authored-routes'
import { standaloneRows, singleRows, multipleRows, highlightRows } from './accordion-data'
export const Standalone = AuthoredExamplesBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'standalone',
  init: {
    contextToArgs: (): [AccordionConfig] => [
      {
        id: 'docs-standalone',
        type: 'single',
        collapsible: true,
        defaultValue: 'item-1',
        items: standaloneRows.map(({ value }) => ({ value })),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AuthoredExamplesBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: AuthoredExamplesBlock.makeNoopStep,
  }),
})
export const Single = AuthoredExamplesBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'single',
  init: {
    contextToArgs: (): [AccordionConfig] => [
      {
        id: 'docs-single',
        type: 'single',
        collapsible: true,
        defaultValue: 'item-1',
        items: singleRows.map(({ value }, index) => ({ value, index })),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AuthoredExamplesBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: AuthoredExamplesBlock.makeNoopStep,
  }),
})
export const Multiple = AuthoredExamplesBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'multiple',
  init: {
    contextToArgs: (): [AccordionConfig] => [
      {
        id: 'docs-multiple',
        type: 'multiple',
        defaultValue: ['item-1'],
        items: multipleRows.map(({ value }, index) => ({ value, index })),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AuthoredExamplesBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: AuthoredExamplesBlock.makeNoopStep,
  }),
})
export const Highlight = AuthoredExamplesBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (): [AccordionConfig] => [
      {
        id: 'docs-highlight',
        type: 'single',
        collapsible: true,
        highlight: 'trigger',
        defaultValue: 'item-1',
        items: highlightRows.map(({ value }, index) => ({ value, index })),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AuthoredExamplesBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: AuthoredExamplesBlock.makeNoopStep,
  }),
})
export const DataComponents = AuthoredExamplesBlock.makeOptionalFieldBinding(
  AuthoredDataComponentsBlock,
  {
    field: 'maybeDataComponents',
    init: {
      contextToArgs: (slug: string) =>
        authoredFeature(slug) === 'data-components' ? Option.some([slug] as const) : Option.none(),
    },
  },
)
export const PreviewTabs = AuthoredExamplesBlock.makeRecordBinding(PreviewControlsBlock, {
  field: 'previewTabs',
})
export const Forms = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredFormsBlock, {
  field: 'maybeForms',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'forms' ? Option.some([]) : Option.none(),
  },
})
export const Controls = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredControlsBlock, {
  field: 'maybeControls',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'controls' ? Option.some([]) : Option.none(),
  },
})
export const Charts = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredChartsBlock, {
  field: 'maybeCharts',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'charts' ? Option.some([]) : Option.none(),
  },
})
export const Menus = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredMenusBlock, {
  field: 'maybeMenus',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'menus' ? Option.some([]) : Option.none(),
  },
})
export const Thinking = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredThinkingBlock, {
  field: 'maybeThinking',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'thinking' ? Option.some([]) : Option.none(),
  },
})
export const Surfaces = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredSurfacesBlock, {
  field: 'maybeSurfaces',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'surfaces' ? Option.some([]) : Option.none(),
  },
})
export const Copy = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredCopyBlock, {
  field: 'maybeCopy',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'copy' ? Option.some([]) : Option.none(),
  },
})
export const Colors = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredColorsBlock, {
  field: 'maybeColors',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'colors' ? Option.some([]) : Option.none(),
  },
})
export const Choices = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredChoicesBlock, {
  field: 'maybeChoices',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'choices' ? Option.some([]) : Option.none(),
  },
})
export const Tooltip = AuthoredExamplesBlock.makeOptionalFieldBinding(TooltipShowcaseBlock, {
  field: 'maybeTooltip',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'tooltip' ? Option.some([]) : Option.none(),
  },
})
export const Calendar = AuthoredExamplesBlock.makeOptionalFieldBinding(CalendarAuthoredBlock, {
  field: 'maybeCalendar',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'calendar' ? Option.some([]) : Option.none(),
  },
})
export const Banner = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredBannerBlock, {
  field: 'maybeBanner',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'banner' ? Option.some([]) : Option.none(),
  },
})
export const Chat = AuthoredExamplesBlock.makeOptionalFieldBinding(ChatMessageExampleBlock, {
  field: 'maybeChat',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'chat' ? Option.some([]) : Option.none(),
  },
})
export const Questions = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredQuestionsBlock, {
  field: 'maybeQuestions',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'questions' ? Option.some([]) : Option.none(),
  },
})
export const Dialogs = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredDialogsBlock, {
  field: 'maybeDialogs',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'dialogs' ? Option.some([]) : Option.none(),
  },
})
export const Dates = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredDatesBlock, {
  field: 'maybeDates',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'dates' ? Option.some([]) : Option.none(),
  },
})
export const Commands = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredCommandsBlock, {
  field: 'maybeCommands',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'commands' ? Option.some([]) : Option.none(),
  },
})
export const Messages = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredMessagesBlock, {
  field: 'maybeMessages',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'messages' ? Option.some([]) : Option.none(),
  },
})
export const Sidebars = AuthoredExamplesBlock.makeOptionalFieldBinding(AuthoredSidebarsBlock, {
  field: 'maybeSidebars',
  init: {
    contextToArgs: (slug: string): Option.Option<readonly []> =>
      authoredFeature(slug) === 'sidebars' ? Option.some([]) : Option.none(),
  },
})
export const AuthoredExamplesComposition = AuthoredExamplesBlock.makeComposition({
  bindings: [
    DataComponents,
    Standalone,
    Single,
    Multiple,
    Highlight,
    PreviewTabs,
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
    Calendar,
    Banner,
    Chat,
    Questions,
    Dialogs,
    Dates,
    Sidebars,
    Messages,
    Commands,
  ],
})
export const initFeatureIfMissing = (slug: string) =>
  AuthoredExamplesBlock.makeStep(() =>
    Update.combineSteps([
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'data-components' &&
        (Option.isNone(model.maybeDataComponents) || model.maybeDataComponents.value.slug !== slug)
          ? DataComponents.init({
              args: [slug],
              toParentModel: (child) =>
                modifyFields(model, { maybeDataComponents: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'sidebars' && Option.isNone(model.maybeSidebars)
          ? Sidebars.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeSidebars: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'messages' && Option.isNone(model.maybeMessages)
          ? Messages.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeMessages: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'commands' && Option.isNone(model.maybeCommands)
          ? Commands.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeCommands: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'forms' && Option.isNone(model.maybeForms)
          ? Forms.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeForms: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'controls' && Option.isNone(model.maybeControls)
          ? Controls.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeControls: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'charts' && Option.isNone(model.maybeCharts)
          ? Charts.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeCharts: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'menus' && Option.isNone(model.maybeMenus)
          ? Menus.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeMenus: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'thinking' && Option.isNone(model.maybeThinking)
          ? Thinking.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeThinking: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'surfaces' && Option.isNone(model.maybeSurfaces)
          ? Surfaces.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeSurfaces: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'copy' && Option.isNone(model.maybeCopy)
          ? Copy.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeCopy: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'colors' && Option.isNone(model.maybeColors)
          ? Colors.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeColors: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'choices' && Option.isNone(model.maybeChoices)
          ? Choices.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeChoices: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'tooltip' && Option.isNone(model.maybeTooltip)
          ? Tooltip.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeTooltip: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'calendar' && Option.isNone(model.maybeCalendar)
          ? Calendar.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeCalendar: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'banner' && Option.isNone(model.maybeBanner)
          ? Banner.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeBanner: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'chat' && Option.isNone(model.maybeChat)
          ? Chat.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeChat: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'questions' && Option.isNone(model.maybeQuestions)
          ? Questions.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeQuestions: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'dialogs' && Option.isNone(model.maybeDialogs)
          ? Dialogs.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeDialogs: () => Option.some(child) }),
            })
          : { model },
      ),
      AuthoredExamplesBlock.makeStep((model) =>
        authoredFeature(slug) === 'dates' && Option.isNone(model.maybeDates)
          ? Dates.init({
              args: [],
              toParentModel: (child) =>
                modifyFields(model, { maybeDates: () => Option.some(child) }),
            })
          : { model },
      ),
    ]),
  )
