import { createKeyedLazy } from 'foldkit/html'
import type { Configuration } from '../../playground/configs/ask-user-questions'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { renderAskUserQuestions } from './interactive-controls-view'

export const makeAskUserQuestionsPlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('ask-user-questions-playground', renderAskUserQuestions, [
      model.ask,
      configuration.appearance.shape ?? settings.shape,
      configuration.appearance.size ?? settings.size,
      configuration.appearance.hover ?? settings.hover,
      h,
    ])
}
