import { Program, Runtime } from 'foldkit'
import { InputGroupExampleBlock, InputGroupExampleLayer } from './input-group-example-block.js'
import './input-group-example.css'

Runtime.run(
  Program.makeElement({
    block: InputGroupExampleBlock,
    layer: InputGroupExampleLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
