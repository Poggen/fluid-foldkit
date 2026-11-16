import { Program, Runtime } from 'foldkit'
import { familyRootFixture } from '../../test/fixtures/family-root'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const parameters = new URLSearchParams(location.search)
const lowLevel = parameters.has('lowLevel')
const fixture = familyRootFixture(
  lowLevel ? 'root-low-level' : 'root-family',
  lowLevel,
  'default',
  parameters.has('candle') ? 'candle' : 'line',
)
Runtime.run(
  Program.makeElement({
    block: fixture.block,
    layer: fixture.layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
