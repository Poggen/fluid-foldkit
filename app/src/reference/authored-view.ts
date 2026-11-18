import { AuthoredExamplesComposition } from './authored-composition'
import type { AuthoredExamplesBlock } from './authored-block'
import type { Block } from 'foldkit'
import { documentationRuntime } from '../documentation-runtime'

type Inputs = Block.FactsOf<typeof AuthoredExamplesBlock>['view']['inputs']
export type AuthoredViewRenderer = Parameters<
  typeof AuthoredExamplesComposition.makeView.withInputs<Inputs>
>[0]

export const authoredView = (AuthoredMessage: typeof AuthoredExamplesBlock.Message) =>
  AuthoredExamplesComposition.makeView.withInputs<Inputs>((model, inputs, h) =>
    documentationRuntime().renderAuthoredView(AuthoredMessage, model, inputs, h),
  )
