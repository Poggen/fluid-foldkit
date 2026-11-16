import type { CartesianLayer } from './layers'

export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'line',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'line' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'area',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'area' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'patternArea',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'patternArea' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'scatter',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'scatter' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'background',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'background' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'grid',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'grid' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'xAxis',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'xAxis' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'yAxis',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'yAxis' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'tooltip',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'tooltip' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'profitLossLine',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'profitLossLine' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'seriesMarkers',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'seriesMarkers' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'markers',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'markers' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'markerGroup',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'markerGroup' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'projection',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'projection' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'projectionMarker',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'projectionMarker' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: 'terminalMarker',
): Array<Extract<CartesianLayer<Row>, { readonly kind: 'terminalMarker' }>['props']>
export function propsFor<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  kind: CartesianLayer<Row>['kind'],
): Array<CartesianLayer<Row>['props']> {
  return children.filter((child) => child.kind === kind).map((child) => child.props)
}
