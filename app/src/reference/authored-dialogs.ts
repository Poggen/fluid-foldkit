import { hoverModeOf as settingsDialogHoverModeOf } from '@foldkit-visuals/fluid/sidebar/settings-dialog'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Derived from Fluid Functionalism cc276ca0 Dialog docs. MIT.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import {
  DialogBlock,
  DialogLayer,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@foldkit-visuals/fluid/dialog'
import {
  SettingsDialogBlock,
  SettingsDialogLayer,
} from '@foldkit-visuals/fluid/sidebar/settings-dialog'
import { Button } from '@foldkit-visuals/fluid/button'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion, highlight } from '../motion'
import { switchMotion } from '../gallery/fluid/core-bindings'
import { ComponentPresentation, presentation } from '../settings'
import source from './authored-dialogs.ts?raw'
const sizes = [
  {
    key: 'small',
    size: 'sm',
    label: 'Small',
    description: '400px: a confirmation, 1 field, a short message.',
  },
  {
    key: 'large',
    size: 'lg',
    label: 'Large',
    description: '540px: a short form, or a longer confirmation.',
  },
  {
    key: 'extra-large',
    size: 'xl',
    label: 'Extra large',
    description: '880px: 2 columns, a table, or a sidebar beside a panel.',
  },
] as const
const key = Symbol('AuthoredDialogs')
export const AuthoredDialogsBlock = Block.make('AuthoredDialogs', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    dialogs: Schema.Record(Schema.String, DialogBlock.Model),
    settings: SettingsDialogBlock.Model,
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  Message: Schema.Never,
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof DialogBlock>['programRequirements']
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
const Root = AuthoredDialogsBlock
const Dialogs = Root.makeRecordBinding(DialogBlock, { field: 'dialogs' }).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DialogBlock, {
    OpenChanged: Root.makeNoopStep,
    CompletedClose: Root.makeNoopStep,
  }),
})
const SettingsDialog = Root.makeRequiredFieldBinding(SettingsDialogBlock, {
  field: 'settings',
  init: { contextToArgs: () => [{ id: 'docs-dialog-settings' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SettingsDialogBlock, {
    OpenChanged: Root.makeNoopStep,
    SectionChanged: Root.makeNoopStep,
  }),
})
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const initDocTabs = ['Basic', 'Sizes', 'With a sidebar'].map((key) =>
  Root.makeStep((model) =>
    initAndInsert(DocTabs, model, {
      key,
      args: [
        {
          id: previewCodeTabId('dialogs', key),
          idPrefix: previewCodeTabId('dialogs', key),
          selectedIndex: 0,
        },
      ],
    }),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocTabs, Dialogs, SettingsDialog] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { dialogs: {}, docTabs: {} },
    steps: [
      ...initDocTabs,
      ...['basic', ...sizes.map(({ key }) => key)].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Dialogs, model, { key, args: [{ id: `docs-dialog-${key}` }] }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        Root.makeStep((current) =>
          settingsDialogHoverModeOf(current.settings) === settings.hover
            ? { model: current }
            : SettingsDialog.requestHoverMode({ mode: settings.hover }),
        ),
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
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
    const dialog = (key: string) => {
      const child = model.dialogs[key],
        spec = sizes.find((spec) => spec.key === key)
      return child === undefined
        ? h.empty
        : h.block(
            Dialogs.embedView({
              key,
              slotId: child.id,
              model: child,
              viewInputs: {
                context,
                animate: motion.node,
                size: spec?.size ?? 'sm',
                trigger: (attributes) =>
                  Button(
                    {
                      context,
                      variant: key === 'basic' ? 'tertiary' : 'secondary',
                      attributes,
                      children: [spec?.label ?? 'Open dialog'],
                    },
                    h,
                  ),
                content: (info) => [
                  DialogHeader(
                    {
                      context,
                      children: [
                        DialogTitle(
                          {
                            context,
                            dialogId: info.id,
                            children: [
                              spec === undefined ? 'Create teamspace' : `${spec.label} dialog`,
                            ],
                          },
                          h,
                        ),
                        DialogDescription(
                          {
                            context,
                            dialogId: info.id,
                            children: [
                              spec?.description ??
                                'Add a new teamspace to organize your projects and collaborate with your team.',
                            ],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  DialogFooter(
                    {
                      context,
                      children: [
                        Button(
                          {
                            context,
                            variant: 'ghost',
                            attributes: info.close,
                            children: [key === 'basic' ? 'Cancel' : 'Close'],
                          },
                          h,
                        ),
                        ...(key === 'basic' ? [Button({ context, children: ['Create'] }, h)] : []),
                      ],
                    },
                    h,
                  ),
                ],
              },
            }),
          )
    }
    const section = (
      title: string,
      children: ReadonlyArray<ReturnType<typeof h.div>>,
      description = '',
    ) =>
      docSection(h, {
        title,
        children,
        description,
        source,
        presentation: { context },
        className: 'flex flex-wrap items-center gap-2',
        pane: model.docTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabs: documentationTabs(title),
        tabsId: previewCodeTabId('dialogs', title),
      })
    return h.div(
      [],
      [
        section('Basic', [dialog('basic')]),
        section(
          'Sizes',
          sizes.map(({ key }) => dialog(key)),
          '3 widths: sm for a confirmation, lg for a short form, xl for a layout of its own.',
        ),
        section('With a sidebar', [
          h.block(
            SettingsDialog.embedView({
              slotId: 'docs-dialog-settings',
              model: model.settings,
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
        ]),
      ],
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(DialogLayer, SettingsDialogLayer, PreviewControlsLayer)))
