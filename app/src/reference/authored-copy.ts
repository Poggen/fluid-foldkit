import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
/* @license Derived from Fluid Functionalism cc276ca0 InputCopy docs. MIT. */
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import { initAndInsert } from 'foldkit/binding'
import {
  InputFamilyExampleBlock,
  InputFamilyExampleLayer,
} from '../../../registry/fluid/examples/src/input-family-owner'
import type { InputFamilyConfig } from '../../../registry/fluid/examples/src/input-family-owner'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { ComponentPresentation, presentation } from '../settings'
import { motion, target } from '../motion'
import { reorder } from '../gallery/fluid/interactive-bindings'
import source from './authored-copy.ts?raw'
const command = 'npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json'
const scenes = [
  { title: 'Basic', keys: ['basic'] },
  { title: 'With Label', keys: ['label'] },
  { title: 'Button Variant', keys: ['button'] },
  { title: 'Left Aligned', keys: ['left', 'left-button'] },
  { title: 'Disabled', keys: ['disabled'] },
  { title: 'Copy Callback', keys: ['callback'] },
]
const config: (key: string) => InputFamilyConfig = (key: string) => ({
  valuePolicy: 'accept',
  copy: {
    id: `docs-copy-${key}`,
    value:
      key === 'disabled'
        ? 'ABCD-1234-EFGH'
        : key === 'callback'
          ? 'https://fluidfunctionalism.com/r/input-copy'
          : command,
    variant: key === 'button' || key === 'left-button' ? 'button' : 'icon',
    align: key.startsWith('left') ? 'left' : 'right',
    disabled: key === 'disabled',
  },
  message: { id: `docs-copy-unused-message-${key}`, value: '', reduceMotion: false },
})
const key = Symbol('AuthoredCopy')
export const AuthoredCopyBlock = Block.make('AuthoredCopy', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    copies: Schema.Record(Schema.String, InputFamilyExampleBlock.Model),
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof InputFamilyExampleBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredCopyBlock
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const Copies = Root.makeRecordBinding(InputFamilyExampleBlock, { field: 'copies' })
const Composition = Root.makeComposition({ bindings: [Copies, DocTabs] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { copies: {}, docTabs: {} },
    steps: [
      ...scenes.map(({ title }) =>
        Root.makeStep((model) =>
          initAndInsert(DocTabs, model, {
            key: title,
            args: [
              {
                id: previewCodeTabId('copy', title),
                idPrefix: previewCodeTabId('copy', title),
                selectedIndex: 0,
              },
            ],
          }),
        ),
      ),
      ...scenes.flatMap((scene) =>
        scene.keys.map((key) =>
          Root.makeStep((model) => initAndInsert(Copies, model, { key, args: [config(key)] })),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps(
        Object.entries(model.docTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
      ),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const appearance = {
      context: presentation(settings),
      shape: settings.shape,
      size: settings.size,
      hoverMode: settings.hover,
    }
    return h.div(
      [],
      scenes.map((scene) =>
        docSection(h, {
          title: scene.title,
          source,
          presentation: appearance,
          pane: model.docTabs[scene.title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId('copy', scene.title),
          tabs: (() => {
            const child = model.docTabs[scene.title]
            return child === undefined
              ? h.empty
              : h.block(
                  DocTabs.embedView({
                    key: scene.title,
                    slotId: child.tabs.id,
                    model: child,
                    viewInputs: previewCodeTabsViewInputs(h, {
                      ...appearance,
                      animate: target.node,
                      ariaLabel: `${scene.title} view`,
                    }),
                  }),
                )
          })(),
          className:
            scene.title === 'Left Aligned'
              ? 'flex flex-col gap-4 w-72'
              : scene.title === 'Copy Callback'
                ? 'w-72 flex flex-col gap-2'
                : 'w-72',
          children: scene.keys.flatMap((key) => {
            const child = model.copies[key]
            if (child === undefined) return []
            const label =
              key === 'label'
                ? 'Install command'
                : key === 'disabled'
                  ? 'Invite code'
                  : key === 'callback'
                    ? 'Share link'
                    : undefined
            return [
              h.block(
                Copies.embedView({
                  key,
                  slotId: `authored-copy-${key}`,
                  model: child,
                  viewInputs: {
                    getCopy: () => ({
                      ...appearance,
                      animate: target.node,
                      ...(label === undefined ? {} : { label }),
                    }),
                    getMessage: () => ({
                      ...appearance,
                      animate: motion.node,
                      getReorder: () => reorder,
                    }),
                    getTooltip: () => ({
                      ...appearance,
                      animate: motion.node,
                      reducedMotion: 'user' as const,
                    }),
                    renderInputs: (copy) =>
                      h.div(
                        [],
                        [
                          copy,
                          ...(key === 'callback'
                            ? [
                                h.p(
                                  [
                                    h.Class('text-site-caption text-muted-foreground px-1'),
                                    h.AriaLive('polite'),
                                  ],
                                  [
                                    `Copied ${child.copiedCount} ${child.copiedCount === 1 ? 'time' : 'times'}`,
                                  ],
                                ),
                              ]
                            : []),
                        ],
                      ),
                    renderDocument: (content, popups) => h.div([], [content, ...popups]),
                  },
                }),
              ),
            ]
          }),
        }),
      ),
    )
  }),
}).pipe(Layer.provide(Layer.merge(InputFamilyExampleLayer, PreviewControlsLayer)))
