import { Program, Runtime } from 'foldkit'
import { Fixture } from './series-point-marker-runtime-fixture'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const handle = Runtime.embed(
  Program.makeElement({
    block: Fixture.block,
    layer: Fixture.layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)

document.querySelector<HTMLButtonElement>('#dispose-runtime')?.addEventListener(
  'click',
  () => {
    void handle.dispose()
  },
  { once: true },
)
