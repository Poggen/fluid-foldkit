import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { createAskUserQuestionsLayer } from '@foldkit-visuals/fluid/ask-user-questions'
import {
  AskUserQuestionsExampleBlock,
  AskUserQuestionsExampleLayer,
  AskUserQuestionsExampleMotionLayer,
} from './ask-user-questions-example-block.js'
import './ask-user-questions-example.css'

Runtime.run(
  Program.make({
    block: AskUserQuestionsExampleBlock,
    layer: AskUserQuestionsExampleLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(
    Layer.merge(
      AskUserQuestionsExampleMotionLayer,
      createAskUserQuestionsLayer({ document, platform: navigator.platform, validators: {} }),
    ),
  ),
)
