import { Context, Effect, Layer, Ref } from 'effect'

export type AskUserQuestionsValidator = (value: string) => string | null | undefined

export type AskUserQuestionsValidators = Readonly<
  Record<string, Readonly<Record<string, AskUserQuestionsValidator>>>
>

export interface AskUserQuestionsEnvironmentOptions {
  readonly document: Document | undefined
  readonly platform: string
  readonly validators: AskUserQuestionsValidators
}

export class AskUserQuestionsEnvironment extends Context.Service<
  AskUserQuestionsEnvironment,
  {
    readonly document: Document | undefined
    readonly platform: string
    readonly instances: Set<HTMLElement>
    readonly validate: (
      instanceId: string,
      questionId: string,
      value: string,
    ) => Effect.Effect<string | null | undefined>
    readonly replaceValidators: (validators: AskUserQuestionsValidators) => Effect.Effect<void>
  }
>()('@foldkit-visuals/fluid/AskUserQuestionsEnvironment') {}

/** Keys are stable instance and question identities, never current page indices. */
export const createAskUserQuestionsLayer = (options: AskUserQuestionsEnvironmentOptions) =>
  Layer.effect(
    AskUserQuestionsEnvironment,
    Effect.gen(function* () {
      const validators = yield* Ref.make(options.validators)

      const instances = yield* Effect.acquireRelease(
        Effect.sync(() => new Set<HTMLElement>()),
        (roots) =>
          Effect.sync(() => {
            roots.clear()
          }),
      )

      return AskUserQuestionsEnvironment.of({
        document: options.document,
        platform: options.platform,
        instances,
        validate: Effect.fn('AskUserQuestions.validate')(function* (instanceId, questionId, value) {
          const current = yield* Ref.get(validators)

          return current[instanceId]?.[questionId]?.(value)
        }),
        replaceValidators: Effect.fn('AskUserQuestions.replaceValidators')((next) =>
          Ref.set(validators, next),
        ),
      })
    }),
  )
