import { Context } from 'effect'

export class LiveRegistration extends Context.Service<LiveRegistration, () => void>()(
  '@foldkit-visuals/charts/LiveRegistration',
) {}
