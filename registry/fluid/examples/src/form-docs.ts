import { formRouteShape, formRouteFamily } from './form-docs-layout.js'
import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { FormDocsBlock, FormDocsLayer, Config, motion } from './form-docs-block.js'
import './input-group-example.css'

const query = new URLSearchParams(location.search)

const family = formRouteFamily(location.pathname)

const shape = formRouteShape(query.get('shape'))

const size = query.get('size') === 'compact' ? 'compact' : 'default'

const flags: typeof Config.Type = { family, shape, size }

Runtime.run(
  Program.makeElement({
    block: FormDocsBlock,
    layer: FormDocsLayer,
    container: document.querySelector<HTMLDivElement>('#root'),
    Flags: Config,
    flags: Effect.succeed(flags),
  }).provide({ services: inputFileResourcesLayer, runtime: motion.layer }),
)
