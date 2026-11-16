import { Context } from 'effect'

export class PolarRegistration extends Context.Service<PolarRegistration, () => void>()(
  '@foldkit-visuals/charts/PolarRegistration',
) {}
