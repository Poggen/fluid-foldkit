import { Update } from 'foldkit'
import type { ComponentPresentation } from '../../settings'
import { buildQuestions, type Configuration } from '../../playground/configs/ask-user-questions'
import { FluidGalleryBlock } from './block'
import { Ask } from './interactive-bindings'

export const reconcileAskUserQuestions = (
  configuration: Configuration,
  presentation: ComponentPresentation,
) =>
  FluidGalleryBlock.makeStep((model) => {
    const hover = configuration.appearance.hover ?? presentation.hover
    const questions = buildQuestions(configuration)
    const changed =
      questions.length !== model.ask.flow.questions.length ||
      questions.some((question, index) => {
        const current = model.ask.flow.questions[index]
        if (current === undefined) return true
        return (
          current.id !== question.id ||
          current.title !== question.title ||
          current.freeText !== ('freeText' in question && question.freeText) ||
          current.skippable !== question.skippable ||
          ('freeTextMultiline' in question
            ? current.freeTextMultiline !== question.freeTextMultiline
            : current.layout !== question.layout ||
              current.chipPosition !== question.chipPosition ||
              current.multiSelect !== question.multiSelect ||
              current.allowOther !== question.allowOther ||
              JSON.stringify(current.options) !== JSON.stringify(question.options))
        )
      })
    return Update.combineSteps([
      ...(changed ? [Ask.requestConfigure({ config: { questions } })] : []),
      ...(model.ask.hover.mode === hover ? [] : [Ask.requestHoverMode({ mode: hover })]),
    ])
  })
