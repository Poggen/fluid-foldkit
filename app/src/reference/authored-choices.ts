import { hoverModeOf as comboboxHoverModeOf } from '@foldkit-visuals/fluid/combobox'
import { hoverModeOf as selectHoverModeOf } from '@foldkit-visuals/fluid/select'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Derived from Fluid Functionalism cc276ca0 Select and Combobox docs. MIT.
import { Effect, Layer, Schema } from 'effect'
import { createKeyedLazy } from 'foldkit/html'
import { Block, Update } from 'foldkit'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import type { SelectConfig, SelectOption } from '@foldkit-visuals/fluid/select'
import { ComboboxBlock, layer as ComboLayer } from '@foldkit-visuals/fluid/combobox'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion } from '../motion'
import { ComponentPresentation, presentation } from '../settings'
import { selectScenes, comboScenes } from './choice-scenes'
import type { ChoiceScene } from './choice-scenes'
import { documentationRuntime } from '../documentation-runtime'
const key = Symbol('AuthoredChoices')
export const AuthoredChoicesBlock = Block.make('AuthoredChoices', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    selects: Schema.Record(Schema.String, SelectBlock.Model),
    combos: Schema.Record(Schema.String, ComboboxBlock.Model),
    docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof ComboboxBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredChoicesBlock
const DocTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const RawSelects = Root.makeRecordBinding(SelectBlock, { field: 'selects' })
const Selects = RawSelects.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(SelectBlock, {
      Selected: ({ value }) =>
        Root.makeStep((model) => {
          const child = model.selects[key]
          return child === undefined
            ? { model }
            : RawSelects.requestConfigure(key, {
                items: child.items,
                value,
                disabled: child.disabled,
              })
        }),
      OpenChanged: Root.makeNoopStep,
    }),
})
const RawCombos = Root.makeRecordBinding(ComboboxBlock, { field: 'combos' })
const Combos = RawCombos.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(ComboboxBlock, {
      Selected: Root.makeNoopStep,
      ValuesChanged: ({ values }) =>
        Root.makeStep((model) => {
          const child = model.combos[key]
          return child === undefined
            ? { model }
            : RawCombos.requestConfigure(key, {
                items: child.items,
                value: values,
                disabled: child.disabled,
                multiple: child.multiple,
                hideSelected: child.hideSelected,
                allowCreate: child.allowCreate,
              })
        }),
      CreateRequested: ({ query }) =>
        RawCombos.requestAcceptCreated(key, {
          item: { value: query.toLowerCase().replace(/\s+/gu, '-'), label: query },
        }),
    }),
})
const Composition = Root.makeComposition({ bindings: [Selects, Combos, DocTabs] })
const implementation = {
  init: Composition.makeInit(() => ({
    model: { selects: {}, combos: {}, docTabs: {} },
    steps: [
      ...[
        { slug: 'select', scenes: selectScenes },
        { slug: 'combobox', scenes: comboScenes },
      ].flatMap(({ slug, scenes }) =>
        scenes.map(({ title }) =>
          Root.makeStep((model) => {
            const key = `${slug}:${title}`
            return initAndInsert(DocTabs, model, {
              key,
              args: [
                {
                  id: previewCodeTabId('choices', key),
                  idPrefix: previewCodeTabId('choices', key),
                  selectedIndex: 0,
                },
              ],
            })
          }),
        ),
      ),
      ...selectScenes.flatMap((scene) =>
        scene.rows.map((row) =>
          Root.makeStep((model) => {
            const config: SelectConfig = {
              id: `docs-select-${row.key}`,
              items: row.items,
              defaultValue: typeof row.initial === 'string' ? row.initial : '',
              disabled: row.disabled ?? false,
            }
            return initAndInsert(Selects, model, { key: row.key, args: [config] })
          }),
        ),
      ),
      ...comboScenes.flatMap((scene) =>
        scene.rows.map((row) =>
          Root.makeStep((model) =>
            initAndInsert(Combos, model, {
              key: row.key,
              args: [
                {
                  id: `docs-combo-${row.key}`,
                  items: row.items,
                  defaultValue: row.initial ?? '',
                  multiple: row.multiple ?? false,
                  disabled: row.disabled ?? false,
                  hideSelected: row.hideSelected ?? false,
                  allowCreate: row.allowCreate ?? false,
                },
              ],
            }),
          ),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [DocTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.selects).flatMap(([key, child]) =>
          selectHoverModeOf(child) === settings.hover
            ? []
            : [Selects.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.combos).flatMap(([key, child]) =>
          comboboxHoverModeOf(child) === settings.hover
            ? []
            : [Combos.requestHoverMode(key, { mode: settings.hover })],
        ),
      ]),
    ),
  }),
}
type H = Parameters<Parameters<typeof Composition.makeView.withInputs>[0]>[2]
type Model = typeof Root.Model.Type
type Row = ChoiceScene['rows'][number]
type Paint = Pick<ComponentPresentation, 'shape' | 'size' | 'hover'>
const iconFor = (row: Row, value: string) => {
  if (row.icons === 'theme')
    return value === 'light'
      ? defaultIcons.sun
      : value === 'dark'
        ? defaultIcons.moon
        : defaultIcons.monitor
  if (row.icons === 'settings')
    return value === 'profile'
      ? defaultIcons.user
      : value === 'email'
        ? defaultIcons.mail
        : value === 'notifications'
          ? defaultIcons.bell
          : defaultIcons.shield
  return value === 'shared'
    ? defaultIcons.users
    : value === 'starred'
      ? defaultIcons.star
      : value === 'recent'
        ? defaultIcons.clock
        : value === 'private'
          ? defaultIcons.lock
          : defaultIcons.mail
}
const commonInputs = (row: Row, settings: Paint) => ({
  context: presentation(settings),
  animate: motion.node,
  placeholder: row.placeholder,
  variant: row.variant ?? 'bordered',
  ...(row.error === undefined ? {} : { error: row.error }),
  ...(row.icons === 'globe' ? { icon: defaultIcons.globe } : {}),
  ...(row.icons === 'theme' || row.icons === 'settings' || row.icons === 'view'
    ? { itemIconFor: (item: SelectOption) => iconFor(row, item.value) }
    : {}),
})
const renderSelect = (
  model: Model['selects'][string],
  row: Row,
  shape: Paint['shape'],
  size: Paint['size'],
  hover: Paint['hover'],
  h: H,
) =>
  h.block(
    Selects.embedView({
      key: row.key,
      slotId: model.id,
      model,
      viewInputs: {
        ...commonInputs(row, { shape, size, hover }),
        ...(row.icons === 'theme' ? { icon: iconFor(row, model.value) } : {}),
      },
    }),
  )
const renderCombo = (
  model: Model['combos'][string],
  row: Row,
  shape: Paint['shape'],
  size: Paint['size'],
  hover: Paint['hover'],
  h: H,
) =>
  h.block(
    Combos.embedView({
      key: row.key,
      slotId: model.id,
      model,
      viewInputs: {
        ...commonInputs(row, { shape, size, hover }),
        className: row.width ?? '',
        ...(row.icons === 'view' ? { icon: defaultIcons.search } : {}),
        emptyText:
          row.icons === 'view'
            ? 'No view matches.'
            : row.key === 'long'
              ? 'No timezone matches.'
              : row.multiple && row.key !== 'multiple'
                ? 'No component found.'
                : 'No framework found.',
      },
    }),
  )
const renderTabs = (
  model: Model['docTabs'][string],
  section: string,
  title: string,
  shape: Paint['shape'],
  size: Paint['size'],
  hover: Paint['hover'],
  h: H,
) =>
  h.block(
    DocTabs.embedView({
      key: section,
      slotId: model.tabs.id,
      model,
      viewInputs: previewCodeTabsViewInputs(h, {
        context: presentation({ shape, size, hover }),
        animate: motion.node,
        ariaLabel: `${title} view`,
      }),
    }),
  )
const makeView = () => {
  const lazySelect = createKeyedLazy()
  const lazyCombo = createKeyedLazy()
  const lazyTabs = createKeyedLazy()
  return Composition.makeView.withInputs((model, { slug, settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    const scenes = slug === 'select' ? selectScenes : comboScenes
    return h.div(
      [],
      scenes.map((scene) => {
        const section = `${slug}:${scene.title}`
        const tabs = model.docTabs[section]
        return docSection(h, {
          title: scene.title,
          ...(scene.description === undefined ? {} : { description: scene.description }),
          source: documentationRuntime().sources['authored-choices'],
          presentation: { context },
          pane: tabs?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId('choices', section),
          tabs:
            tabs === undefined
              ? h.empty
              : lazyTabs(section, renderTabs, [
                  tabs,
                  section,
                  scene.title,
                  settings.shape,
                  settings.size,
                  settings.hover,
                  h,
                ]),
          className:
            scene.title === 'Error & disabled'
              ? 'flex flex-wrap items-start gap-3'
              : 'flex flex-wrap items-center gap-3',
          children: scene.rows.flatMap((row) => {
            if (slug === 'select') {
              const child = model.selects[row.key]
              return child === undefined
                ? []
                : [
                    lazySelect(row.key, renderSelect, [
                      child,
                      row,
                      settings.shape,
                      settings.size,
                      settings.hover,
                      h,
                    ]),
                  ]
            }
            const child = model.combos[row.key]
            return child === undefined
              ? []
              : [
                  lazyCombo(row.key, renderCombo, [
                    child,
                    row,
                    settings.shape,
                    settings.size,
                    settings.hover,
                    h,
                  ]),
                ]
          }),
        })
      }),
    )
  })
}
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = Root.makeLayer(plans).pipe(
  Layer.provide(Layer.mergeAll(SelectLayer, ComboLayer, PreviewControlsLayer)),
)
