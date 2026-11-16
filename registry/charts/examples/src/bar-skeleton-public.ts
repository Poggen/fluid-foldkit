import { Button } from '@foldkit/ui'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  BarLoadingSkeletonBlock,
  BarLoadingSkeletonLayer,
  barLoadingSkeletonConfiguration,
} from '@foldkit-visuals/charts/bar-skeleton'
import type { BarLoadingSkeletonProps } from '@foldkit-visuals/charts/bar-skeleton'

export { initialBarLoadingSkeletonPreference } from '@foldkit-visuals/charts/bar-skeleton'

export const initialConfiguration: BarLoadingSkeletonProps = {
  innerWidth: 400,
  innerHeight: 140,
}

const Model = Schema.Struct({ skeleton: BarLoadingSkeletonBlock.Model })

const Message = defineMessageUnion({
  ClickedRequestCenter: {},
  ClickedRequestBottom: {},
  ClickedRequestHidden: {},
})

export const PublicBarSkeletonHostKey = Symbol('PublicBarSkeletonHost')

export const PublicBarSkeletonHostBlock = Block.make('PublicBarSkeletonHost', {
  key: PublicBarSkeletonHostKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Schema.Boolean]),
  view: { kind: 'Document' },
})

export const SkeletonBinding = PublicBarSkeletonHostBlock.makeRequiredFieldBinding(
  BarLoadingSkeletonBlock,
  {
    field: 'skeleton',
    init: {
      contextToArgs: (reducedMotion: boolean) => [
        'standalone-bars',
        barLoadingSkeletonConfiguration(initialConfiguration),
        reducedMotion,
      ],
    },
  },
)

const PublicBarSkeletonHostComposition = PublicBarSkeletonHostBlock.makeComposition({
  bindings: [SkeletonBinding],
})

export const PublicBarSkeletonHostLayer = PublicBarSkeletonHostBlock.makeLayer({
  init: PublicBarSkeletonHostComposition.makeInit((reducedMotion: boolean) => ({
    model: {},
    childInitContext: reducedMotion,
  })),
  update: PublicBarSkeletonHostComposition.makeUpdate({
    ClickedRequestCenter: SkeletonBinding.requestConfigure({
      configuration: barLoadingSkeletonConfiguration({
        ...initialConfiguration,
        baseline: 'center',
      }),
    }),
    ClickedRequestBottom: SkeletonBinding.requestConfigure({
      configuration: barLoadingSkeletonConfiguration(initialConfiguration),
    }),
    ClickedRequestHidden: SkeletonBinding.requestConfigure({
      configuration: barLoadingSkeletonConfiguration({ ...initialConfiguration, innerWidth: 0 }),
    }),
  }),
  view: PublicBarSkeletonHostComposition.makeView((model, h) => ({
    title: 'Standalone BarLoadingSkeleton',
    body: h.div(
      [],
      [
        Button.view(
          {
            onClick: Message.ClickedRequestCenter(),
            toView: (attributes) => h.button([...attributes.button], ['Center baseline']),
          },
          h,
        ),
        Button.view(
          {
            onClick: Message.ClickedRequestBottom(),
            toView: (attributes) => h.button([...attributes.button], ['Bottom baseline']),
          },
          h,
        ),
        Button.view(
          {
            onClick: Message.ClickedRequestHidden(),
            toView: (attributes) => h.button([...attributes.button], ['Zero width']),
          },
          h,
        ),
        h.svg(
          [h.Id('bar-skeleton-svg'), h.Width('400'), h.Height('140'), h.ViewBox('0 0 400 140')],
          [h.block(SkeletonBinding.embedView({ slotId: 'bars', model: model.skeleton }))],
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(BarLoadingSkeletonLayer))
