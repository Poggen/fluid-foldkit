import { Config, Option } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import * as Node from '@foldkit/node'

NodeRuntime.runMain(
  Node.serve({
    port: Config.withDefault(Config.Port('PORT'), 5280),
    origin: Config.option(Config.String('ORIGIN')).pipe(
      Config.map(Option.filter((value) => value.length > 0)),
    ),
  }),
)
