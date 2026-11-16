import { Context } from 'effect'

export class SankeyRegistration extends Context.Service<SankeyRegistration, () => void>()(
  '@foldkit-visuals/charts/SankeyRegistration',
) {}
