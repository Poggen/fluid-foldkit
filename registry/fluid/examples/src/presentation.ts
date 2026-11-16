import { Program, Runtime } from 'foldkit'
import { FluidPresentationExampleBlock, FluidPresentationExampleLayer } from './presentation-app.js'
import './presentation.css'

Runtime.run(
  Program.make({
    block: FluidPresentationExampleBlock,
    layer: FluidPresentationExampleLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
