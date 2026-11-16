import { exampleHoverConfig } from './example-presentation.js'
import { formRouteShape } from './form-docs-layout.js'
import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { createSelectLayer } from '@foldkit-visuals/fluid/select'
import { FieldDocsBlock, FieldDocsLayer, Config, motion } from './field-docs-block.js'
import './input-group-example.css'

const query = new URLSearchParams(location.search)

const shape = formRouteShape(query.get('shape'))

const size = query.get('size') === 'compact' ? 'compact' : 'default'

const flags: typeof Config.Type = { shape, size, ...exampleHoverConfig }

Runtime.run(
  Program.makeElement({
    block: FieldDocsBlock,
    layer: FieldDocsLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
    Flags: Config,
    flags: Effect.succeed(flags),
  }).provide({
    services: Layer.merge(createSelectLayer(document), inputFileResourcesLayer),
    runtime: motion.layer,
  }),
)
