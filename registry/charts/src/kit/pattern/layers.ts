import { Match } from 'effect'
import type { CartesianLayer } from '../../cartesian/layers'
import type { BarLayer } from '../../bar/options'
import type { PatternResource } from './types'
import { scopePatternPaint } from './resources'

export function patternResources<Row>(
  children: ReadonlyArray<BarLayer<Row>>,
): ReadonlyArray<PatternResource> {
  return children.flatMap((child) => (child.kind === 'pattern' ? [child.props] : []))
}

export function scopeCartesianPatternLayer<Row>(
  child: CartesianLayer<Row>,
  prefix: string,
  resources: ReadonlyArray<PatternResource>,
): CartesianLayer<Row> {
  if (resources.length === 0) {
    return child
  }

  const paint = (value: string) => scopePatternPaint(value, prefix, resources)

  return Match.value(child).pipe(
    Match.discriminator('kind')('line', (line) => {
      const scoped = { ...line, props: { ...line.props } }

      if (scoped.props.stroke !== undefined) {
        scoped.props.stroke = paint(scoped.props.stroke)
      }

      return scoped
    }),
    Match.discriminator('kind')('area', (area) => {
      const scoped = { ...area, props: { ...area.props } }

      if (scoped.props.fill !== undefined) {
        scoped.props.fill = paint(scoped.props.fill)
      }

      if (scoped.props.stroke !== undefined) {
        scoped.props.stroke = paint(scoped.props.stroke)
      }

      return scoped
    }),
    Match.discriminator('kind')('patternArea', (area) => {
      const scoped = { ...area, props: { ...area.props } }

      if (scoped.props.fill !== undefined) {
        scoped.props.fill = paint(scoped.props.fill)
      }

      if (scoped.props.patternColor !== undefined) {
        scoped.props.patternColor = paint(scoped.props.patternColor)
      }

      return scoped
    }),
    Match.discriminator('kind')('referenceArea', (area) => {
      const scoped = { ...area, props: { ...area.props } }

      if (scoped.props.fill !== undefined) {
        scoped.props.fill = paint(scoped.props.fill)
      }

      if (scoped.props.stroke !== undefined) {
        scoped.props.stroke = paint(scoped.props.stroke)
      }

      return scoped
    }),
    Match.discriminator('kind')('candlestick', (candlestick) => {
      const scoped = { ...candlestick, props: { ...candlestick.props } }

      if (scoped.props.positiveFill !== undefined) {
        scoped.props.positiveFill = paint(scoped.props.positiveFill)
      }

      if (scoped.props.negativeFill !== undefined) {
        scoped.props.negativeFill = paint(scoped.props.negativeFill)
      }

      if (scoped.props.bodyPatternPositive !== undefined) {
        scoped.props.bodyPatternPositive = paint(scoped.props.bodyPatternPositive)
      }

      if (scoped.props.bodyPatternNegative !== undefined) {
        scoped.props.bodyPatternNegative = paint(scoped.props.bodyPatternNegative)
      }

      return scoped
    }),
    Match.discriminator('kind')('scatter', (scatter) => {
      const scoped = { ...scatter, props: { ...scatter.props } }

      if (scoped.props.fill !== undefined) {
        scoped.props.fill = paint(scoped.props.fill)
      }

      if (scoped.props.stroke !== undefined) {
        scoped.props.stroke = paint(scoped.props.stroke)
      }

      return scoped
    }),
    Match.orElse((unpainted) => unpainted),
  )
}

export function scopeCartesianPatternLayers<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  prefix: string,
  resources: ReadonlyArray<PatternResource>,
): ReadonlyArray<CartesianLayer<Row>> {
  return resources.length === 0
    ? children
    : children.map((child) => scopeCartesianPatternLayer(child, prefix, resources))
}

export function scopeBarPatternLayers<Row>(
  children: ReadonlyArray<BarLayer<Row>>,
  prefix: string,
  resources: ReadonlyArray<PatternResource>,
): ReadonlyArray<BarLayer<Row>> {
  if (resources.length === 0) {
    return children
  }

  const paint = (value: string) => scopePatternPaint(value, prefix, resources)

  return children.map((child) =>
    Match.value(child).pipe(
      Match.discriminator('kind')('bar', (bar) => {
        const scoped = { ...bar, props: { ...bar.props } }

        if (scoped.props.fill !== undefined) {
          scoped.props.fill = paint(scoped.props.fill)
        }

        return scoped
      }),
      Match.discriminator('kind')('barSquares', (bar) => {
        const scoped = { ...bar, props: { ...bar.props } }

        if (scoped.props.fill !== undefined) {
          scoped.props.fill = paint(scoped.props.fill)
        }

        return scoped
      }),
      Match.discriminator('kind')('barColumnTrack', (bar) => {
        const scoped = { ...bar, props: { ...bar.props } }

        if (scoped.props.fill !== undefined) {
          scoped.props.fill = paint(scoped.props.fill)
        }

        return scoped
      }),
      Match.discriminator('kind')('barDepthProvider', (provider) => {
        const scoped = { ...provider, props: { ...provider.props } }

        if (scoped.props.children !== undefined) {
          scoped.props.children = scopeBarPatternLayers(scoped.props.children, prefix, resources)
        }

        return scoped
      }),
      Match.discriminator('kind')('barDepthBack', (unpainted) => unpainted),
      Match.discriminator('kind')('barDepthFront', (unpainted) => unpainted),
      Match.discriminator('kind')('barPulse', (unpainted) => unpainted),
      Match.discriminator('kind')('barXAxis', (unpainted) => unpainted),
      Match.discriminator('kind')('barYAxis', (unpainted) => unpainted),
      Match.orElse((cartesian) => scopeCartesianPatternLayer(cartesian, prefix, resources)),
    ),
  )
}
