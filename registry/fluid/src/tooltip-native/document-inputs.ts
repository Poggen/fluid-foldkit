import type { Html } from 'foldkit/html'
import type { TooltipViewInputs } from './interaction.js'

export interface DocumentTooltipViewInputs {
  readonly part?: 'document'
  readonly render: (context: {
    readonly tooltip: (key: string, inputs: Omit<TooltipViewInputs, 'trigger'>) => Html
  }) => Html
  readonly renderTrigger: (
    key: string,
    context: Parameters<TooltipViewInputs['trigger']>[0],
  ) => Html
  readonly renderDocument: (content: Html, popups: ReadonlyArray<Html>) => Html
  readonly renderContent?: (key: string) => Html
}

export interface DocumentTooltipTriggerInputs {
  readonly part: 'triggers'
  readonly render: (context: { readonly tooltip: (key: string) => Html }) => Html
  readonly renderTrigger: DocumentTooltipViewInputs['renderTrigger']
}

export interface DocumentTooltipPopupEntry extends Omit<TooltipViewInputs, 'trigger' | 'animate'> {
  readonly key: string
}

export interface DocumentTooltipPopupInputs {
  readonly part: 'popups'
  readonly entries: ReadonlyArray<DocumentTooltipPopupEntry>
  readonly animate: TooltipViewInputs['animate']
  readonly renderContent?: DocumentTooltipViewInputs['renderContent']
  readonly renderPopups: (popups: ReadonlyArray<Html>) => Html
}

export type DocumentTooltipRenderInputs =
  | DocumentTooltipViewInputs
  | DocumentTooltipTriggerInputs
  | DocumentTooltipPopupInputs
