import { Context } from 'effect'

export class ChoroplethRegistration extends Context.Service<ChoroplethRegistration, () => void>()(
  '@foldkit-visuals/charts/ChoroplethRegistration',
) {}
