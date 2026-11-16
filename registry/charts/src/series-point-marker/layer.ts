import { modifyFields } from 'foldkit/struct'
import { SeriesPointMarkerBlock } from './block'
import { ENTRANCE_ATTRIBUTE, entranceAttribute, observeSeriesPointMarker } from './animation'
import type { SeriesPointMarkerProps } from './props'

const { Message } = SeriesPointMarkerBlock

const Entrance = SeriesPointMarkerBlock.makeMountStream('SeriesPointMarkerEntrance', {
  messages: [Message.CompletedMount],
  *handler() {
    return ({ element, viewStateChanges }) =>
      observeSeriesPointMarker(element, viewStateChanges, Message.CompletedMount())
  },
})

const SeriesPointMarkerComposition = SeriesPointMarkerBlock.makeComposition({
  mounts: [Entrance],
})

const plans = {
  init: SeriesPointMarkerComposition.makeInit((configuration: SeriesPointMarkerProps) => ({
    model: { configuration },
  })),
  update: SeriesPointMarkerComposition.makeUpdate({
    CompletedMount: SeriesPointMarkerBlock.makeNoopStep(),
  }),
  inMessageUpdate: SeriesPointMarkerComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  view: SeriesPointMarkerComposition.makeView((model, h) => {
    const {
      cx,
      cy,
      fill,
      stroke,
      strokeWidth = 2,
      ringGap = 2,
      outlineWidth = 0,
      outlineColor,
      radius = 5,
    } = model.configuration

    const resolvedStroke = stroke ?? fill ?? 'currentColor'
    const ringOuter = strokeWidth > 0 ? radius + ringGap + strokeWidth : radius

    return h.g(
      [h.Transform(`translate(${cx}, ${cy})`)],
      [
        h.g(
          [
            h.Attribute(ENTRANCE_ATTRIBUTE, entranceAttribute(model.configuration)),
            h.OnMount(Entrance()),
          ],
          [
            ...(outlineWidth > 0
              ? [
                  h.circle([
                    h.Cx('0'),
                    h.Cy('0'),
                    h.Fill('none'),
                    h.R(String(ringOuter + outlineWidth / 2)),
                    h.Stroke(outlineColor ?? resolvedStroke),
                    h.StrokeWidth(String(outlineWidth)),
                  ]),
                ]
              : []),
            h.circle([
              h.Cx('0'),
              h.Cy('0'),
              ...(fill === undefined ? [] : [h.Fill(fill)]),
              h.R(String(radius)),
            ]),
            ...(strokeWidth > 0
              ? [
                  h.circle([
                    h.Cx('0'),
                    h.Cy('0'),
                    h.Fill('none'),
                    h.R(String(radius + ringGap + strokeWidth / 2)),
                    h.Stroke(resolvedStroke),
                    h.StrokeWidth(String(strokeWidth)),
                  ]),
                ]
              : []),
          ],
        ),
      ],
    )
  }),
  EffectsLayer: Entrance.layer,
}

export const SeriesPointMarkerLayer = SeriesPointMarkerBlock.makeLayer<typeof plans>(plans)
