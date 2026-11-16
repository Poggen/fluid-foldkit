import { Program, Runtime } from 'foldkit'
import { ReorderExampleBlock, createReorderExampleLayer } from './reorder-example-block.js'
import './input-queue-layout.css'

const container = document.querySelector<HTMLDivElement>('#root')

if (container === null) {
  throw new Error('Missing Reorder root')
}

Runtime.embed(
  Program.makeElement({
    block: ReorderExampleBlock,
    layer: createReorderExampleLayer(),
    container,
  }),
)
