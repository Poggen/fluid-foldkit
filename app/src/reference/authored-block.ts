import { ComponentPresentation } from '../settings'
import { AuthoredSidebarsBlock } from './authored-sidebars'
import { AuthoredMessagesBlock } from './authored-messages'
import { AuthoredCommandsBlock } from './authored-commands'
import { AuthoredDatesBlock } from './authored-dates'
import { AuthoredDialogsBlock } from './authored-dialogs'
import { AuthoredQuestionsBlock } from './authored-questions'
import { ChatMessageExampleBlock } from '../../../registry/fluid/examples/src/chat-message-example-block'
import { AuthoredBannerBlock } from './authored-banner'
import { CalendarAuthoredBlock } from '../../../registry/fluid/examples/src/calendar-authored-definition'
import { AuthoredChoicesBlock } from './authored-choices'
import { TooltipShowcaseBlock } from '../../../registry/fluid/examples/src/tooltip-example-block'
import { AuthoredColorsBlock } from './authored-colors'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion, defineInMessageUnion } from 'foldkit/message'
import { AccordionBlock, AccordionGroupBlock } from '@foldkit-visuals/fluid/accordion'
import { PreviewControlsBlock } from '../../../components/docs/preview-controls'
import { AuthoredFormsBlock } from './authored-forms'
import { AuthoredControlsBlock } from './authored-controls'
import { AuthoredChartsBlock } from './authored-charts'
import { AuthoredMenusBlock } from './authored-menus'
import { AuthoredThinkingBlock } from './authored-thinking'
import { AuthoredSurfacesBlock } from './authored-surfaces'
import { AuthoredCopyBlock } from './authored-copy'
export const Message = defineMessageUnion({
  ClickedLoad: {},
  CompletedWaitBeforeLoadCompletion: {},
})
const key = Symbol('AuthoredExamples')
export const AuthoredExamplesBlock = Block.make('AuthoredExamples', {
  key,
  InitArgs: Schema.Tuple([Schema.String, ComponentPresentation]),
  ChildInitContext: Schema.String,
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof AuthoredFormsBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredMenusBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredSurfacesBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredCopyBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredColorsBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredChoicesBlock>['programRequirements']
    | Block.FactsOf<typeof TooltipShowcaseBlock>['programRequirements']
    | Block.FactsOf<typeof CalendarAuthoredBlock>['programRequirements']
    | Block.FactsOf<typeof ChatMessageExampleBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredQuestionsBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredDialogsBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredDatesBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredSidebarsBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredMessagesBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredCommandsBlock>['programRequirements']
  >(),
  Model: Schema.Struct({
    slug: Schema.String,
    maybeForms: Schema.Option(AuthoredFormsBlock.Model),
    maybeControls: Schema.Option(AuthoredControlsBlock.Model),
    maybeCharts: Schema.Option(AuthoredChartsBlock.Model),
    maybeMenus: Schema.Option(AuthoredMenusBlock.Model),
    maybeThinking: Schema.Option(AuthoredThinkingBlock.Model),
    maybeSurfaces: Schema.Option(AuthoredSurfacesBlock.Model),
    maybeCopy: Schema.Option(AuthoredCopyBlock.Model),
    maybeColors: Schema.Option(AuthoredColorsBlock.Model),
    maybeChoices: Schema.Option(AuthoredChoicesBlock.Model),
    maybeTooltip: Schema.Option(TooltipShowcaseBlock.Model),
    maybeCalendar: Schema.Option(CalendarAuthoredBlock.Model),
    maybeBanner: Schema.Option(AuthoredBannerBlock.Model),
    maybeChat: Schema.Option(ChatMessageExampleBlock.Model),
    maybeQuestions: Schema.Option(AuthoredQuestionsBlock.Model),
    maybeDialogs: Schema.Option(AuthoredDialogsBlock.Model),
    maybeCommands: Schema.Option(AuthoredCommandsBlock.Model),
    maybeMessages: Schema.Option(AuthoredMessagesBlock.Model),
    maybeSidebars: Schema.Option(AuthoredSidebarsBlock.Model),
    maybeDates: Schema.Option(AuthoredDatesBlock.Model),
    isLoading: Schema.Boolean,
    previewTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    standalone: AccordionBlock.Model,
    single: AccordionGroupBlock.Model,
    multiple: AccordionGroupBlock.Model,
    highlight: AccordionGroupBlock.Model,
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
    InformedOfPage: { slug: Schema.String, presentation: ComponentPresentation },
  }),
  Message,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
