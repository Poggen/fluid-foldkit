import { createSelectLayer } from '@foldkit-visuals/fluid/select'
import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { AccordionAuthoredBlock, layer, motion, switchMotion } from './accordion-authored-block.js'
import './accordion-authored.css'

Runtime.run(
  Program.make({
    block: AccordionAuthoredBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide({
    services: createSelectLayer(document),
    runtime: Layer.mergeAll(motion.layer, switchMotion.layer),
  }),
)
