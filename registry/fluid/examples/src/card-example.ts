import { Program, Runtime } from 'foldkit'
import { CardGroupRefsDefaultLayer } from '@foldkit-visuals/fluid/card'
import { FluidCardExampleBlock, layer, motion } from './card-example-block.js'
import './card-example.css'
Runtime.run(
  Program.makeElement({
    block: FluidCardExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services: CardGroupRefsDefaultLayer, runtime: motion.layer }),
)
