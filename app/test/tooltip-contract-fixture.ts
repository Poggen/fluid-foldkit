import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import {
  DocumentTooltipBlock,
  layer as TooltipLayer,
  makeTooltipDomLayer,
} from '@foldkit-visuals/fluid/tooltip'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'

const svgContent: <Message, Requirements>(
  key: string,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function svgContent<Message, Requirements>(
  key: string,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.span(
    [h.Id(`label-${key}`)],
    [
      h.svg(
        [
          h.DataAttribute('local-svg', ''),
          h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
          h.Attribute('width', '24'),
          h.Attribute('height', '12'),
        ],
        [
          h.defs(
            [],
            [
              h.path([
                h.Id(`local-marker-${key}`),
                h.Attribute('d', 'M0 0h12v12H0Z'),
                h.Attribute('fill', '#ff0000'),
              ]),
              h.linearGradient(
                [h.Id(`local-gradient-${key}`)],
                [
                  h.stop([h.Attribute('offset', '0%'), h.Attribute('stop-color', '#0000ff')]),
                  h.stop([h.Attribute('offset', '100%'), h.Attribute('stop-color', '#00ff00')]),
                ],
              ),
            ],
          ),
          h.use([
            h.Attribute(key.startsWith('svg2') ? 'xlink:href' : 'href', `#local-marker-${key}`),
          ]),
          h.rect([
            h.Attribute('x', '12'),
            h.Attribute('width', '12'),
            h.Attribute('height', '12'),
            h.Attribute('fill', `url(#local-gradient-${key})`),
          ]),
        ],
      ),
      h.svg(
        [
          h.DataAttribute('external-svg', ''),
          h.Attribute('width', '12'),
          h.Attribute('height', '12'),
        ],
        [h.use([h.Attribute('href', '#tooltip-external-mark')])],
      ),
      h.a([h.Id(`navigation-${key}`), h.Href('#tooltip-navigation-target')], ['Link']),
    ],
  ) satisfies Html
}

const Message = defineMessageUnion({
  Show: { key: Schema.String },
  Label: {},
  Remove: {},
  ToggleHover: {},
  LabelStyle: {},
})
const TooltipContractKey = Symbol('TooltipContract')
const Root = Block.make('TooltipContract', {
  key: TooltipContractKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    tooltips: DocumentTooltipBlock.Model,
    label: Schema.String,
    removed: Schema.Boolean,
    hoverable: Schema.Boolean,
    labelStyleUpdated: Schema.Boolean,
  }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
})
const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: () => Root.makeNoopStep() }),
})
const composition = Root.makeComposition({ bindings: [Tooltips] })
const motion = createTargetMotionScope('tooltip-contract')
const grouped = ['a', 'b', 'c']
const independent = ['hover-on', 'hover-off', 'keyboard']
const transfers = ['style-a', 'style-b', 'svg-a', 'svg-b', 'svg2-a', 'svg2-b']
const layer = Root.makeLayer({
  init: composition.makeInit(() => ({
    model: { label: 'Alpha one', removed: false, hoverable: true, labelStyleUpdated: false },
    steps: [
      ...grouped.map((key) =>
        Tooltips.requestAdd({
          key,
          groupKey: 'morph',
          group: { presentation: 'morph', delayDuration: 0 },
        }),
      ),
      ...transfers.map((key) =>
        Tooltips.requestAdd({
          key,
          groupKey: key.slice(0, key.lastIndexOf('-')),
          group: { presentation: 'morph', delayDuration: 0 },
        }),
      ),
      ...independent.map((key) =>
        Tooltips.requestAdd({ key, options: { delayDuration: 0, hoverable: key !== 'hover-off' } }),
      ),
    ],
  })),
  update: composition.makeUpdate({
    LabelStyle: Root.makeFieldsStep(() => ({ labelStyleUpdated: () => true })),
    ToggleHover: Root.makeStep((model) =>
      Update.combineSteps([
        Tooltips.requestConfigure({
          key: 'hover-on',
          options: { delayDuration: 0, hoverable: !model.hoverable },
        }),
        Root.makeFieldsStep(() => ({ hoverable: (value) => !value })),
      ]),
    ),
    Show: Root.makeStep.fromMessage(({ key }) =>
      Tooltips.requestVisibility({ key, next: true, reason: 'application' }),
    ),
    Label: (model) => ({
      model: modifyFields(model, {
        label: (value) => (value === 'Alpha one' ? 'Latest source label' : 'Changed after capture'),
      }),
    }),
    Remove: Root.makeStep(() =>
      Update.combineSteps([
        Tooltips.requestRemove({ key: 'a' }),
        Root.makeFieldsStep(() => ({ removed: () => true })),
      ]),
    ),
  }),
  view: composition.makeView((model, h) =>
    h.main(
      [h.Class('p-8')],
      [
        h.svg(
          [h.Style({ position: 'absolute', width: '0', height: '0' })],
          [
            h.defs(
              [],
              [h.path([h.Id('tooltip-external-mark'), h.Attribute('d', 'M0 0h12v12H0Z')])],
            ),
          ],
        ),
        h.div(
          [h.Class('flex gap-2')],
          [
            ...[...grouped, ...transfers].map((key) =>
              h.button([h.Id(`show-${key}`), h.OnClick(Message.Show({ key }))], [`Show ${key}`]),
            ),
            h.button(
              [h.Id('update-style'), h.OnClick(Message.LabelStyle())],
              ['Update target label style'],
            ),
            h.button([h.Id('update-label'), h.OnClick(Message.Label())], ['Update label']),
            h.button([h.Id('remove-a'), h.OnClick(Message.Remove())], ['Remove a']),
            h.button(
              [h.Id('toggle-hover'), h.OnClick(Message.ToggleHover())],
              ['Toggle hoverability'],
            ),
          ],
        ),
        h.block(
          Tooltips.embedView({
            slotId: 'tooltip-contract',
            model: model.tooltips,
            viewInputs: {
              renderTrigger: (key, { button }) =>
                button(
                  childAttributes([h.Id(`trigger-${key}`), h.Class('border px-3 py-2 rounded-lg')]),
                  [key],
                ),
              renderContent: (key) =>
                key.startsWith('svg') && key.endsWith('-a')
                  ? svgContent(key, h)
                  : key === 'style-a'
                    ? h.span(
                        [],
                        [
                          'Styled ',
                          h.span(
                            [
                              h.DataAttribute('explicit-style', ''),
                              h.Style({ fontSize: '18px', color: 'rgb(0, 0, 255)' }),
                            ],
                            ['Inner'],
                          ),
                        ],
                      )
                    : h.span(
                        [h.Id(`label-${key}`)],
                        [
                          key === 'a'
                            ? model.label
                            : key === 'b'
                              ? 'Beta much wider label'
                              : 'Detail',
                        ],
                      ),
              renderDocument: (content, popups) => h.div([], [content, ...popups]),
              render: ({ tooltip }) =>
                h.div(
                  [],
                  [
                    [...grouped.filter((key) => !model.removed || key !== 'a'), ...independent],
                    transfers,
                  ].map((keys) =>
                    h.div(
                      [h.Class('flex gap-8 mt-28')],
                      keys.map((key) =>
                        tooltip(key, {
                          shapeClass: 'rounded-lg',
                          animate: motion.node,
                          reducedMotion: 'user',
                          shortcut: key === 'keyboard' ? '⇧⌘O' : '',
                          className:
                            key === 'style-a'
                              ? 'text-xl text-red-500'
                              : key === 'style-b'
                                ? model.labelStyleUpdated
                                  ? 'text-sm text-green-500'
                                  : 'text-[12px] text-muted-foreground'
                                : '',
                        }),
                      ),
                    ),
                  ),
                ),
            },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(TooltipLayer))
const container = document.getElementById('style-contract-root')
if (container === null) throw new Error('Missing Tooltip contract container')
const running = Runtime.embed(
  Program.makeElement({ block: Root, layer, container }).provide(
    Layer.merge(motion.layer, makeTooltipDomLayer(document, window)),
  ),
)
window.addEventListener(
  'tooltip-contract-dispose',
  () => {
    void running.dispose()
  },
  { once: true },
)
