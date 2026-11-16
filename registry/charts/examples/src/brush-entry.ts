import { Program, Runtime } from 'foldkit'
import { BrushFixture } from './brush-public'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

Runtime.run(
  Program.makeElement({
    block: BrushFixture.block,
    layer: BrushFixture.layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
