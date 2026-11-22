import { Program, Runtime } from 'foldkit'
import { photoEnvironmentLayer } from './photo-environment'
import { RamkaExampleBlock, layer } from './lightbox-example'
import '@foldkit-visuals/ramka/styles.css'
import './style.css'
import './document.css'

Runtime.run(
  Program.makeElement({
    block: RamkaExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide(photoEnvironmentLayer),
)
