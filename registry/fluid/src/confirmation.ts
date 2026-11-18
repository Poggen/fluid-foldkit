/* @license Derived from Fluid Functionalism confirmation. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  BannerBlock,
  layer as BannerLayer,
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerAction,
  createBannerMotionScope,
} from './banner.js'
import type { BannerViewInputs } from './banner.js'
import type { IconName } from './icons.js'
import { resolvePresentation } from './presentation.js'
import { createTargetMotionScope } from './motion-target.js'
import { spring } from './lib/springs.js'
import { typeClass } from './lib/type-scale.js'

export const ConfirmationState = Schema.Literals(['requested', 'approved', 'denied'])
export type ConfirmationState = typeof ConfirmationState.Type
export const ConfirmationConfig = Schema.Struct({
  id: Schema.String,
  state: Schema.optionalKey(ConfirmationState),
  open: Schema.optionalKey(Schema.Boolean),
  reduceMotion: Schema.optionalKey(Schema.Boolean),
})
export type ConfirmationConfig = typeof ConfirmationConfig.Type
export interface ConfirmationViewInputs extends Omit<
  BannerViewInputs,
  'children' | 'animate' | 'icon' | 'role'
> {
  readonly title: Html | string
  readonly description?: Html | string
  readonly icon?: IconName
  readonly approveLabel?: string
  readonly denyLabel?: string
  readonly approvedLabel?: string
  readonly deniedLabel?: string
}
export type ConfirmationProps = ConfirmationViewInputs
const Message = defineMessageUnion({ ClickedApprove: {}, ClickedDeny: {} })
const OutMessage = defineMessageUnion({ Approved: {}, Denied: {}, Dismissed: {}, Exited: {} })
const InMessage = defineInMessageUnion({
  RequestedState: { state: ConfirmationState },
  RequestedConfigureOpen: { open: Schema.NullOr(Schema.Boolean) },
  RequestedOpen: {},
  RequestedDismiss: {},
  RequestedReset: {},
})
export const ConfirmationKey = Symbol('Confirmation')
export const ConfirmationBlock = Block.make('Confirmation', {
  key: ConfirmationKey,
  Model: Schema.Struct({ id: Schema.String, state: ConfirmationState, banner: BannerBlock.Model }),
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([ConfirmationConfig]),
  ChildInitContext: ConfirmationConfig,
  effects: Block.makeEffectsContract<never, never>(),
  inMessageOutputs: { RequestedDismiss: { outMessage: OutMessage } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<ConfirmationViewInputs>() },
})
const Banner = ConfirmationBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: {
    contextToArgs: (config: ConfirmationConfig) => [
      { ...config, reduceMotion: config.reduceMotion ?? false },
    ],
  },
}).withOutMessagePolicy({
  fold: ConfirmationBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: () =>
      ConfirmationBlock.makeStep((model) =>
        Update.withOutMessage({ model }, OutMessage.Dismissed()),
      ),
    Exited: () =>
      ConfirmationBlock.makeStep((model) => Update.withOutMessage({ model }, OutMessage.Exited())),
  }),
})
const ConfirmationComposition = ConfirmationBlock.makeComposition({ bindings: [Banner] })
const init = ConfirmationComposition.makeInit((config) => ({
  childInitContext: config,
  model: { id: config.id, state: config.state ?? 'requested' },
}))
const update = ConfirmationComposition.makeUpdate({
  ClickedApprove: (model) =>
    model.state === 'requested'
      ? Update.withOutMessage({ model }, OutMessage.Approved())
      : { model },
  ClickedDeny: (model) =>
    model.state === 'requested' ? Update.withOutMessage({ model }, OutMessage.Denied()) : { model },
})
const inMessageUpdate = ConfirmationComposition.makeInMessageUpdate({
  RequestedState: ConfirmationBlock.makeFieldsStep(
    (_model, { state }: typeof InMessage.RequestedState.Type) => ({ state: () => state }),
  ),
  RequestedConfigureOpen: ConfirmationBlock.makeStep.fromMessage(
    ({ open }: typeof InMessage.RequestedConfigureOpen.Type) =>
      Banner.requestConfigureOpen({ open }),
  ),
  RequestedOpen: Banner.requestOpen(),
  RequestedDismiss: Banner.requestDismiss(),
  RequestedReset: ConfirmationBlock.makeStep(() =>
    Update.combineSteps([
      ConfirmationBlock.makeFieldsStep(() => ({ state: () => 'requested' })),
      Banner.requestReset(),
    ]),
  ),
})
export const layer = ConfirmationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ConfirmationComposition.acquireChildren()
    const bannerMotion = createBannerMotionScope()
    const answerMotion = createTargetMotionScope('ConfirmationAnswer')
    yield* Layer.build(Layer.merge(bannerMotion.layer, answerMotion.layer))
    return {
      children,
      init,
      update,
      inMessageUpdate,
      EffectsLayer: Layer.empty,
      view: ConfirmationComposition.makeView.withInputs((model, inputs, h) => {
        const appearance = resolvePresentation(inputs)
        const { icon, ...bannerInputs } = inputs
        const described = inputs.description !== undefined && inputs.description !== null
        const titleId = `${model.id}-title`
        const descriptionId = `${model.id}-description`
        return h.block(
          Banner.embedView({
            slotId: model.banner.id,
            model: model.banner,
            viewInputs: {
              ...bannerInputs,
              role: 'group',
              ...(icon === undefined ? {} : { icon: appearance.icons[icon] }),
              attributes: [
                ...(inputs.attributes ?? []),
                ...childAttributes([
                  h.AriaLabelledBy(titleId),
                  ...(described ? [h.AriaDescribedBy(descriptionId)] : []),
                ]),
              ],
              animate: bannerMotion.node,
              children: (context) => [
                BannerTitle(
                  { ...context, attributes: [h.Id(titleId)], children: [inputs.title] },
                  h,
                ),
                described
                  ? BannerDescription(
                      {
                        ...context,
                        attributes: [h.Id(descriptionId)],
                        children: [inputs.description ?? ''],
                      },
                      h,
                    )
                  : null,
                BannerActions(
                  {
                    ...context,
                    children:
                      model.state === 'requested'
                        ? [
                            BannerAction(
                              {
                                ...context,
                                variant: 'primary',
                                children: [inputs.approveLabel ?? 'Approve'],
                                attributes: [h.OnClick(Message.ClickedApprove())],
                              },
                              h,
                            ),
                            BannerAction(
                              {
                                ...context,
                                variant: 'ghost',
                                children: [inputs.denyLabel ?? 'Deny'],
                                attributes: [h.OnClick(Message.ClickedDeny())],
                              },
                              h,
                            ),
                          ]
                        : [
                            answerMotion.node(
                              h.span(
                                [
                                  h.Key(model.state),
                                  h.Role('status'),
                                  h.Class(
                                    `flex h-7 items-center gap-1.5 text-foreground ${typeClass('body', appearance.size.variant)}`,
                                  ),
                                ],
                                [
                                  (model.state === 'approved'
                                    ? appearance.icons.check
                                    : appearance.icons.x)({ size: 14, strokeWidth: 1.5 }, h),
                                  model.state === 'approved'
                                    ? (inputs.approvedLabel ?? 'Approved')
                                    : (inputs.deniedLabel ?? 'Denied'),
                                ],
                              ),
                              {
                                initial: { opacity: 0, scale: 0.96 },
                                animate: { opacity: 1, scale: 1 },
                                transition: spring.fast,
                                reducedMotion: model.banner.reduceMotion
                                  ? 'always'
                                  : appearance.reducedMotion,
                              },
                            ),
                          ],
                  },
                  h,
                ),
              ],
            },
          }),
        )
      }),
    }
  }),
).pipe(Layer.provide(BannerLayer))
