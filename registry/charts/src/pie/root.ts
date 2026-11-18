import { createContainerRef } from './private/container-ref'
import type { ContainerRef } from './private/container-ref'
import { pieContext } from './context'
import { polarServerView } from './private/server'
import { Option } from 'effect'
import type { Schema } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import { polarRecipe } from './private/block'
import type { PolarControl, PolarInputs } from './private/block'
import type { PieData, PieChartProps } from './options'
import { PieHost } from './host'

export const pieInputs: <Row extends PieData = PieData>(
  id: string,
  props: PieChartProps,
  containerRef?: ContainerRef,
) => PolarInputs<Row> = function pieInputs<Row extends PieData = PieData>(
  id: string,
  props: PieChartProps,
  containerRef: ContainerRef = createContainerRef(),
) {
  const inputs: PolarInputs<Row> = {
    mount: (element, data, focus, observe, clock, observeSize) =>
      new PieHost(element, props, id, data, focus, observe, clock, observeSize, containerRef),
    configure: (host) => {
      if (!(host instanceof PieHost)) {
        throw new TypeError('Pie inputs require Pie host')
      }

      host.configure(props)
    },
    serverContent: (data) =>
      polarServerView(
        'pie',
        props.size,
        props.className,
        (props.innerRadius ?? 0) <= 0
          ? []
          : props.children.flatMap((c) =>
              c.kind === 'center'
                ? [
                    {
                      options: c.props,
                      radius: props.innerRadius ?? 0,
                      value: data.reduce((a, d) => a + d.value, 0),
                    },
                  ]
                : [],
            ),
        props.style,
      ),
    customContent: (data, index) => {
      const datum = props.geometryScrubbing === true || index === null ? undefined : data[index]

      if (datum === undefined || (props.innerRadius ?? 0) <= 0) {
        return h.empty
      }

      return h.div(
        [h.Class('items-center flex inset-0 justify-center pointer-events-none absolute')],
        props.children.flatMap((child) => {
          if (child.kind !== 'center' || child.props.children === undefined) {
            return []
          }

          const side = (props.innerRadius ?? 0) * 2 - 16

          return [
            h.div(
              [
                h.Class(
                  [
                    'items-center flex justify-center',
                    [
                      'ts-bkm-center-stat [[data-bkm-chart]_&]:[width:var(--bkm-center-side,100%)] [[data-bkm-chart]_&]:[height:var(--bkm-center-side,100%)]',
                      child.props.className ?? '',
                    ]
                      .filter(Boolean)
                      .join(' '),
                  ]
                    .filter(Boolean)
                    .join(' '),
                ),
                h.DataAttribute('slot', 'center-stat'),
                h.Style({
                  '--bkm-center-side': Number.isFinite(side) && side >= 0 ? `${side}px` : '100%',
                }),
              ],
              [
                child.props.children({
                  data: datum,
                  value: datum.value,
                  label: datum.label,
                  isHovered: true,
                }),
              ],
            ),
          ]
        }),
      )
    },
  }

  return (
    props.size === undefined ? inputs : { ...inputs, size: props.size }
  ) satisfies PolarInputs<Row>
}

export const polarControl: (props: {
  readonly hoveredIndex?: number | null
}) => PolarControl = (props: { readonly hoveredIndex?: number | null }) => ({
  controlled: props.hoveredIndex !== undefined,
  index: Option.fromNullishOr(props.hoveredIndex),
})

export function PieChart<RowSchema extends Schema.Codec<PieData, Schema.Json>>({
  name,
  Row,
}: {
  readonly name: string
  readonly Row: RowSchema
}) {
  const containerRef = createContainerRef()
  const { namespace, contract, plans } = polarRecipe({ name, Row })

  return {
    namespace,
    contract,
    plans,
    inputs: (id: string, props: PieChartProps) =>
      pieInputs<RowSchema['Type']>(id, props, containerRef),
    configuration: polarControl,
    context: (
      model: typeof contract.Model.Type,
      props: PieChartProps,
      setHoveredIndex: (index: number | null) => void,
    ) =>
      pieContext(
        { ...props, data: model.data },
        model.size,
        model.id,
        { hoveredIndex: Option.getOrNull(model.focusedIndex), setHoveredIndex },
        { isLoaded: model.isMounted && model.hostReady, containerRef },
      ),
  }
}
