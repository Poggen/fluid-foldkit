import { Program, Runtime } from 'foldkit'
import {
  CheckboxInputExampleBlock,
  CheckboxInputLayer,
  CheckboxInputMotionLayer,
} from './checkbox-group-checks-example.js'
import './checkbox-group-forms.css'

Runtime.run(
  Program.make({
    block: CheckboxInputExampleBlock,
    layer: CheckboxInputLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(CheckboxInputMotionLayer),
)
