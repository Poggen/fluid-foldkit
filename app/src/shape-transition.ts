import { Effect, Option, Schema } from 'effect'
import { Render, Update } from 'foldkit'
import { SiteEnvironment } from './environment'
import { ApplicationBlock, Message } from './application-contract'
import type { Settings } from './settings'

export const FinishShapeTransition = ApplicationBlock.makeCommand('FinishShapeTransition', {
  args: { revision: Schema.Natural },
  messages: [Message.CompletedShapeTransition],
  *handler() {
    const environment = yield* SiteEnvironment
    return ({ revision }) =>
      (
        environment.transitionShape ??
        Render.afterPaint.pipe(Effect.andThen(Effect.sleep('200 millis')))
      ).pipe(Effect.as(Message.CompletedShapeTransition({ revision })))
  },
})

export const startShapeTransition = (settings: Settings) =>
  ApplicationBlock.makeStep((model) => {
    if (settings.shape === model.settings.shape) return { model }
    const revision = model.presentationRevision + 1
    return Update.combineSteps([
      ApplicationBlock.makeFieldsStep(() => ({
        presentationRevision: () => revision,
        maybeShapeTransition: () => Option.some(revision),
      })),
      ApplicationBlock.makeCommandsStep(() => [FinishShapeTransition({ revision })]),
    ])
  })

export const finishShapeTransition = ApplicationBlock.makeFieldsStep(
  (model, { revision }: typeof Message.CompletedShapeTransition.Type) =>
    Option.contains(model.maybeShapeTransition, revision)
      ? { maybeShapeTransition: () => Option.none() }
      : {},
)
