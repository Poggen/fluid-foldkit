import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  BannerBlock,
  layer as BannerLayer,
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerAction,
  createBannerMotionScope,
  bannerViewInputs,
  bannerMotion,
} from '@foldkit-visuals/fluid/banner'
import type { BannerMotionConfig, BannerStatus } from '@foldkit-visuals/fluid/banner'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import './banner.css'

const customMotion: BannerMotionConfig = {
  appear: {
    row: { type: 'spring', duration: 0.16, bounce: 0 },
    banner: { type: 'spring', duration: 0.2, bounce: 0.08, delay: 0.02 },
    fromScale: 0.2,
  },
  dismiss: { row: { duration: 0.12, ease: [0.4, 0, 0.2, 1] }, shrinkTo: 0.75 },
}

const motionConfig = new URLSearchParams(location.search).has('custom-motion')
  ? customMotion
  : bannerMotion

const styleConfig = new URLSearchParams(location.search).has('custom-style')
  ? { width: '520px', padding: '12px', opacity: '0.8', '--banner-custom-value': '12' }
  : {}

const statuses: ReadonlyArray<BannerStatus> = ['default', 'info', 'success', 'warning', 'error']

const Model = Schema.Struct({
  banner: BannerBlock.Model,
  uncontrolled: BannerBlock.Model,
  status: Schema.Natural,
  isHighContrast: Schema.Boolean,
  isCompact: Schema.Boolean,
  isPill: Schema.Boolean,
  shape: Schema.Literals(['rounded', 'pill', 'sharp']),
  isFixed: Schema.Boolean,
  hasDescription: Schema.Boolean,
  isNarrow: Schema.Boolean,
  hasCustomIcon: Schema.Boolean,
  isMounted: Schema.Boolean,
  dismissals: Schema.Natural,
  actions: Schema.Natural,
})

const Message = defineMessageUnion({
  ClickedOpen: {},
  ClickedClose: {},
  ClickedFlip: {},
  ClickedStatus: {},
  ClickedContrast: {},
  ClickedSize: {},
  ClickedShape: {},
  ClickedVariant: {},
  ClickedDescription: {},
  ClickedWidth: {},
  ClickedIcon: {},
  ClickedMount: {},
  ClickedAction: {},
  ClickedReopen: {},
})

const BannerExampleKey = Symbol('FluidBannerExample')

const effects = Block.makeEffectsContract()

const FluidBannerExampleBlock = Block.make('FluidBannerExample', {
  key: BannerExampleKey,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
  Model,
  Message,
})

const Banner = FluidBannerExampleBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: { contextToArgs: () => [{ id: 'controlled-banner', open: true, reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: FluidBannerExampleBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: () =>
      FluidBannerExampleBlock.makeFieldsStep(() => ({
        dismissals: Number.increment,
      })),
    Exited: FluidBannerExampleBlock.makeNoopStep,
  }),
})

const Uncontrolled = FluidBannerExampleBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'uncontrolled',
  init: { contextToArgs: () => [{ id: 'uncontrolled-banner', reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: FluidBannerExampleBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: () =>
      FluidBannerExampleBlock.makeFieldsStep(() => ({
        dismissals: Number.increment,
      })),
    Exited: FluidBannerExampleBlock.makeNoopStep,
  }),
})

const FluidBannerExampleComposition = FluidBannerExampleBlock.makeComposition({
  bindings: [Banner, Uncontrolled],
})

const init = FluidBannerExampleComposition.makeInit(() => ({
  model: {
    status: 0,
    isHighContrast: false,
    isCompact: false,
    isPill: examplePresentation.shape === 'pill',
    shape: examplePresentation.shape ?? 'rounded',
    isFixed: false,
    hasDescription: true,
    isNarrow: false,
    hasCustomIcon: false,
    isMounted: true,
    dismissals: 0,
    actions: 0,
  },
}))

const update = FluidBannerExampleComposition.makeUpdate({
  ClickedOpen: Banner.requestConfigureOpen({ open: true }),
  ClickedClose: Banner.requestConfigureOpen({ open: false }),
  ClickedFlip: FluidBannerExampleBlock.makeStep((model) =>
    Banner.requestConfigureOpen({ open: model.banner.phase !== 'Present' }),
  ),
  ClickedStatus: FluidBannerExampleBlock.makeFieldsStep(() => ({
    status: (value) => (value + 1) % 5,
  })),
  ClickedContrast: FluidBannerExampleBlock.makeFieldsStep(() => ({ isHighContrast: Boolean.not })),
  ClickedSize: FluidBannerExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedShape: FluidBannerExampleBlock.makeFieldsStep(() => ({
    isPill: Boolean.not,
    shape: (shape) => (shape === 'pill' ? 'rounded' : 'pill'),
  })),
  ClickedVariant: FluidBannerExampleBlock.makeFieldsStep(() => ({ isFixed: Boolean.not })),
  ClickedDescription: FluidBannerExampleBlock.makeFieldsStep(() => ({
    hasDescription: Boolean.not,
  })),
  ClickedWidth: FluidBannerExampleBlock.makeFieldsStep(() => ({ isNarrow: Boolean.not })),
  ClickedIcon: FluidBannerExampleBlock.makeFieldsStep(() => ({ hasCustomIcon: Boolean.not })),
  ClickedMount: Update.combineSteps([
    Banner.requestReset(),
    FluidBannerExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  ]),
  ClickedAction: FluidBannerExampleBlock.makeFieldsStep(() => ({ actions: Number.increment })),
  ClickedReopen: Uncontrolled.requestReset(),
})

const motion = createBannerMotionScope()

const view = FluidBannerExampleComposition.makeView((model, h) => ({
  title: 'Fluid banner parity',
  body: h.main(
    [
      h.Class('p-6 max-w-275'),
      h.DataAttribute('fixture-open', String(model.banner.phase === 'Present')),
    ],
    [
      h.h1(
        [
          h.Class(
            "text-[28px] leading-[34px] m-[0_0_12px] [font-variation-settings:'wght'_550,'opsz'_18]",
          ),
        ],
        ['Fluid banner parity'],
      ),
      h.div(
        [
          h.Class(
            'flex flex-wrap gap-2 m-[12px_0] [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)] [&_button]:rounded-[6px] [&_button]:text-[13px]',
          ),
        ],
        [
          Button.view(
            {
              onClick: Message.ClickedOpen(),
              toView: (attributes) => h.button([...attributes.button, h.Id('open')], ['Open']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedClose(),
              toView: (attributes) => h.button([...attributes.button, h.Id('close')], ['Close']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedFlip(),
              toView: (attributes) => h.button([...attributes.button, h.Id('flip')], ['Flip']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedStatus(),
              toView: (attributes) => h.button([...attributes.button, h.Id('status')], ['Status']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedContrast(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('contrast')], ['Contrast']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedSize(),
              toView: (attributes) => h.button([...attributes.button, h.Id('size')], ['Size']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedShape(),
              toView: (attributes) => h.button([...attributes.button, h.Id('shape')], ['Shape']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedVariant(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('variant')], ['Variant']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedDescription(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('description')], ['Description']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedWidth(),
              toView: (attributes) => h.button([...attributes.button, h.Id('width')], ['Width']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedIcon(),
              toView: (attributes) => h.button([...attributes.button, h.Id('icon')], ['Icon']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedMount(),
              toView: (attributes) => h.button([...attributes.button, h.Id('mount')], ['Mount']),
            },
            h,
          ),
        ],
      ),
      h.output([h.Id('counts')], [`Dismissals ${model.dismissals}; Actions ${model.actions}`]),
      h.div(
        [
          h.Id('column'),
          h.Class(
            model.isNarrow
              ? 'flex flex-col gap-3 m-[16px_0] [&_>_p]:m-0 w-85'
              : 'flex flex-col gap-3 m-[16px_0] [&_>_p]:m-0',
          ),
        ],
        [
          h.p([], ['Above']),
          model.isMounted
            ? h.block(
                Banner.embedView({
                  slotId: model.banner.id,
                  model: model.banner,
                  viewInputs: bannerViewInputs({
                    status: statuses[model.status] ?? 'default',
                    contrast: model.isHighContrast ? 'high' : 'low',
                    size: model.isCompact ? 'compact' : 'default',
                    shape: model.shape,
                    variant: model.isFixed ? 'fixed' : 'inline',
                    dismissible: true,
                    motion: motionConfig,
                    style: styleConfig,
                    ...(model.hasCustomIcon ? { icon: defaultIcons.rocket } : {}),
                    animate: motion.node,
                    children: (context) => [
                      BannerTitle({ ...context, children: ['Saved successfully'] }, h),
                      ...(model.hasDescription
                        ? [
                            BannerDescription(
                              {
                                ...context,
                                children: ['Your changes are available to the whole team.'],
                              },
                              h,
                            ),
                          ]
                        : []),
                      BannerActions(
                        {
                          ...context,
                          children: [
                            BannerAction(
                              {
                                ...context,
                                variant: 'primary',
                                children: ['Continue'],
                                attributes: [h.OnClick(Message.ClickedAction())],
                              },
                              h,
                            ),
                            BannerAction(
                              {
                                ...context,
                                variant: 'secondary',
                                href: '#details',
                                children: ['Details'],
                              },
                              h,
                            ),
                            BannerAction(
                              {
                                ...context,
                                variant: 'ghost',
                                href: 'https://example.com',
                                external: true,
                                children: ['Learn more'],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  }),
                }),
              )
            : null,
          h.p([h.Id('below')], ['Below']),
        ],
      ),
      h.div(
        [h.Class('flex flex-col gap-3 m-[16px_0] [&_>_p]:m-0')],
        [
          Button.view(
            {
              toView: (attributes) =>
                h.button(
                  [
                    ...attributes.button,
                    h.Id('before'),
                    h.Class(
                      'p-[4px_8px] [border:1px_solid_var(--border)] rounded-[6px] text-[13px]',
                    ),
                  ],
                  ['Before'],
                ),
            },
            h,
          ),
          h.block(
            Uncontrolled.embedView({
              slotId: model.uncontrolled.id,
              model: model.uncontrolled,
              viewInputs: {
                dismissible: true,
                dismissLabel: 'Close notice',
                status: 'info',
                animate: motion.node,
                children: (context) => [
                  BannerTitle({ ...context, children: ['Uncontrolled notice'] }, h),
                ],
              },
            }),
          ),
          Button.view(
            {
              toView: (attributes) =>
                h.button(
                  [
                    ...attributes.button,
                    h.Id('after'),
                    h.Class(
                      'p-[4px_8px] [border:1px_solid_var(--border)] rounded-[6px] text-[13px]',
                    ),
                  ],
                  ['After'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedReopen(),
              toView: (attributes) =>
                h.button(
                  [
                    ...attributes.button,
                    h.Id('reopen'),
                    h.Class(
                      'p-[4px_8px] [border:1px_solid_var(--border)] rounded-[6px] text-[13px]',
                    ),
                  ],
                  ['Reopen notice'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  ),
}))

const layer = FluidBannerExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.merge(BannerLayer, motion.layer)),
)

Runtime.run(
  Program.make({
    block: FluidBannerExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }),
)
