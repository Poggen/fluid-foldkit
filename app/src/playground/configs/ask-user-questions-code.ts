import { buildQuestions, type Configuration } from './ask-user-questions'

export const askUserQuestionsCode = (
  configuration: Configuration,
) => `import { AskUserQuestionsBlock } from '@foldkit-visuals/fluid/ask-user-questions'

const questions = ${JSON.stringify(buildQuestions(configuration), null, 2)}
const Ask = Page.makeRequiredFieldBinding(AskUserQuestionsBlock, {
  field: 'ask', init: { contextToArgs: () => [{ id: 'questions', questions }] },
})
Ask.embedView({ slotId: 'questions', model: model.ask,
  viewInputs: { context, animate, animateHighlight, animateSelection },
})
// Apply question edits through Ask.requestConfigure({ config: { questions } }).
// Replay through Ask.requestReset({ config: { questions } }).`
