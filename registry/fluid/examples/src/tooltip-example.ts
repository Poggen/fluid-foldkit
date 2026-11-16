import { Program, Runtime } from 'foldkit'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { TooltipShowcaseBlock, layer, motion } from './tooltip-example-block.js'
import './tooltip-example.css'
Runtime.run(
  Program.makeElement({
    block: TooltipShowcaseBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services: makeTooltipDomLayer(document, window), runtime: motion.layer }),
)
