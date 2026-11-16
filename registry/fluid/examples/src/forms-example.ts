import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { Program, Runtime } from 'foldkit'
import { FormsExampleBlock, FormsExampleLayer, target } from './forms-example-block.js'
import './input-group-example.css'

Runtime.run(
  Program.makeElement({
    block: FormsExampleBlock,
    layer: FormsExampleLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide({ services: inputFileResourcesLayer, runtime: target.layer }),
)
