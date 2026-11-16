import { modifyFields } from 'foldkit/struct'
import { Effect, Option, Queue, Stream } from 'effect'
import { TabsBlock, Message } from './tabs-definition.js'
import {
  acquireSelectedPill,
  readSelectedPillInitializer,
  SelectedPillDrivers,
  selectedPillMountArgs,
  selectedPillCommandArgs,
} from './tabs-selected-pill-driver.js'
import { sameSelectedPill, selectedPillTarget } from './tabs-selected-pill-state.js'

export const SelectedPillMount = TabsBlock.makeMountStream('SelectedPill', {
  args: selectedPillMountArgs,
  messages: [Message.CapturedSelectedPillLease],
  *handler() {
    const drivers = yield* SelectedPillDrivers

    return ({ element, viewStateChanges, ...args }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.CapturedSelectedPillLease.Type>((queue) =>
                readSelectedPillInitializer(element).pipe(
                  Effect.flatMap((initial) =>
                    acquireSelectedPill(drivers, element, { ...args, ...initial }),
                  ),
                  Effect.tap((driver) =>
                    Effect.sync(() => {
                      Queue.offerUnsafe(
                        queue,
                        Message.CapturedSelectedPillLease({ lease: driver.lease }),
                      )
                    }),
                  ),
                  Effect.flatMap(() => Effect.never),
                ),
              )
            : Stream.never,
        ),
      )
  },
})

export const RetargetSelectedPill = TabsBlock.makeCommand('RetargetSelectedPill', {
  args: selectedPillCommandArgs,
  messages: [Message.ObservedSelectedPillRetarget],
  *handler() {
    const drivers = yield* SelectedPillDrivers

    return ({ id, target, revision, lease }) =>
      Effect.sync(() => {
        const applied = drivers.nodes.get(id)?.retarget(target, revision, lease) ?? false

        return Message.ObservedSelectedPillRetarget({ lease, revision, applied })
      })
  },
})

export const SynchronizeSelectedPill = TabsBlock.makeStep((model) => {
  const target = selectedPillTarget(model)

  if (sameSelectedPill(model.selectedPill, target)) {
    return { model }
  }

  const revision = model.selectedPillRevision + 1

  return {
    model: modifyFields(model, {
      selectedPill: () => target,
      selectedPillRevision: () => revision,
    }),
    commands:
      Option.isSome(target) && Option.isSome(model.selectedPillLease)
        ? [
            RetargetSelectedPill({
              id: model.id,
              target: target.value,
              revision,
              lease: model.selectedPillLease.value,
            }),
          ]
        : [],
  }
})

export const AdoptSelectedPillLease = TabsBlock.makeStep(
  (model, { lease }: typeof Message.CapturedSelectedPillLease.Type) => ({
    model: modifyFields(model, { selectedPillLease: () => Option.some(lease) }),
    commands: Option.isSome(model.selectedPill)
      ? [
          RetargetSelectedPill({
            id: model.id,
            target: model.selectedPill.value,
            revision: model.selectedPillRevision,
            lease,
          }),
        ]
      : [],
  }),
)
