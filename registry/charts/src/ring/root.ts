import { Option } from 'effect'
import type { Schema } from 'effect'
import { ringContext } from './context'
import { polarServerView } from '../pie/private/server'
import { inertHtml as h } from 'foldkit/html'
import { polarRecipe } from '../pie/private/block'
import type { PolarInputs } from '../pie/private/block'
import { polarControl } from '../pie/root'
import { createContainerRef } from '../pie/private/container-ref'
import type { ContainerRef } from '../pie/private/container-ref'
import type { RingData, RingChartProps } from './options'
import { RingHost } from './host'
import { ringGeometry } from './geometry'

export function ringInputs<Row extends RingData = RingData>(
  id: string,
  props: RingChartProps,
  containerRef: ContainerRef = createContainerRef(),
): PolarInputs<Row> {
  const inputs: PolarInputs<Row> = {
    mount: (element, data, focus, observe, clock, observeSize) =>
      new RingHost(element, props, id, data, focus, observe, clock, observeSize, containerRef),
    configure: (host) => {
      if (!(host instanceof RingHost)) {
        throw new TypeError('Ring inputs require Ring host')
      }

      host.configure(props)
    },
    serverContent: (data) =>
      polarServerView(
        'ring',
        props.size,
        props.className,
        props.children.flatMap((c) =>
          c.kind === 'center'
            ? [
                {
                  options: c.props,
                  radius: ringGeometry(
                    { ...props, data },
                    props.size === undefined || props.size === 0 || Number.isNaN(props.size)
                      ? 640
                      : props.size,
                  ).baseInnerRadius,
                  value: data.reduce((a, d) => a + d.value, 0),
                },
              ]
            : [],
        ),
        props.style,
      ),
    customContent: (data, index, size) => {
      const datum = index === null ? undefined : data[index]

      if (datum === undefined) {
        return h.empty
      }

      const radius = ringGeometry({ ...props, data }, size).baseInnerRadius
      const side = radius * 2 - 16

      return h.div(
        [h.Class('items-center flex inset-0 justify-center pointer-events-none absolute')],
        props.children.flatMap((c) =>
          c.kind === 'center' && c.props.children !== undefined
            ? [
                h.div(
                  [
                    h.Class(
                      [
                        'items-center flex justify-center',
                        [
                          'ts-bkm-center-stat [[data-bkm-chart]_&]:[width:var(--bkm-center-side,100%)] [[data-bkm-chart]_&]:[height:var(--bkm-center-side,100%)]',
                          c.props.className ?? '',
                        ]
                          .filter(Boolean)
                          .join(' '),
                      ]
                        .filter(Boolean)
                        .join(' '),
                    ),
                    h.DataAttribute('slot', 'center-stat'),
                    h.Style({
                      '--bkm-center-side':
                        Number.isFinite(side) && side >= 0 ? `${side}px` : '100%',
                    }),
                  ],
                  [
                    c.props.children({
                      data: datum,
                      value: datum.value,
                      label: datum.label,
                      isHovered: true,
                    }),
                  ],
                ),
              ]
            : [],
        ),
      )
    },
  }

  return props.size === undefined ? inputs : { ...inputs, size: props.size }
}

export function RingChart<RowSchema extends Schema.Codec<RingData, Schema.Json>>({
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
    inputs: (id: string, props: RingChartProps) =>
      ringInputs<RowSchema['Type']>(id, props, containerRef),
    configuration: polarControl,
    context: (
      model: typeof contract.Model.Type,
      props: RingChartProps,
      setHoveredIndex: (index: number | null) => void,
    ) =>
      ringContext(
        { ...props, data: model.data },
        model.size,
        {
          hoveredIndex: Option.getOrNull(model.focusedIndex),
          setHoveredIndex,
        },
        containerRef,
      ),
  }
}
