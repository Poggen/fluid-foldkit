import { hoverModeOf as tabsHoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { TabsBlock, layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { childAttributes } from 'foldkit/html'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import type { IconName } from '@foldkit-visuals/fluid/icons'
// Fluid Functionalism cc276ca0 IconRailVsPeekDemo. MIT.
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion, defineInMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { spring, shapeMap, surfaceClasses } from '@foldkit-visuals/fluid/tokens'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { ComponentPresentation, presentation } from '../settings'
import { motion } from '../motion'
import source from './sidebar-comparison.ts?raw'
const groups: ReadonlyArray<{
  readonly label: string
  readonly items: ReadonlyArray<{ readonly icon: IconName; readonly label: string }>
}> = [
  {
    label: 'Workspace',
    items: [
      { icon: 'message-circle', label: 'Chat' },
      { icon: 'brain', label: 'Agents' },
      { icon: 'square-library', label: 'Knowledge' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: 'play', label: 'Runs' },
      { icon: 'star', label: 'Evals' },
      { icon: 'settings', label: 'Settings' },
    ],
  },
]
const phases = [900, 1600, 1600, 1600, 1600, 1500]
const key = Symbol('SidebarComparison')
export const SidebarComparisonBlock = Block.make('SidebarComparison', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    phase: Schema.Natural,
    isPaused: Schema.Boolean,
    isVisible: Schema.Boolean,
    isReduced: Schema.Boolean,
    generation: Schema.Natural,
    tabs: TabsBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
  }),
  Message: defineMessageUnion({
    Observed: { visible: Schema.Boolean, reduced: Schema.Boolean },
    CompletedWaitBeforeAdvance: { generation: Schema.Natural },
    ToggledPause: {},
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ readonly settings: ComponentPresentation }>(),
  },
})
const Root = SidebarComparisonBlock
const WaitBeforeAdvance = Root.makeCommand('WaitBeforeAdvance', {
  args: { generation: Schema.Natural, delay: Schema.Finite },
  messages: [Root.Message.CompletedWaitBeforeAdvance],
  *handler() {
    return ({ generation, delay }) =>
      Effect.sleep(delay).pipe(Effect.as(Root.Message.CompletedWaitBeforeAdvance({ generation })))
  },
})
const Observe = Root.makeMountStream('Observe', {
  messages: [Root.Message.Observed],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.Observed.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    let visible = false
                    const query = matchMedia('(prefers-reduced-motion: reduce)'),
                      changed = () =>
                        Queue.offerUnsafe(
                          queue,
                          Root.Message.Observed({ visible, reduced: query.matches }),
                        )
                    const observer = new IntersectionObserver(
                      (entries) => {
                        visible = (entries[0]?.intersectionRatio ?? 0) >= 0.35
                        changed()
                      },
                      { threshold: [0, 0.35, 1] },
                    )
                    observer.observe(element)
                    query.addEventListener('change', changed)
                    changed()
                    return () => {
                      observer.disconnect()
                      query.removeEventListener('change', changed)
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})
const tabsId = previewCodeTabId('sidebar', 'comparison')
const RawTabs = Root.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: tabsId, idPrefix: tabsId, selectedIndex: 0 }] },
})
const Tabs = RawTabs.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) => RawTabs.requestSelected({ selectedIndex: index }),
  }),
})
const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
const Composition = Root.makeComposition({ bindings: [Tabs, Tooltips], mounts: [Observe] })
const implementation = {
  init: Composition.makeInit(() => ({
    model: {
      phase: 0,
      isPaused: false,
      isVisible: false,
      isReduced: false,
      generation: 0,
    },
    steps: [Tooltips.requestAdd({ key: 'sidebar-comparison-playback', options: { side: 'top' } })],
  })),
  update: Composition.makeUpdate({
    Observed: (model, { visible, reduced }) => {
      if (model.isVisible === visible && model.isReduced === reduced) return { model }
      const generation = model.generation + 1
      return {
        model: modifyFields(model, {
          isVisible: () => visible,
          isReduced: () => reduced,
          generation: () => generation,
        }),
        commands:
          visible && !reduced && !model.isPaused
            ? [WaitBeforeAdvance({ generation, delay: phases[model.phase] ?? 900 })]
            : [],
      }
    },
    CompletedWaitBeforeAdvance: (model, { generation }) => {
      if (model.generation !== generation || !model.isVisible || model.isReduced || model.isPaused)
        return { model }
      const phase = (model.phase + 1) % phases.length
      return {
        model: modifyFields(model, { phase: () => phase }),
        commands: [WaitBeforeAdvance({ generation, delay: phases[phase] ?? 900 })],
      }
    },
    ToggledPause: (model) => {
      const generation = model.generation + 1
      return {
        model: modifyFields(model, { isPaused: Boolean.not, generation: () => generation }),
        commands:
          model.isPaused && model.isVisible && !model.isReduced
            ? [WaitBeforeAdvance({ generation, delay: phases[model.phase] ?? 900 })]
            : [],
      }
    },
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep.fromMessage(({ presentation: settings }) =>
      Root.makeStep((current) =>
        tabsHoverModeOf(current.tabs) === settings.hover
          ? { model: current }
          : Tabs.requestHoverMode({ mode: settings.hover }),
      ),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings),
      shape = shapeMap[settings.shape],
      phase = model.isReduced ? 2 : model.phase,
      index = phase >= 1 && phase <= 4 ? phase - 1 : null,
      engaged = index !== null
    const items = groups.flatMap((group) => group.items),
      centerY = (index: number) => (index < 3 ? 56 + 36 * index : 177 + 36 * (index - 3))
    const cursor = (x: number, y: number) =>
      motion.node(
        h.span(
          [h.AriaHidden(true), h.Class('pointer-events-none absolute left-0 top-0 z-30')],
          [
            h.svg(
              [h.Width('18'), h.Height('18'), h.ViewBox('0 0 24 24')],
              [
                h.path([
                  h.D('m4 4 7.07 17 2.51-7.39L21 11.07z'),
                  h.StrokeWidth('1.5'),
                  h.StrokeLinejoin('round'),
                  h.Class('fill-foreground stroke-background'),
                ]),
              ],
            ),
          ],
        ),
        { initial: false, animate: { x, y }, transition: spring.slow },
      )
    const iconRail = h.div(
      [
        h.Class(
          `relative z-20 h-80 overflow-hidden border border-border bg-background ${shape.container}`,
        ),
      ],
      [
        h.div(
          [
            h.Class(
              'absolute inset-y-0 left-0 flex w-11 flex-col items-center gap-1 border-r border-border/60 pt-2',
            ),
          ],
          [
            h.span(
              [
                h.Class(
                  `mb-1 flex size-6 shrink-0 items-center justify-center bg-foreground text-[11px] leading-3.5 text-background ${shape.container}`,
                ),
              ],
              ['A'],
            ),
            ...groups.flatMap((group, g) => [
              g > 0 ? h.span([h.Class('my-1 h-px w-6 bg-border')]) : null,
              ...group.items.map((item, i) =>
                h.span(
                  [
                    h.Class(
                      `flex size-8 items-center justify-center rounded-lg transition-colors duration-80 ${index === g * 3 + i ? 'bg-hover text-foreground' : 'text-muted-foreground'}`,
                    ),
                  ],
                  [defaultIcons[item.icon]({ size: 16, strokeWidth: 1.5 }, h)],
                ),
              ),
            ]),
          ],
        ),
        ...[0, 1, 2, 3].map((i) =>
          motion.node(
            h.span(
              [
                h.Key(String(i)),
                h.Class(
                  'absolute z-20 rounded-md bg-foreground px-2 py-1 text-[11px] leading-none text-background',
                ),
                h.Style({ left: '52px', top: `${centerY(i) - 10}px` }),
              ],
              [items[i]?.label ?? ''],
            ),
            {
              initial: { opacity: 0, x: -4 },
              animate: {
                opacity: 1,
                x: 0,
                transition: { ...spring.fast, delay: model.isReduced ? 0 : 0.5 },
              },
              exit: { opacity: 0, transition: spring.fast.exit },
              present: index === i,
            },
          ),
        ),
        ...(model.isReduced
          ? []
          : [cursor(index === null ? 210 : 20, index === null ? 260 : centerY(index) + 2)]),
      ],
    )
    const peek = h.div(
      [
        h.Class(
          `relative z-20 h-80 overflow-hidden border border-border bg-background ${shape.container}`,
        ),
      ],
      [
        h.div(
          [h.Class('flex items-start pl-3.5 pt-3.5')],
          [
            h.span(
              [
                h.Class(
                  'flex size-7 items-center justify-center rounded-md transition-colors duration-80 text-muted-foreground',
                ),
              ],
              [defaultIcons['panel-left']({ size: 16, strokeWidth: 1.5 }, h)],
            ),
          ],
        ),
        motion.node(
          h.div(
            [
              h.Class(
                `absolute inset-y-2 left-2 z-10 flex w-44 flex-col overflow-hidden p-2 ${shape.container} ${surfaceClasses(2, 3)}`,
              ),
            ],
            [
              h.div(
                [h.Class('flex items-center gap-2 px-1 pb-1 pt-0.5')],
                [
                  h.span(
                    [
                      h.Class(
                        'flex size-5 items-center justify-center bg-foreground text-[10px] text-background',
                      ),
                    ],
                    ['A'],
                  ),
                  h.span([h.Class('text-[12px] text-foreground')], ['Aurora AI']),
                ],
              ),
              ...groups.flatMap((group, groupIndex) => [
                h.span(
                  [
                    h.Class(
                      'flex h-8 shrink-0 items-center px-2 text-[12px] text-muted-foreground',
                    ),
                  ],
                  [group.label],
                ),
                ...group.items.map((item, itemIndex) =>
                  h.div(
                    [
                      h.Class(
                        `flex h-7 shrink-0 items-center gap-2 rounded-lg px-2 ${groupIndex === 0 && itemIndex === 0 ? 'bg-hover' : ''}`,
                      ),
                    ],
                    [
                      defaultIcons[item.icon]({ size: 14, className: 'text-muted-foreground' }, h),
                      h.span([h.Class('text-[12px] text-foreground')], [item.label]),
                      ...(groupIndex === 0 && itemIndex === 0
                        ? [
                            defaultIcons['more-vertical'](
                              { size: 14, className: 'ml-auto text-muted-foreground' },
                              h,
                            ),
                          ]
                        : []),
                    ],
                  ),
                ),
              ]),
            ],
          ),
          {
            initial: { x: '-108%' },
            animate: { x: 0, transition: spring.moderate },
            exit: { x: '-108%', transition: spring.moderate.exit },
            present: engaged,
          },
        ),
        ...(model.isReduced
          ? []
          : [cursor(phase === 1 ? 26 : engaged ? 72 : 210, phase === 1 ? 26 : engaged ? 90 : 260)]),
      ],
    )
    return h.block(
      Tooltips.embedView({
        slotId: 'sidebar-comparison-tooltips',
        model: model.tooltips,
        viewInputs: {
          renderDocument: (content, popups) => h.div([], [content, ...popups]),
          renderTrigger: (_key, { button }) =>
            Button(
              {
                context,
                variant: 'ghost',
                buttonSize: 'icon-compact',
                children: [],
                leadingIcon: model.isPaused ? defaultIcons.play : defaultIcons.pause,
                attributes: [
                  h.AriaLabel(model.isPaused ? 'Play' : 'Pause'),
                  h.OnClick(Root.Message.ToggledPause()),
                ],
                render: (attributes, children) =>
                  button(
                    attributes.flatMap((attribute) =>
                      '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                    ),
                    children,
                  ),
              },
              h,
            ),
          render: ({ tooltip }) =>
            docSection(h, {
              title: 'No icon rail version?',
              description:
                'Hot take baked into this component: there’s no icon-only collapsed mode. On purpose. Icon rails look tidy in screenshots but fail in use. Six ambiguous glyphs, and you suddenly need to tooltip most of them until you’ve found the right one.',
              source,
              pane: model.tabs.selectedIndex === 1 ? 'code' : 'preview',
              tabs: h.block(
                Tabs.embedView({
                  slotId: tabsId,
                  model: model.tabs,
                  viewInputs: previewCodeTabsViewInputs(h, {
                    context,
                    animate: motion.node,
                    ariaLabel: 'Sidebar comparison example',
                  }),
                }),
              ),
              tabsId,
              presentation: { context },
              className: 'w-full',
              actions: [
                tooltip('sidebar-comparison-playback', {
                  content: model.isPaused ? 'Play' : 'Pause',
                  shapeClass: shape.item,
                  animate: motion.node,
                  reducedMotion: 'user',
                }),
              ],
              children: [
                h.div(
                  [
                    h.Class(
                      'flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center',
                    ),
                    h.OnMount(Observe()),
                  ],
                  [
                    { panel: iconRail, label: '❌ Icon rail: six glyphs, one tooltip at a time' },
                    { panel: peek, label: '✅ Peek on hover: the whole sidebar, one hover' },
                  ].map(({ panel, label }) =>
                    h.div(
                      [h.Class('flex w-full min-w-0 max-w-[340px] flex-col gap-2')],
                      [
                        panel,
                        h.span(
                          [h.Class('text-site-caption text-muted-foreground text-center')],
                          [label],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            }),
        },
      }),
    )
  }),
  EffectsLayer: Layer.merge(WaitBeforeAdvance.layer, Observe.layer),
}
export const layer = Root.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.merge(TabsLayer, TooltipLayer)),
)
