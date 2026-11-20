import { Program, Runtime } from 'foldkit'
import { defaultEnvironmentLayer } from '@foldkit-visuals/ramka/lightbox'
import { RamkaExampleBlock, layer } from './lightbox-example'
import '@foldkit-visuals/ramka/styles.css'
import './style.css'
import './document.css'

Runtime.run(
  Program.makeElement({
    block: RamkaExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide(defaultEnvironmentLayer),
)
