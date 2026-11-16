import { Program, Runtime } from 'foldkit'
import {
  DepthActivePublicConsumerBlock,
  DepthActivePublicConsumerLayer,
} from './depth-active-public-consumer'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

Runtime.run(
  Program.make({
    block: DepthActivePublicConsumerBlock,
    layer: DepthActivePublicConsumerLayer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
