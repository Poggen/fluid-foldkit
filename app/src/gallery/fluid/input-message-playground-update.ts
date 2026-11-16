import { Option, Schema } from 'effect'
import { InputMessageBlock } from '@foldkit-visuals/fluid/input-message'
import { Update } from 'foldkit'
import {
  suggestedPrompts,
  placeholderPrompt,
  type Configuration,
} from '../../playground/configs/input-message'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { Composer } from './interactive-bindings'
const equal = Schema.toEquivalence(InputMessageBlock.InMessage.RequestedConfigure)
export const reconcileInputMessage = (
  config: Configuration,
  _presentation: ComponentPresentation,
  changedFields?: ReadonlyArray<string>,
) =>
  FluidGalleryBlock.makeStep((model) => {
    const current = model.composer
    const values = {
      value: current.value,
      disabled: current.disabled,
      files: current.files,
      queue: current.queue,
      status: Option.getOrNull(current.status),
      supportsFiles: current.supportsFiles,
      supportsQueue: current.supportsQueue,
      showQueue: current.showQueue,
      supportsStop: current.supportsStop,
      accept: current.accept,
      maxFiles: Option.getOrNull(current.maxFiles),
      filePreviewSize: current.filePreviewSize,
      minRows: current.minRows,
      maxRows: current.maxRows,
      clickToFocus: current.clickToFocus,
      history: current.history,
      suggestions: current.suggestions,
      placeholderSuggestion: Option.getOrNull(current.placeholderSuggestion),
    }
    const desired = {
      ...values,
      disabled: config.disabled,
      files:
        !config.attachments &&
        (changedFields === undefined || changedFields.includes('attachments'))
          ? []
          : current.files,
      status:
        changedFields === undefined ||
        changedFields.includes('status') ||
        current.supportsQueue !== (config.status !== 'off')
          ? config.status === 'off'
            ? null
            : config.status
          : values.status,
      supportsFiles: config.attachments || config.leftSlot,
      supportsQueue: config.status !== 'off',
      supportsStop: config.status !== 'off',
      showQueue: config.status !== 'off',
      minRows: config.minRows,
      maxRows: Math.max(config.minRows, config.maxRows),
      clickToFocus: config.clickToFocus,
      history: config.historyOn ? model.composerHistory : [],
      suggestions: config.suggestionsOn ? suggestedPrompts : [],
      placeholderSuggestion: config.suggestion ? placeholderPrompt : null,
    }
    return Update.combineSteps(
      equal({ _tag: 'RequestedConfigure', ...values }, { _tag: 'RequestedConfigure', ...desired })
        ? []
        : [Composer.requestConfigure(desired)],
    )
  })
