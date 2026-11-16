export type PatternLinecap = 'square' | 'butt' | 'round' | 'inherit'

export type PatternOrientationType = 'vertical' | 'horizontal' | 'diagonal' | 'diagonalRightToLeft'

interface PatternPaint {
  readonly className: string | undefined
  readonly fill: string | undefined
  readonly stroke: string | undefined
  readonly strokeWidth: string | number | undefined
  readonly strokeDasharray: string | number | undefined
}

export type PatternShape =
  | ({
      readonly kind: 'circle'
      readonly key: string
      readonly cx: number
      readonly cy: number
      readonly radius: number
    } & PatternPaint)
  | ({
      readonly kind: 'path'
      readonly key: string
      readonly path: string
      readonly strokeLinecap: PatternLinecap
      readonly shapeRendering: string | number
    } & PatternPaint)
  | {
      readonly kind: 'rect'
      readonly key: string
      readonly width: number
      readonly height: number
      readonly fill: string
      readonly className: string | undefined
    }

export interface PatternResource {
  readonly translate?: readonly [number, number]
  readonly id: string
  readonly width: number
  readonly height: number
  readonly shapes: ReadonlyArray<PatternShape>
}

export interface PatternLayer {
  readonly kind: 'pattern'
  readonly props: PatternResource
}

export interface PatternStyleProps {
  readonly id: string
  readonly className?: string
  readonly background?: string
  readonly stroke?: string
  readonly strokeWidth?: number | string
  readonly strokeDasharray?: number | string
}

export interface PatternCirclesProps extends PatternStyleProps {
  readonly width: number
  readonly height: number
  readonly radius?: number
  readonly fill?: string
  readonly complement?: boolean
}

export interface PatternPathProps extends PatternStyleProps {
  readonly fill?: string
  readonly strokeLinecap?: PatternLinecap
  readonly shapeRendering?: string | number
}

export interface PatternHexagonsProps extends PatternPathProps {
  readonly height: number
  readonly size?: number
}

export interface PatternWavesProps extends PatternPathProps {
  readonly width: number
  readonly height: number
}

export interface PatternLinesProps extends PatternStyleProps {
  readonly width: number
  readonly height: number
  readonly orientation?: PatternOrientationType | ReadonlyArray<PatternOrientationType>
  readonly strokeLinecap?: PatternLinecap
  readonly shapeRendering?: string | number
}
