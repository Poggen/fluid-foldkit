import { Context } from 'effect'

export class CartesianRegistration extends Context.Service<CartesianRegistration, () => void>()(
  '@foldkit-visuals/charts/CartesianRegistration',
) {}
