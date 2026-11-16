import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { ThinkingStepsBlock, ThinkingStepDetailsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { ThinkingStepBlock } from '@foldkit-visuals/fluid/thinking-step'
import type { ThinkingStepStatus } from '@foldkit-visuals/fluid/thinking-step'
import { ThinkingDemoBlock, getDemo, occurrence } from './thinking-example-playback.js'
import type { Model } from './thinking-example-playback.js'

export const Roots = ThinkingDemoBlock.makeRecordBinding(ThinkingStepsBlock, {
  field: 'roots',
}).withOutMessagePolicy({
  fold: ThinkingDemoBlock.makeOutMessageFold(ThinkingStepsBlock, {
    OpenChanged: ThinkingDemoBlock.makeNoopStep,
  }),
})

export const Rows = ThinkingDemoBlock.makeRecordBinding(ThinkingStepBlock, { field: 'rows' })

export const Details = ThinkingDemoBlock.makeRecordBinding(ThinkingStepDetailsBlock, {
  field: 'details',
}).withOutMessagePolicy({
  fold: ThinkingDemoBlock.makeOutMessageFold(ThinkingStepDetailsBlock, {
    OpenChanged: ThinkingDemoBlock.makeNoopStep,
  }),
})

export const statusAt = (model: Model, index: number): ThinkingStepStatus => {
  if (
    getDemo(model.id).delays.length === 0 ||
    model.playback === 'finished' ||
    index < model.fired - 1
  ) {
    return 'complete'
  }

  return index === model.fired - 1 ? 'active' : 'pending'
}

export const initChildren = ThinkingDemoBlock.makeStep((model) => {
  const key = occurrence(model)
  const demo = getDemo(model.id)

  return Update.combineSteps([
    ThinkingDemoBlock.makeStep((current) =>
      initAndInsert(Roots, current, { key, args: [{ id: `${key}-root` }] }),
    ),
    ...demo.rows.map((_row, index) =>
      ThinkingDemoBlock.makeStep((current) =>
        initAndInsert(Rows, current, {
          key: `${key}-${index}`,
          args: [{ id: `${key}-step-${index}`, status: statusAt(model, index) }],
        }),
      ),
    ),
    ...demo.rows.flatMap((row, index) =>
      row.details === undefined
        ? []
        : [
            ThinkingDemoBlock.makeStep((current) =>
              initAndInsert(Details, current, {
                key: `${key}-${index}`,
                args: [{ id: `${key}-details-${index}` }],
              }),
            ),
          ],
    ),
  ])
})
