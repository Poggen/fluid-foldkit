import { Option } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import { polarRecipe } from '../pie/private/block'
import type { PolarInputs } from '../pie/private/block'
import { polarControl } from '../pie/root'
import { RadarDatum } from './options'
import type { RadarChartProps } from './options'
import type { RadarData } from './rows'
import { RadarHost } from './host'
import { radarContext } from './context'
import { chartStyleText } from '../cartesian/style'
import { radarEntranceKey, radarEntranceResource } from './entrance'
import { radarEntranceProperties } from './host-style'

function radarServerStyle(props: RadarChartProps) {
  const entrance = (props.animate ?? true) ? radarEntranceProperties(props) : undefined
  const fixed = props.size !== undefined && props.size !== 0 && !Number.isNaN(props.size)
  const style = fixed ? { ...entrance, width: props.size, height: props.size } : entrance

  return chartStyleText({ ...style, ...props.style })
}

export function RadarChart({ name }: { readonly name: string }) {
  const { namespace, contract, plans } = polarRecipe({ name, Row: RadarDatum })

  return {
    namespace,
    contract,
    plans,
    configuration: polarControl,
    inputs: (id: string, props: RadarChartProps): PolarInputs<RadarData> => ({
      layout: 'contents',
      mount: (element, data, focus, observe, clock, observeSize) =>
        new RadarHost(element, id, props, data, focus, observe, clock, observeSize),
      configure: (host) => {
        if (!(host instanceof RadarHost)) {
          throw new TypeError('Radar inputs require RadarHost')
        }

        host.configure(props)
      },
      customContent: () => h.empty,
      serverContent: () =>
        props.metrics.length === 0 ||
        (props.size !== undefined && props.size !== 0 && props.size < 10)
          ? h.empty
          : h.div(
              [
                h.Class(
                  [
                    'bk-radar',
                    props.size !== undefined && props.size !== 0 && !Number.isNaN(props.size)
                      ? 'bk-radar-fixed'
                      : 'bk-radar-fluid',
                    props.className ?? '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                ),
                h.DataAttribute('bkm-radar', ''),
                h.DataAttribute('bkm-radar-scope', radarEntranceKey(id)),
                ...((props.animate ?? true) ? [h.DataAttribute('bkm-enter', '')] : []),
                h.Attribute('style', radarServerStyle(props)),
              ],
              [h.style([], [radarEntranceResource(id, props.levels ?? 5).css])],
            ),
    }),
    context: (
      model: typeof contract.Model.Type,
      props: RadarChartProps,
      setHoveredIndex: (index: number | null) => void,
    ) =>
      radarContext(
        {
          ...props,
          data: model.data,
          size:
            props.size === undefined || props.size === 0 || Number.isNaN(props.size)
              ? model.size
              : props.size,
        },
        Option.getOrNull(model.focusedIndex),
        setHoveredIndex,
      ),
  }
}
