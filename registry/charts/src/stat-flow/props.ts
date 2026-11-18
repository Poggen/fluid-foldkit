import { Schema, SchemaGetter, SchemaTransformation } from 'effect'

const StatValue = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.makeTransformation({
      decode: SchemaGetter.Number<string>(),
      encode: SchemaGetter.transform((value: number) =>
        Object.is(value, -0) ? '-0' : String(value),
      ),
    }),
  ),
)

export const ChartStatFlowFormat = Schema.Struct({
  notation: Schema.optionalKey(Schema.Literals(['standard', 'compact'])),
  compactDisplay: Schema.optionalKey(Schema.Literals(['short', 'long'])),
  minimumFractionDigits: Schema.optionalKey(Schema.Finite),
  maximumFractionDigits: Schema.optionalKey(Schema.Finite),
  minimumIntegerDigits: Schema.optionalKey(Schema.Finite),
  minimumSignificantDigits: Schema.optionalKey(Schema.Finite),
  maximumSignificantDigits: Schema.optionalKey(Schema.Finite),
  style: Schema.optionalKey(Schema.Literals(['decimal', 'percent', 'currency'])),
  currency: Schema.optionalKey(Schema.String),
  currencyDisplay: Schema.optionalKey(Schema.Literals(['symbol', 'narrowSymbol', 'code', 'name'])),
  unit: Schema.optionalKey(Schema.String),
  unitDisplay: Schema.optionalKey(Schema.Literals(['short', 'long', 'narrow'])),
})

export type ChartStatFlowFormat = Schema.Schema.Type<typeof ChartStatFlowFormat>

export const defaultChartStatFlowFormat: ChartStatFlowFormat = {
  notation: 'standard',
  maximumFractionDigits: 0,
}

export const chartCenterContainerClassName = 'bk-center'

export const chartCenterValueClassName = 'bk-center-value'

export const chartCenterLabelClassName = 'bk-center-label'

export const ChartStatFlowProps = Schema.Struct({
  value: StatValue,
  label: Schema.String,
  formatOptions: Schema.optionalKey(ChartStatFlowFormat),
  prefix: Schema.optionalKey(Schema.String),
  suffix: Schema.optionalKey(Schema.String),
  valueClassName: Schema.optionalKey(Schema.String),
  labelClassName: Schema.optionalKey(Schema.String),
})

export type ChartStatFlowProps = Schema.Schema.Type<typeof ChartStatFlowProps>

export const statFlowCodec = Schema.fromJsonString(ChartStatFlowProps)

export const formatStatValue: (props: ChartStatFlowProps) => string = (props: ChartStatFlowProps) =>
  `${props.prefix ?? ''}${new Intl.NumberFormat(undefined, props.formatOptions ?? defaultChartStatFlowFormat).format(props.value)}${props.suffix ?? ''}`
