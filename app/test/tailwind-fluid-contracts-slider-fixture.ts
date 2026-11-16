import { Program, Runtime } from 'foldkit'
import {
  SliderAskExampleBlock,
  SliderAskExampleLayer,
  SliderAskMotionLayer,
  sliderAskEnvironment,
} from '../../registry/fluid/examples/src/slider-ask-example.js'

Runtime.embed(
  Program.make({
    block: SliderAskExampleBlock,
    layer: SliderAskExampleLayer,
    container: document.getElementById('style-contract-root'),
  }).provide({
    services: sliderAskEnvironment(document, navigator.platform),
    runtime: SliderAskMotionLayer,
  }),
)
