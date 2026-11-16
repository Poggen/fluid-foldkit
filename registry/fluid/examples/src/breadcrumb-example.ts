import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { DialogResources, DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import { DropdownResourcesLayer } from '@foldkit-visuals/fluid/dropdown/environment'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import {
  BreadcrumbExampleBlock,
  init,
  update,
  inMessageUpdate,
  dependencies,
  effectsLayer,
  motion,
  switchMotion,
} from './breadcrumb-example-block.js'
import { view } from './breadcrumb-example-view.js'
import './breadcrumb-example.css'

const layer = BreadcrumbExampleBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: effectsLayer,
}).pipe(Layer.provide(dependencies))

const dropdownResources = Layer.unwrap(
  Effect.gen(function* dropdownResources() {
    return DropdownResourcesLayer(document, yield* DialogResources)
  }),
).pipe(Layer.provide(DialogResourcesLayer(document)))

Runtime.run(
  Program.makeElement({
    block: BreadcrumbExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({
    services: Layer.merge(dropdownResources, makeTooltipDomLayer(document, window)),
    runtime: Layer.merge(motion.layer, switchMotion.layer),
  }),
)
