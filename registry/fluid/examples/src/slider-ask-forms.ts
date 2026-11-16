import { Program, Runtime } from 'foldkit'
import {
  SliderAskExampleBlock,
  SliderAskExampleLayer,
  SliderAskMotionLayer,
  sliderAskEnvironment,
} from './slider-ask-example.js'
import './slider-ask-forms.css'

Runtime.run(
  Program.make({
    block: SliderAskExampleBlock,
    layer: SliderAskExampleLayer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({
    services: sliderAskEnvironment(document, navigator.platform),
    runtime: SliderAskMotionLayer,
  }),
)
