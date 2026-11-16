import { ColorScrollOptions, colorScrollOptions } from './options.js'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { ColorScrollExample, ColorScrollExampleLayer, ColorScrollMotionLayer } from './example.js'
import { createColorPickerLayer } from '@foldkit-visuals/fluid/color-picker'
import './style.css'

Runtime.run(
  Program.make({
    block: ColorScrollExample,
    layer: ColorScrollExampleLayer,
    Flags: ColorScrollOptions,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({
    services: Layer.merge(createColorPickerLayer(document), makeTooltipDomLayer(document, window)),
    runtime: ColorScrollMotionLayer,
  }),
  { flags: Effect.succeed(colorScrollOptions(location.search)) },
)
