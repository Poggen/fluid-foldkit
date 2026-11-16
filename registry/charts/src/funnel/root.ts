import { inertHtml as h } from 'foldkit/html'
import { polarRecipe } from '../pie/private/block'
import type { PolarInputs } from '../pie/private/block'
import { polarControl } from '../pie/root'
import { cartesianServerView } from '../cartesian/server-view'
import { chartStyleText } from '../cartesian/style'
import { FunnelDatumSchema } from './options'
import type { FunnelChartProps, FunnelStage } from './options'
import { FunnelHost } from './host'
import { funnelDefinition } from './definition'
import { funnelEntranceVars, funnelHoverVars, funnelStageCss } from './host-vars'
import { popExtra } from './marks'

export function FunnelChart({ name }: { readonly name: string }) {
  const { namespace, contract, plans } = polarRecipe({
    name,
    Row: FunnelDatumSchema,
    acceptedLayout: true,
  })

  return {
    namespace,
    contract,
    plans,
    configuration: polarControl,
    inputs: (id: string, props: FunnelChartProps): PolarInputs<FunnelStage> => ({
      layout: 'contents',
      mount: (element, data, focus, observe, clock, observeSize) =>
        new FunnelHost(element, props, id, data, focus, observe, clock, observeSize),
      configure: (host) => {
        if (!(host instanceof FunnelHost)) {
          throw new TypeError('Funnel inputs require FunnelHost')
        }

        host.configure(props)
      },
      customContent: () => h.empty,
      serverContent: (data) =>
        data.length === 0
          ? h.empty
          : h.div(
              [
                h.DataAttribute('bkm-chart', 'funnel'),
                h.DataAttribute('bkm-funnel-id', encodeURIComponent(id)),
                h.DataAttribute('slot', 'chart'),
                h.Class(
                  ['relative select-none w-full', props.className ?? ''].filter(Boolean).join(' '),
                ),
                h.Attribute(
                  'style',
                  chartStyleText({
                    ...funnelHoverVars(
                      Math.max(1, props.layers ?? 3),
                      props.orientation !== 'vertical',
                      popExtra,
                    ),
                    ...funnelEntranceVars({
                      durationSec: props.enterTransition?.duration ?? 1.1,
                      ease: Array.isArray(props.enterTransition?.ease)
                        ? props.enterTransition.ease
                        : undefined,
                      horizontal: props.orientation !== 'vertical',
                      staggerDelaySec: props.staggerDelay ?? 0.12,
                    }),
                    ...props.style,
                  }),
                ),
              ],
              [
                h.style([], [funnelStageCss(id, data.length, Math.max(1, props.layers ?? 3))]),
                cartesianServerView(
                  funnelDefinition({ ...props, data }, id, false),
                  640,
                  640 / (props.orientation === 'vertical' ? 1 / 1.8 : 2.2),
                  id,
                  props.ariaLabel ?? 'Funnel chart',
                ),
              ],
            ),
    }),
  }
}
