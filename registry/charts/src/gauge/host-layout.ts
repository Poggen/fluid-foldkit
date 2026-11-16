import { ARC_ASPECT } from './definition'
import type { GaugeProps } from './props'

const itemAlignment = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
}

const selfAlignment = {
  start: 'self-start',
  end: 'self-end',
  center: 'self-center',
}

const labelLayout = (props: GaugeProps, linear: boolean, trackHeight: number) => {
  const hasLabel = props.centerValue !== undefined
  const placement = props.labelPlacement ?? 'top'
  const vertical = placement === 'top' || placement === 'bottom'
  const labelFirst = placement === 'top' || placement === 'left'
  const align = props.labelAlign ?? 'start'
  const labelledOrder = labelFirst ? 'label-first' : 'label-last'

  return {
    hasLabel,
    labelFirst,
    nextLayout: linear
      ? `linear/${props.width === undefined ? 'fluid' : 'fixed'}/${hasLabel ? labelledOrder : 'unlabelled'}`
      : 'arc',
    nextLabelKind: hasLabel ? (linear ? 'linear' : 'arc') : 'none',
    linearLayoutClass: hasLabel
      ? `flex gap-3 min-w-0 w-full ${itemAlignment[align]} ${vertical ? 'flex-col' : 'flex-row'}`
      : 'min-w-0 w-full',
    linearTrackClass: vertical ? 'min-w-0 w-full' : 'flex-1 min-w-0',
    linearClipClass: 'bk-gauge-clip h-[var(--bkm-gauge-height)] min-w-[var(--bkm-gauge-min-width)]',
    linearClipStyle: `--bkm-gauge-height:${trackHeight}px;--bkm-gauge-min-width:${props.minWidth ?? 200}px`,
    labelClass: vertical ? selfAlignment[align] : 'shrink-0',
  }
}

const boxLayout = (props: GaugeProps, linear: boolean, fixed: boolean, trackHeight: number) => {
  const arcClass = fixed
    ? 'bk-gauge-host [container-type:size] h-[var(--bkm-gauge-height)] w-[var(--bkm-gauge-width)]'
    : 'bk-gauge-host bk-gauge-host-fluid [container-type:size] max-w-[560px]'

  return {
    boxClass: linear ? 'h-[var(--bkm-gauge-height)] w-[var(--bkm-gauge-width)]' : arcClass,
    boxStyle:
      linear || fixed
        ? `--bkm-gauge-height:${linear ? trackHeight : props.height}px;--bkm-gauge-width:${props.width === undefined ? '100%' : `${props.width}px`}`
        : '',
    wrapperClass: `ts-chart-host relative w-[var(--bkm-gauge-wrapper-width)] ${linear || fixed ? 'h-[var(--bkm-gauge-wrapper-height)]' : 'aspect-[var(--bkm-gauge-aspect)]'}`,
    wrapperStyle: `--bkm-gauge-wrapper-width:${props.width === undefined || (!linear && !fixed) ? '100%' : `${props.width}px`};${linear || fixed ? `--bkm-gauge-wrapper-height:${linear ? trackHeight : props.height}px` : `--bkm-gauge-aspect:${ARC_ASPECT}`}`,
  }
}

export const gaugeLayout = (props: GaugeProps) => {
  const linear = props.orientation === 'linear'
  const fixed = props.width !== undefined && props.height !== undefined
  const trackHeight =
    linear && props.width === undefined
      ? (props.linearHeight ?? 24)
      : (props.height ?? props.linearHeight ?? 24)

  return {
    linear,
    rootClass: [
      linear ? 'bk-gauge-flow' : 'bk-gauge',
      !linear && fixed ? 'bk-gauge-fixed' : '',
      !linear && !fixed ? 'min-w-[var(--bkm-gauge-root-min-width)]' : '',
      props.className ?? '',
    ]
      .filter(Boolean)
      .join(' '),
    rootStyle: linear || fixed ? '' : `--bkm-gauge-root-min-width:${props.minWidth ?? 300}px`,
    ...boxLayout(props, linear, fixed, trackHeight),
    ...labelLayout(props, linear, trackHeight),
  }
}

const textAlignment = {
  start: 'text-left',
  end: 'text-right',
  center: 'text-center',
}

export const gaugeLabelClasses = (props: GaugeProps, arc: boolean) => {
  const align = props.labelAlign ?? 'start'
  return {
    outer: arc
      ? 'absolute inset-0 flex items-center justify-center pt-[8cqh] pointer-events-none'
      : selfAlignment[align],
    inner: [
      'ts-bkm-center-stat',
      // Arc sizing overrides the shared full-size centre-stat defaults.
      arc
        ? 'flex flex-col items-center justify-center text-center h-[max(88px,calc(40cqh_-_16px))]! w-[max(88px,calc(40cqh_-_16px))]!'
        : `flex flex-col min-w-0 ${itemAlignment[align]} ${textAlignment[align]}`,
    ].join(' '),
  }
}
