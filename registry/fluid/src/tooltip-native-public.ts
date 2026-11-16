export { DocumentTooltipBlock, DocumentTooltipKey, layer } from './tooltip-native/document.js'

export { TooltipDom, makeTooltipDomLayer } from './tooltip-native/resources.js'

export type {
  DocumentTooltipViewInputs,
  DocumentTooltipTriggerInputs,
  DocumentTooltipPopupEntry,
  DocumentTooltipPopupInputs,
  DocumentTooltipRenderInputs,
} from './tooltip-native/document.js'

export type { TooltipViewInputs as DocumentTooltipOccurrenceViewInputs } from './tooltip-native/interaction.js'

export type {
  TooltipOptions as DocumentTooltipOptions,
  Side as DocumentTooltipSide,
  Transaction as DocumentTooltipTransaction,
  Admission as DocumentTooltipAdmission,
  EffectiveChange as DocumentTooltipEffectiveChange,
} from './tooltip-native/domain.js'
