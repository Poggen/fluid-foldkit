import { Effect, Option, Schema } from 'effect'
import { ApplicationBlock, Message } from '../application-contract'
import { SiteEnvironment } from '../environment'
import { loadFontCatalogue } from './query'
import { FontChoice } from './catalogue'
export const PrepareFont = ApplicationBlock.makeCommand('PrepareFont', {
  args: { revision: Schema.Natural, choice: FontChoice },
  messages: [Message.CompletedFontPreparation],
  *handler() {
    return ({ revision, choice }) =>
      loadFontCatalogue.pipe(
        Effect.mapError(() => 'The font catalogue could not be loaded. Try again.'),
        Effect.flatMap((catalogue) => {
          const font = catalogue.fonts.find((font) => font.name === choice.family)
          return font === undefined
            ? Effect.fail('This family is not in the available Google Fonts catalogue.')
            : Effect.succeed(font)
        }),
        Effect.result,
        Effect.map((result) => Message.CompletedFontPreparation({ revision, result })),
      )
  },
})
export const WaitForFont = ApplicationBlock.makeCommand('WaitForFont', {
  args: { revision: Schema.Natural, choice: FontChoice },
  messages: [Message.CompletedFontLoad],
  *handler() {
    const environment = yield* SiteEnvironment
    return ({ revision, choice }) =>
      (environment.loadFont?.(choice) ?? Effect.succeed(false)).pipe(
        Effect.timeoutOption('15 seconds'),
        Effect.map((result) => Option.getOrElse(result, () => false)),
        Effect.map((success) => Message.CompletedFontLoad({ revision, success })),
      )
  },
})

export const FontDeadline = ApplicationBlock.makeCommand('FontDeadline', {
  args: { revision: Schema.Natural },
  messages: [Message.TimedOutFont],
  *handler() {
    return ({ revision }) =>
      Effect.sleep('15 seconds').pipe(Effect.as(Message.TimedOutFont({ revision })))
  },
})
