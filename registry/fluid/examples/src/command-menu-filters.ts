import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { createSelectLayer } from '@foldkit-visuals/fluid/select'
import {
  CommandFiltersExampleBlock,
  commandFiltersLayer,
  Options,
} from './command-menu-filters-contract.js'
import './primitives.css'

const params = new URLSearchParams(window.location.search)
Runtime.run(
  Program.make({
    block: CommandFiltersExampleBlock,
    layer: commandFiltersLayer,
    Flags: Options,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services: createSelectLayer(document) }),
  {
    flags: Effect.succeed({
      compact: params.get('size') === 'compact',
      trailing: params.get('layout') === 'trailing',
    }),
  },
)
