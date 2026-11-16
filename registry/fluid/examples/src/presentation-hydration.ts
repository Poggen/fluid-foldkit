import { Program, Runtime } from 'foldkit'
import { FluidPresentationExampleBlock, FluidPresentationExampleLayer } from './presentation-app.js'
import './presentation.css'

Runtime.hydrate(
  Program.make({
    block: FluidPresentationExampleBlock,
    layer: FluidPresentationExampleLayer,
    container: document.querySelector<HTMLElement>('[data-foldkit-app]'),
  }),
  { buildId: 'fluid-presentation-hydration' },
)
