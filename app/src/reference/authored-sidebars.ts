import { hoverModeOf as dialogHoverModeOf } from '@foldkit-visuals/fluid/sidebar/settings-dialog'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Fluid Functionalism cc276ca0 Sidebar authored sections. MIT.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import {
  SettingsDialogBlock,
  SettingsDialogLayer,
} from '@foldkit-visuals/fluid/sidebar/settings-dialog'
import { Button } from '@foldkit-visuals/fluid/button'
import { SidebarSceneBlock, layer as SceneLayer } from './sidebar-scene'
import { SidebarComparisonBlock, layer as ComparisonLayer } from './sidebar-comparison'
import { sidebarScenes, descriptions } from './sidebar-scenes'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { ComponentPresentation, presentation } from '../settings'
import { motion, highlight } from '../motion'
import { switchMotion } from '../gallery/fluid/core-bindings'
import source from './sidebar-scene.ts?raw'
const key = Symbol('AuthoredSidebars')
export const AuthoredSidebarsBlock = Block.make('AuthoredSidebars', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    scenes: Schema.Record(Schema.String, SidebarSceneBlock.Model),
    dialog: SettingsDialogBlock.Model,
    comparison: SidebarComparisonBlock.Model,
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SidebarSceneBlock>['programRequirements']
    | Block.FactsOf<typeof SettingsDialogBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredSidebarsBlock
const Scenes = Root.makeRecordBinding(SidebarSceneBlock, { field: 'scenes' })
const Dialog = Root.makeRequiredFieldBinding(SettingsDialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'docs-sidebar-settings' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SettingsDialogBlock, {
    OpenChanged: Root.makeNoopStep,
    SectionChanged: Root.makeNoopStep,
  }),
})
const Comparison = Root.makeRequiredFieldBinding(SidebarComparisonBlock, { field: 'comparison' })
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const initDocTabs = [...sidebarScenes.map(({ key }) => key), 'dialog'].map((key) =>
  Root.makeStep((model) =>
    initAndInsert(DocTabs, model, {
      key,
      args: [
        {
          id: previewCodeTabId('sidebars', key),
          idPrefix: previewCodeTabId('sidebars', key),
          selectedIndex: 0,
        },
      ],
    }),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocTabs, Scenes, Dialog, Comparison] })
const implementation = {
  init: Composition.makeInit(() => ({
    model: { scenes: {}, docTabs: {} },
    steps: [
      ...initDocTabs,
      ...sidebarScenes.map((scene) =>
        Root.makeStep((model) =>
          initAndInsert(Scenes, model, {
            key: scene.key,
            args: [
              {
                id: `docs-sidebar-${scene.key}`,
                kind: scene.kind,
                variant: scene.variant,
                click: scene.key === 'click',
              },
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, message) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === message.presentation.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: message.presentation.hover })],
        ),
        Root.makeStep((current) =>
          dialogHoverModeOf(current.dialog) === message.presentation.hover
            ? { model: current }
            : Dialog.requestHoverMode({ mode: message.presentation.hover }),
        ),
        Comparison.informOfPresentation({ presentation: message.presentation }),
        ...Object.keys(model.scenes).map((key) =>
          Scenes.informOfPresentation(key, { presentation: message.presentation }),
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    const documentationTabs = (key: string) => {
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
                animate: motion.node,
                ariaLabel: `${key} example`,
              }),
            }),
          )
    }
    const sceneView = (scene: (typeof sidebarScenes)[number]) => {
      const child = model.scenes[scene.key]
      if (child === undefined) return h.empty
      return docSection(h, {
        title: scene.section,
        description: descriptions[scene.section] ?? '',
        source,
        pane: model.docTabs[scene.key]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabs: documentationTabs(scene.key),
        tabsId: previewCodeTabId('sidebars', scene.key),
        presentation: { context },
        className: 'w-full',
        previewPadding: 'none',
        ...(scene.caption ? { hideHeader: true, caption: scene.caption } : {}),
        children: [
          h.block(
            Scenes.embedView({
              key: scene.key,
              slotId: `docs-sidebar-${scene.key}`,
              model: child,
              viewInputs: {
                settings,
                banner: scene.key === 'banner-callouts',
                height: scene.height,
              },
            }),
          ),
        ],
      })
    }
    return h.div(
      [],
      [
        ...sidebarScenes.filter((scene) => scene.key !== 'alignment').map(sceneView),
        docSection(h, {
          title: 'Inside a dialog',
          description:
            'A settings dialog with the sidebar inside. 3 props make it fit: collapsible="none" drops the rail and the drawer, persist={false} skips the cookie, and h-full pins it to the dialog’s height. Below sm a Select takes over.',
          source,
          pane: model.docTabs.dialog?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabs: documentationTabs('dialog'),
          tabsId: previewCodeTabId('sidebars', 'dialog'),
          presentation: { context },
          children: [
            h.block(
              Dialog.embedView({
                slotId: 'docs-sidebar-settings',
                model: model.dialog,
                viewInputs: {
                  context,
                  animate: motion.node,
                  switchAnimate: switchMotion.node,
                  highlight,
                  trigger: (attributes) =>
                    Button(
                      { context, variant: 'secondary', attributes, children: ['Open settings'] },
                      h,
                    ),
                },
              }),
            ),
          ],
        }),
        h.block(
          Comparison.embedView({
            slotId: 'docs-sidebar-comparison',
            model: model.comparison,
            viewInputs: { settings },
          }),
        ),
        ...sidebarScenes.filter((scene) => scene.key === 'alignment').map(sceneView),
      ],
    )
  }),
}
export const layer = Root.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(
    Layer.mergeAll(SceneLayer, SettingsDialogLayer, ComparisonLayer, PreviewControlsLayer),
  ),
)
