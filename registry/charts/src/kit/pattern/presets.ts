import { Match } from 'effect'
import { patternPresetTileSize } from './pattern-preset-helpers'
import type { PatternPresetId, PatternPresetOptions } from './pattern-preset-helpers'
import type { PatternLayer, PatternOrientationType, PatternCirclesProps } from './types'
import { PatternCircles, PatternLines } from './primitives'

function circlePreset(
  preset: 'dots' | 'circles',
  common: PatternCirclesProps,
  options: Readonly<PatternPresetOptions>,
  color: string,
  scale: number,
  tileStrokeWidth: number,
): PatternLayer {
  const explicitFill = options.fill !== undefined && options.fill !== ''
  const fill = explicitFill ? options.fill : undefined
  let appearance: PatternCirclesProps = { ...common }

  if (preset === 'circles') {
    if (fill !== undefined) {
      appearance = { ...appearance, fill }
    }

    return PatternCircles({
      ...appearance,
      radius: options.radius ?? 2 * scale,
      stroke: color,
      strokeWidth: options.strokeWidth ?? tileStrokeWidth,
    })
  }

  const filled = options.dotFill !== false
  const dotFill = filled ? (fill ?? color) : undefined
  const stroke = filled && explicitFill ? undefined : color

  if (dotFill !== undefined) {
    appearance = { ...appearance, fill: dotFill }
  }

  if (stroke !== undefined) {
    appearance = { ...appearance, stroke }
  }

  return PatternCircles({
    ...appearance,
    radius: options.radius ?? Math.max(0.5, 1.5 * scale),
    strokeWidth: filled && !explicitFill ? (options.strokeWidth ?? 0) : (options.strokeWidth ?? 1),
  })
}

export function renderPatternPreset(
  preset: PatternPresetId,
  id: string,
  options: Readonly<PatternPresetOptions> = {},
): PatternLayer | undefined {
  if (preset === 'none') {
    return undefined
  }

  const color = options.color ?? 'var(--chart-1)'
  const scale = options.scale ?? 1
  const tile = patternPresetTileSize(preset, scale)

  let common: PatternCirclesProps = {
    id,
    width: tile.width,
    height: tile.height,
  }

  if (options.tileBackground !== undefined && options.tileBackground !== '') {
    common = { ...common, background: options.tileBackground }
  }

  if (options.complement !== undefined) {
    common = { ...common, complement: options.complement }
  }

  if (preset === 'dots' || preset === 'circles') {
    return circlePreset(preset, common, options, color, scale, tile.strokeWidth)
  }

  const orientation = Match.value(preset).pipe(
    Match.when('cross', (): ReadonlyArray<PatternOrientationType> => [
      'diagonal',
      'diagonalRightToLeft',
    ]),
    Match.when('horizontal', (): ReadonlyArray<PatternOrientationType> => ['horizontal']),
    Match.when('vertical', (): ReadonlyArray<PatternOrientationType> => ['vertical']),
    Match.orElse((): ReadonlyArray<PatternOrientationType> => ['diagonal']),
  )

  return PatternLines({
    ...common,
    orientation,
    stroke: preset === 'accent' ? '#e879f9' : color,
    strokeWidth: options.strokeWidth ?? tile.strokeWidth,
  })
}
