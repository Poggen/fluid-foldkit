import { Effect } from 'effect'
import { injectIntoTemplate, renderToString } from 'foldkit/experimental/server'
import { FluidPresentationExampleBlock, FluidPresentationExampleLayer } from './presentation-app.js'

export const renderPresentation = (template: string): string => {
  const rendered = Effect.runSync(
    renderToString(
      { block: FluidPresentationExampleBlock, layer: FluidPresentationExampleLayer },
      {},
      { isHydratable: true, buildId: 'fluid-presentation-hydration' },
    ),
  )

  return injectIntoTemplate(template, rendered)
}
