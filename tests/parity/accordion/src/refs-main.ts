import { Program, Runtime } from 'foldkit'
import { AccordionRefParentBlock, AccordionRefParentLayer } from './refs-fixture.js'
import './style.css'

Runtime.run(
  Program.make({
    block: AccordionRefParentBlock,
    layer: AccordionRefParentLayer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
