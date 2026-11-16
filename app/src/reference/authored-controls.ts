import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
  hoverModeOf as previewHoverModeOf,
} from '../../../components/docs/preview-controls'
import { hoverModeOf as tabsHoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { hoverModeOf as radioHoverModeOf } from '@foldkit-visuals/fluid/radio-group'
import {
  hoverModeOf as checksHoverModeOf,
  radiusOf as checksRadiusOf,
} from '@foldkit-visuals/fluid/checkbox-group'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Derived from Fluid Functionalism cc276ca0 docs. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema, Struct } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import { Badge, badgeColors } from '@foldkit-visuals/fluid/badge'
import {
  CheckboxGroupBlock,
  CheckboxItem,
  layer as ChecksLayer,
} from '@foldkit-visuals/fluid/checkbox-group'
import { RadioGroupBlock, RadioItem, layer as RadioLayer } from '@foldkit-visuals/fluid/radio-group'
import { SliderBlock, sliderSettings, layer as SliderLayer } from '@foldkit-visuals/fluid/slider'
import { SwitchBlock, SwitchLayer } from '@foldkit-visuals/fluid/switch'
import { TabsBlock, TabsItem, TabsPanel, layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import {
  ThinkingIndicatorBlock,
  thinkingIndicatorAnimations,
  layer as ThinkingLayer,
} from '@foldkit-visuals/fluid/thinking-indicator'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import type { Html } from 'foldkit/html'
import { motion, target, highlight } from '../motion'
import { sliderMotion, switchMotion } from '../gallery/fluid/core-bindings'
import { ComponentPresentation, presentation } from '../settings'
import {
  sliderScenes,
  tabsScenes,
  tabsLabels,
  checkboxLabels,
  radioLabels,
  badgeSamples,
} from './control-scenes'
import source from './authored-controls.ts?raw'
const key = Symbol('AuthoredControls')
export const AuthoredControlsBlock = Block.make('AuthoredControls', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    switches: Schema.Record(Schema.String, SwitchBlock.Model),
    tabs: Schema.Record(Schema.String, TabsBlock.Model),
    sliders: Schema.Record(Schema.String, SliderBlock.Model),
    radio: RadioGroupBlock.Model,
    checks: CheckboxGroupBlock.Model,
    indicator: ThinkingIndicatorBlock.Model,
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredControlsBlock
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const RawSwitches = Root.makeRecordBinding(SwitchBlock, { field: 'switches' })
const Switches = RawSwitches.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(SwitchBlock, {
      Toggled: () =>
        Root.makeStep((model) => {
          const child = model.switches[key]
          return child === undefined
            ? { model }
            : RawSwitches.requestConfigure(key, {
                checked: !child.checked,
                disabled: child.disabled,
              })
        }),
    }),
})
const RawTabs = Root.makeRecordBinding(TabsBlock, { field: 'tabs' })
const Tabs = RawTabs.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(TabsBlock, {
      Selected: ({ index }) => RawTabs.requestSelected(key, { selectedIndex: index }),
    }),
})
const RawSliders = Root.makeRecordBinding(SliderBlock, { field: 'sliders' })
const Sliders = RawSliders.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(SliderBlock, {
      Changed: ({ value }) =>
        Root.makeStep((model) => {
          const child = model.sliders[key]
          return child === undefined
            ? { model }
            : RawSliders.requestSettings(key, { settings: { ...child.settings, value } })
        }),
    }),
})
const RawRadio = Root.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'radio',
  init: {
    contextToArgs: () => [
      {
        id: 'docs-radio-basic',
        selectedIndex: 0,
        items: radioLabels.map((value, index) => ({ value, index })),
      },
    ],
  },
})
const Radio = RawRadio.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ index }) => RawRadio.requestSelection({ selectedIndex: index }),
  }),
})
const RawChecks = Root.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'checks',
  init: { contextToArgs: () => [{ id: 'docs-checks-basic', checkedIndices: [0] }] },
})
const Checks = RawChecks.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      Root.makeStep((model) =>
        RawChecks.requestSelection({
          indices: model.checks.checkedIndices.includes(index)
            ? model.checks.checkedIndices.filter((i) => i !== index)
            : [...model.checks.checkedIndices, index],
        }),
      ),
  }),
})
const Indicator = Root.makeRequiredFieldBinding(ThinkingIndicatorBlock, {
  field: 'indicator',
  init: { contextToArgs: () => [{ id: 'docs-thinking-basic', reduceMotion: false }] },
})
const Composition = Root.makeComposition({
  bindings: [Switches, Tabs, Sliders, Radio, Checks, Indicator, DocTabs],
})
const docSections = [
  'badge:Solid',
  'badge:Dot',
  'badge:Colors',
  'switch:Basic',
  'switch:Disabled',
  ...tabsScenes.map((title) => `tabs:${title}`),
  'radio-group:Basic',
  'checkbox-group:Basic',
  'thinking-indicator:Basic',
  ...sliderScenes.map(({ title }) => `slider:${title}`),
]
const initControlExamples = Root.makeStep(() =>
  Update.combineSteps([
    ...docSections.map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('controls', section),
              idPrefix: previewCodeTabId('controls', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
    ...['Basic', 'Disabled'].map((key) =>
      Root.makeStep((model) =>
        initAndInsert(Switches, model, {
          key,
          args: [{ id: `docs-switch-${key}`, checked: false, disabled: key === 'Disabled' }],
        }),
      ),
    ),
    ...tabsScenes.map((key) =>
      Root.makeStep((model) =>
        initAndInsert(Tabs, model, {
          key,
          args: [
            {
              id: `docs-tabs-${key.toLowerCase().replaceAll(' ', '-')}`,
              selectedIndex: 0,
              activeLabel: key === 'Active Label',
            },
          ],
        }),
      ),
    ),
    ...sliderScenes.flatMap((scene) =>
      scene.rows.map((config) =>
        Root.makeStep((model) =>
          initAndInsert(Sliders, model, {
            key: config.id,
            args: [{ ...config, id: `docs-slider-${config.id}` }],
          }),
        ),
      ),
    ),
  ]),
)
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { docTabs: {}, switches: {}, tabs: {}, sliders: {} },
    steps: [initControlExamples],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          previewHoverModeOf(child) === settings.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.tabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [Tabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...(radioHoverModeOf(model.radio) === settings.hover
          ? []
          : [Radio.requestHoverMode({ mode: settings.hover })]),
        ...(checksHoverModeOf(model.checks) === settings.hover
          ? []
          : [Checks.requestHoverMode({ mode: settings.hover })]),
        ...(checksRadiusOf(model.checks) ===
        resolvePresentation({ context: presentation(settings) }).shape.bgRadius
          ? []
          : [
              Checks.requestRadius({
                radius: resolvePresentation({ context: presentation(settings) }).shape.bgRadius,
              }),
            ]),
        ...Object.entries(model.sliders).flatMap(([key, child]) => {
          const scene = sliderScenes.flatMap((scene) => scene.rows).find((row) => row.id === key)
          if (scene === undefined) return []
          const { compact } = sliderSettings({
            ...scene,
            size: scene.size ?? settings.size,
            value: child.settings.value,
          })
          return child.settings.compact === compact
            ? []
            : [Sliders.requestSettings(key, { settings: { ...child.settings, compact } })]
        }),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, inputs, h) => {
    if (!inputs.ready) return h.empty
    const context = presentation(inputs.settings)
    const section = (title: string, children: ReadonlyArray<Html>, className = '') =>
      docSection(h, {
        title,
        children,
        className,
        source,
        presentation: { context },
        pane:
          model.docTabs[`${inputs.slug}:${title}`]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabsId: previewCodeTabId('controls', `${inputs.slug}:${title}`),
        tabs: (() => {
          const key = `${inputs.slug}:${title}`
          const child = model.docTabs[key]
          return child === undefined
            ? h.empty
            : h.block(
                DocTabs.embedView({
                  key,
                  slotId: child.tabs.id,
                  model: child,
                  viewInputs: previewCodeTabsViewInputs(h, {
                    context,
                    animate: target.node,
                    ariaLabel: `${title} view`,
                  }),
                }),
              )
        })(),
      })
    if (inputs.slug === 'badge') {
      const samples = (variant: 'solid' | 'dot') =>
        h.div(
          [h.Class('flex flex-wrap items-center gap-2')],
          badgeSamples.map(({ color, label }) =>
            Badge({ context, color, variant, children: [label] }, h),
          ),
        )
      return h.div(
        [],
        [
          section('Solid', [samples('solid')]),
          section('Dot', [samples('dot')]),
          section('Colors', [
            h.div(
              [h.Class('flex flex-col gap-3')],
              (['solid', 'dot'] as const).map((variant) =>
                h.div(
                  [h.Class('flex flex-wrap items-center gap-2')],
                  Struct.keys(badgeColors).map((color) =>
                    Badge(
                      {
                        context,
                        color,
                        variant,
                        children: [color.charAt(0).toUpperCase() + color.slice(1)],
                      },
                      h,
                    ),
                  ),
                ),
              ),
            ),
          ]),
        ],
      )
    }
    if (inputs.slug === 'switch')
      return h.div(
        [],
        ['Basic', 'Disabled'].map((key) => {
          const child = model.switches[key]
          return section(
            key,
            child === undefined
              ? []
              : [
                  h.block(
                    Switches.embedView({
                      key,
                      slotId: child.id,
                      model: child,
                      viewInputs: {
                        context,
                        label: key === 'Basic' ? 'Notifications' : 'Disabled option',
                        animate: switchMotion.node,
                      },
                    }),
                  ),
                ],
          )
        }),
      )
    if (inputs.slug === 'tabs')
      return h.div(
        [],
        tabsScenes.map((key) => {
          const child = model.tabs[key]
          const icons = [
            defaultIcons['square-library'],
            defaultIcons.clock,
            defaultIcons.star,
            defaultIcons.users,
          ]
          return section(
            key,
            child === undefined
              ? []
              : [
                  h.div(
                    [h.Class('flex flex-col gap-4 w-full')],
                    [
                      h.block(
                        Tabs.embedView({
                          key,
                          slotId: child.id,
                          model: child,
                          viewInputs: {
                            context,
                            animate: target.node,
                            items: tabsLabels.map((value) => ({ value })),
                            ariaLabel: `${key} tabs`,
                            content: (tabs) =>
                              tabsLabels.map((label, index) =>
                                TabsItem(
                                  {
                                    index,
                                    label,
                                    ...(key === 'Basic'
                                      ? {}
                                      : { icon: icons[index] ?? defaultIcons.star }),
                                  },
                                  tabs,
                                  h,
                                ),
                              ),
                          },
                        }),
                      ),
                      ...tabsLabels.map((label, index) =>
                        TabsPanel(
                          {
                            index,
                            selectedIndex: child.selectedIndex,
                            idPrefix: child.id,
                            children: [
                              h.p(
                                [h.Class('text-site-body text-muted-foreground')],
                                [`${label} content goes here.`],
                              ),
                            ],
                          },
                          h,
                        ),
                      ),
                    ],
                  ),
                ],
            'w-full',
          )
        }),
      )
    if (inputs.slug === 'radio-group')
      return section('Basic', [
        h.block(
          Radio.embedView({
            slotId: model.radio.id,
            model: model.radio,
            viewInputs: {
              context,
              animate: target.node,
              animateHighlight: highlight,
              content: (radio) =>
                radioLabels.map((label, index) => RadioItem({ index, label }, radio, h)),
            },
          }),
        ),
      ])
    if (inputs.slug === 'checkbox-group')
      return section('Basic', [
        h.block(
          Checks.embedView({
            slotId: model.checks.id,
            model: model.checks,
            viewInputs: {
              context,
              animate: target.node,
              animateHighlight: highlight,
              animateSelection: selectionBackgroundAnimation(target),
              content: (checks) =>
                checkboxLabels.map((label, index) => CheckboxItem({ index, label }, checks, h)),
            },
          }),
        ),
      ])
    if (inputs.slug === 'thinking-indicator')
      return section('Basic', [
        h.block(
          Indicator.embedView({
            slotId: model.indicator.id,
            model: model.indicator,
            viewInputs: { size: inputs.settings.size, ...thinkingIndicatorAnimations(target) },
          }),
        ),
      ])
    if (inputs.slug === 'slider')
      return h.div(
        [],
        sliderScenes.map((scene) =>
          section(
            scene.title,
            scene.rows.flatMap((config) => {
              const child = model.sliders[config.id]
              return child === undefined
                ? []
                : [
                    h.block(
                      Sliders.embedView({
                        key: config.id,
                        slotId: child.id,
                        model: child,
                        viewInputs: {
                          context,
                          animate: motion.node,
                          motionValues: sliderMotion.node,
                          ...(config.size === undefined ? {} : { size: config.size }),
                          ...(config.label === undefined ? {} : { label: config.label }),
                          ...(config.format === undefined
                            ? {}
                            : {
                                formatValue: (value: number) =>
                                  config.format === 'ampere'
                                    ? `${value} A`
                                    : config.format === 'percent'
                                      ? `${value}%`
                                      : (['Off', 'Low', 'Medium', 'High', 'Ultra'][value] ?? ''),
                              }),
                        },
                      }),
                    ),
                  ]
            }),
            'flex w-72 flex-col gap-6',
          ),
        ),
      )
    return h.empty
  }),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      PreviewControlsLayer,
      SwitchLayer,
      TabsLayer,
      SliderLayer,
      RadioLayer,
      ChecksLayer,
      ThinkingLayer,
    ),
  ),
)
