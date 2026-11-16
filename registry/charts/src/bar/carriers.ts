import type {
  BarProps,
  BarSquaresProps,
  BarColumnTrackProps,
  BarXAxisProps,
  BarYAxisProps,
  BarDepthProviderProps,
  BarDepthBackProps,
  BarDepthFrontProps,
  BarPulseProps,
} from './options'

const carrier = <Kind extends string, Props>(kind: Kind, props: Props) => ({ kind, props })

export const Bar = <const Key extends string>(props: BarProps<Key>) => carrier('bar', props)

export const BarSquares = <const Key extends string>(props: BarSquaresProps<Key>) =>
  carrier('barSquares', props)

export const BarColumnTrack = (props: BarColumnTrackProps = {}) => carrier('barColumnTrack', props)

export const BarXAxis = (props: BarXAxisProps = {}) => carrier('barXAxis', props)

export const BarYAxis = (props: BarYAxisProps = {}) => carrier('barYAxis', props)

export const BarDepthProvider = <Row>(props: BarDepthProviderProps<Row> = {}) =>
  carrier('barDepthProvider', props)

export const BarDepthBack = <const Key extends string, Row>(props: BarDepthBackProps<Key, Row>) =>
  carrier('barDepthBack', props)

export const BarDepthFront = <const Key extends string>(props: BarDepthFrontProps<Key>) =>
  carrier('barDepthFront', props)

export const BarPulse = <const Key extends string>(props: BarPulseProps<Key>) =>
  carrier('barPulse', props)
