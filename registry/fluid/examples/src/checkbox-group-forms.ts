import { Program, Runtime } from 'foldkit'
import {
  SelectionFormsExampleBlock,
  SelectionFormsLayer,
  SelectionFormsMotionLayer,
} from './checkbox-group-example.js'
import './checkbox-group-forms.css'

Runtime.run(
  Program.make({
    block: SelectionFormsExampleBlock,
    layer: SelectionFormsLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(SelectionFormsMotionLayer),
)
