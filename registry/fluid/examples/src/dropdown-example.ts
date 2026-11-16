import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { DialogResources, DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import { DropdownResourcesLayer } from '@foldkit-visuals/fluid/dropdown/environment'
import {
  DropdownExampleBlock,
  init,
  update,
  inMessageUpdate,
  dependencies,
  motion,
} from './dropdown-example-block.js'
import { view } from './dropdown-example-view.js'
import './dropdown-example.css'

const layer = DropdownExampleBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(dependencies),
)

const resources = Layer.unwrap(
  Effect.gen(function* resources() {
    return DropdownResourcesLayer(document, yield* DialogResources)
  }),
).pipe(Layer.provide(DialogResourcesLayer(document)))

Runtime.run(
  Program.makeElement({
    block: DropdownExampleBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services: resources, runtime: motion.layer }),
)
