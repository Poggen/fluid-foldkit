import { referenceSection, referenceMuted, referenceHeading } from './classes'
import { hoverModeOf as colorpickerpopoverHoverModeOf } from '@foldkit-visuals/fluid/color-picker-popover'
import { hoverModeOf as colorpickerHoverModeOf } from '@foldkit-visuals/fluid/color-picker'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import {
  ColorPickerPopoverBlock,
  layer as ColorPickerPopoverLayer,
} from '@foldkit-visuals/fluid/color-picker-popover'
/* @license Derived from Fluid Functionalism cc276ca0 ColorPicker docs. MIT. */
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { ColorPickerBlock, layer as ColorLayer } from '@foldkit-visuals/fluid/color-picker'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion, highlight, target } from '../motion'
import { sliderMotion } from '../gallery/fluid/core-bindings'
import { ComponentPresentation, presentation } from '../settings'
import source from './authored-colors.ts?raw'
const panels = ['Default', 'With Swatches', 'OKLCH Format', 'Controlled']
const popovers = ['Popover', 'Removable Trigger']
const titles = [
  'Default',
  'Popover',
  'With Swatches',
  'OKLCH Format',
  'Controlled',
  'Removable Trigger',
]
const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const key = Symbol('AuthoredColors')
export const AuthoredColorsBlock = Block.make('AuthoredColors', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    colors: Schema.Record(Schema.String, ColorPickerBlock.Model),
    popovers: Schema.Record(Schema.String, ColorPickerPopoverBlock.Model),
    isRemoved: Schema.Boolean,
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: defineMessageUnion({
    Added: {},
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof ColorPickerBlock>['programRequirements']
    | Block.FactsOf<typeof ColorPickerPopoverBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredColorsBlock
const RawColors = Root.makeRecordBinding(ColorPickerBlock, { field: 'colors' })
const Colors = RawColors.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(ColorPickerBlock, {
      Events: ({ events }) =>
        Root.makeStep((model) => {
          const child = model.colors[key],
            value = events.findLast((event) => event.type === 'value')
          return child === undefined || value === undefined
            ? { model }
            : RawColors.requestConfigure(key, {
                settings: { ...child.color.settings, value: Option.some(value.value) },
              })
        }),
    }),
})
const RawPopovers = Root.makeRecordBinding(ColorPickerPopoverBlock, { field: 'popovers' })
const Popovers = RawPopovers.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(ColorPickerPopoverBlock, {
      PickerEvents: ({ events }) =>
        Root.makeStep((model) => {
          const child = model.popovers[key],
            value = events.findLast((event) => event.type === 'value')
          return child === undefined || value === undefined
            ? { model }
            : RawPopovers.requestConfigure(key, {
                settings: { ...child.settings, value: Option.some(value.value) },
                open: Option.none(),
              })
        }),
      OpenChanged: Root.makeNoopStep,
      Removed: () =>
        Update.combineSteps([
          Root.makeFieldsStep(() => ({ isRemoved: () => true })),
          Root.makeStep((model) => {
            const child = model.popovers[key]
            return child === undefined
              ? { model }
              : RawPopovers.requestConfigure(key, {
                  settings: child.settings,
                  open: Option.some(false),
                })
          }),
        ]),
    }),
})
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    titles.map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('color-picker', section),
              idPrefix: previewCodeTabId('color-picker', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocumentationTabs, Colors, Popovers] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { colors: {}, popovers: {}, isRemoved: false, documentationTabs: {} },
    steps: [
      initDocumentationTabs,
      ...panels.map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Colors, model, {
            key,
            args: [
              {
                id: `docs-color-${key.toLowerCase().replaceAll(' ', '-')}`,
                defaultValue: '#6B97FF',
                ...(key === 'OKLCH Format' ? { defaultFormat: 'oklch' } : {}),
                ...(key === 'With Swatches'
                  ? {
                      swatches: [
                        '#000000',
                        '#FFFFFF',
                        '#FF3B30',
                        '#F0F0F0',
                        '#E5E5E5',
                        '#D0D0D0',
                        'rgba(0,0,0,0.5)',
                      ],
                    }
                  : {}),
              },
            ],
          }),
        ),
      ),
      ...popovers.map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Popovers, model, {
            key,
            args: [
              {
                id: `docs-color-${key.toLowerCase().replaceAll(' ', '-')}`,
                defaultValue: '#6B97FF',
              },
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    Added: Root.makeStep((model) => {
      const child = model.popovers['Removable Trigger']
      return Update.combineSteps([
        Root.makeFieldsStep(() => ({ isRemoved: () => false })),
        ...(child === undefined
          ? []
          : [
              RawPopovers.requestConfigure('Removable Trigger', {
                settings: { ...child.settings, value: Option.some('#6B97FF') },
                open: Option.none(),
              }),
            ]),
      ])
    }),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        documentationTabsHover(settings.hover),
        ...Object.entries(model.colors).flatMap(([key, child]) =>
          colorpickerHoverModeOf(child) === settings.hover
            ? []
            : [Colors.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.popovers).flatMap(([key, child]) =>
          colorpickerpopoverHoverModeOf(child) === settings.hover
            ? []
            : [Popovers.requestHoverMode(key, { mode: settings.hover })],
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    return h.div(
      [],
      [
        ...titles.map((title) => {
          const color = model.colors[title],
            popup = model.popovers[title],
            id = `docs-color-container-${title.toLowerCase().replaceAll(' ', '-')}`
          const common = {
            context,
            portalContainerId: id,
            animate: motion.node,
            sliderMotion: sliderMotion.node,
            highlightMotion: highlight,
          }
          return docSection(h, {
            title,
            source,
            presentation: { context },
            pane: model.documentationTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
            tabsId: previewCodeTabId('color-picker', title),
            tabs: h.block(
              DocumentationTabs.embedView({
                key: title,
                slotId: previewCodeTabId('color-picker', title),
                model: documentationTabsFor(model.documentationTabs, title),
                viewInputs: previewCodeTabsViewInputs(h, {
                  context,
                  animate: target.node,
                  ariaLabel: `${title} example view`,
                }),
              }),
            ),
            children: [
              h.div(
                [h.Id(id), h.Class('flex flex-col gap-3 items-start')],
                [
                  color === undefined
                    ? null
                    : h.block(
                        Colors.embedView({
                          key: title,
                          slotId: color.color.id,
                          model: color,
                          viewInputs: common,
                        }),
                      ),
                  popup === undefined
                    ? null
                    : title === 'Removable Trigger' && model.isRemoved
                      ? Button(
                          {
                            context,
                            variant: 'tertiary',
                            children: ['+ Add fill'],
                            attributes: [h.OnClick(Root.Message.Added())],
                          },
                          h,
                        )
                      : h.block(
                          Popovers.embedView({
                            key: title,
                            slotId: popup.id,
                            model: popup,
                            viewInputs: {
                              ...common,
                              triggerLabel: 'Fill',
                              triggerShowRemove: title === 'Removable Trigger',
                            },
                          }),
                        ),
                  title === 'Controlled' && color !== undefined
                    ? h.p(
                        [h.Class('text-muted-foreground')],
                        [`Current: ${Option.getOrNull(color.color.settings.value) ?? '#6B97FF'}`],
                      )
                    : null,
                ],
              ),
            ],
          })
        }),
        h.section(
          [h.Class(referenceSection)],
          [
            h.h2([h.Class(referenceHeading)], ['Eyedropper Support']),
            h.p(
              [h.Class(referenceMuted)],
              [
                'The eyedropper uses the native window.EyeDropper API (Chromium-based browsers). It is automatically hidden in browsers that do not support it.',
              ],
            ),
          ],
        ),
      ],
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(ColorLayer, ColorPickerPopoverLayer, PreviewControlsLayer)))
