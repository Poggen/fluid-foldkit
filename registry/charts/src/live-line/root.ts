import { liveTooltipView } from './tooltip-view'
import { inertHtml as h } from 'foldkit/html'
import { defineLiveLineRecipe } from './block'
import type { LiveInputs } from './block'
import { LiveConfiguration } from './state'
import type { LiveLinePoint, LiveLineChartProps } from './options'
import { LiveLineHost } from './host'
import { parseHeight } from './geometry'
import { chartStyleText } from '../cartesian/style'

export function LiveLineChart({ name }: { readonly name: string }) {
  const recipe = defineLiveLineRecipe(name)

  return {
    ...recipe,
    configuration: (props: LiveLineChartProps) => new LiveConfiguration(props),
    inputs: (id: string, props: LiveLineChartProps) => {
      const inputs: LiveInputs<LiveLinePoint> = {
        layout: 'contents',
        mount: (
          element,
          _data,
          _focus,
          observeCursor,
          clock,
          observeSize,
          state,
          observeClock,
          wallClock,
          observeTooltip,
          cursor,
          needsClock,
        ) =>
          new LiveLineHost(
            element,
            props,
            id,
            state,
            clock,
            observeSize,
            observeClock,
            wallClock,
            observeTooltip,
            observeCursor,
            cursor,
            needsClock,
          ),
        configure: (host) => {
          if (!(host instanceof LiveLineHost)) {
            throw new TypeError('LiveLine requires its native host')
          }

          host.configure(props)
        },
        customContent: (_data, _focus, _size, tooltip, state) =>
          liveTooltipView(props, tooltip, id, state.frame?.momentum),
        serverContent: () =>
          h.div([
            h.DataAttribute('bkm-chart', 'liveline'),
            h.Class(['w-full', props.className ?? ''].filter(Boolean).join(' ')),
            h.Attribute(
              'style',
              chartStyleText({
                ...props.style,
                height: parseHeight(props.style?.height),
              }),
            ),
          ]),
      }

      return (
        props.style === undefined ? inputs : { ...inputs, surfaceStyle: props.style }
      ) satisfies LiveInputs<LiveLinePoint>
    },
  }
}
