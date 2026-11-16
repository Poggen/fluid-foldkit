import { hoverModeOf as dropdownHoverModeOf } from '@foldkit-visuals/fluid/dropdown'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import { Boolean } from 'effect'

import { initAndInsert } from 'foldkit/binding'
import { previewCodeTabId } from '../../../../components/docs/preview-code-tabs'
import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { exampleHoverConfig } from './example-presentation.js'
import { Layer, Match, Option, Predicate, Schema } from 'effect'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  DropdownBlock,
  DropdownMenuBlock,
  DropdownSubBlock,
  layer,
  menuLayer,
  subLayer,
} from '@foldkit-visuals/fluid/dropdown'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { components, folders, languages, labels, matches, toggle } from './dropdown-example-data.js'

const Model = Schema.Struct({
  ...documentationFields,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  basic: DropdownBlock.Model,
  groups: DropdownBlock.Model,
  triggered: DropdownMenuBlock.Model,
  file: DropdownMenuBlock.Model,
  status: DropdownMenuBlock.Model,
  language: DropdownMenuBlock.Model,
  labels: DropdownMenuBlock.Model,
  components: DropdownMenuBlock.Model,
  move: DropdownSubBlock.Model,
  share: DropdownSubBlock.Model,
  selected: Schema.OptionFromNullOr(Schema.Number),
  view: Schema.Number,
  languageValue: Schema.String,
  languageQuery: Schema.String,
  statuses: Schema.Array(Schema.Number),
  labelsValue: Schema.Array(Schema.String),
  labelQuery: Schema.String,
  componentValues: Schema.Array(Schema.String),
  used: Schema.Array(Schema.String),
  componentQuery: Schema.String,
  isDisabled: Schema.Boolean,
  lastAction: Schema.String,
})

export const DropdownExampleKey = Symbol('DropdownExample')

const effects = Block.makeEffectsContract<never, DropdownResources>()

const Message = defineMessageUnion({
  UpdatedLanguageQuery: { value: Schema.String },
  UpdatedLabelQuery: { value: Schema.String },
  UpdatedComponentQuery: { value: Schema.String },
  ClickedDisabled: {},
})

export const DropdownExampleBlock = Block.make('DropdownExample', {
  key: DropdownExampleKey,
  Model,
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const single = (index: number) => ({
  checkedIndex: Option.some(index),
  checkedIndices: Option.none(),
})

const multiple = (indices: ReadonlyArray<number>) => ({
  checkedIndex: Option.none(),
  checkedIndices: Option.some(indices),
})

const FileRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'file',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'file-menu' }] },
})

const MoveRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownSubBlock, {
  field: 'move',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'move-menu', rootId: 'file-menu', parentId: 'file-menu' },
    ],
  },
})

const ShareRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownSubBlock, {
  field: 'share',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'share-menu', rootId: 'file-menu', parentId: 'file-menu' },
    ],
  },
})

const BasicRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownBlock, {
  field: 'basic',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'basic-menu', checkedIndex: 0 }] },
})

export const Basic = BasicRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep((model) => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

        if (selected === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        const value =
          Option.getOrNull(model.selected) === selected.index
            ? Option.none<number>()
            : Option.some(selected.index)

        return Update.combineSteps([
          DropdownExampleBlock.makeFieldsStep(() => ({ selected: () => value })),
          BasicRaw.requestSelection({
            selection: { checkedIndex: value, checkedIndices: Option.none() },
          }),
        ])
      }),
  }),
})

export const Groups = DropdownExampleBlock.makeRequiredFieldBinding(DropdownBlock, {
  field: 'groups',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'groups-menu' }] },
}).withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownBlock, {
    Events: () => DropdownExampleBlock.makeNoopStep(),
  }),
})

const TriggeredRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'triggered',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'triggered-menu', checkedIndex: 0 }] },
})

export const Triggered = TriggeredRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep(() => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

        return selected === undefined
          ? DropdownExampleBlock.makeNoopStep()
          : Update.combineSteps([
              DropdownExampleBlock.makeFieldsStep(() => ({ view: () => selected.index })),
              TriggeredRaw.requestSelection({ selection: single(selected.index) }),
            ])
      }),
  }),
})

export const File = FileRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep(() =>
        Update.combineSteps([
          ...(events.some((event) => Predicate.isTagged(event, 'Selected'))
            ? [DropdownExampleBlock.makeFieldsStep(() => ({ lastAction: () => 'Rename' }))]
            : []),
          ...(events
            .filter((event) => Predicate.isTagged(event, 'OpenChanged'))
            .some((event) => !event.open)
            ? [
                MoveRaw.requestVisibility({ open: false }),
                ShareRaw.requestVisibility({ open: false }),
              ]
            : []),
        ]),
      ),
  }),
})

const StatusRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'status',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'status-menu', checkedIndices: [0, 1, 2] }],
  },
})

export const Status = StatusRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep((model) => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

        if (selected === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        const statuses = toggle(model.statuses, selected.index)

        return Update.combineSteps([
          DropdownExampleBlock.makeFieldsStep(() => ({ statuses: () => statuses })),
          StatusRaw.requestSelection({ selection: multiple(statuses) }),
        ])
      }),
  }),
})

const LanguageRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'language',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'language-menu', checkedIndex: 0 }] },
})

export const Language = LanguageRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep((model) => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

        if (selected === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        const value = matches(languages, model.languageQuery)[selected.index]

        if (value === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        return Update.combineSteps([
          DropdownExampleBlock.makeFieldsStep(() => ({ languageValue: () => value })),
          LanguageRaw.requestSelection({ selection: single(selected.index) }),
        ])
      }),
  }),
})

const LabelsRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'labels',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'labels-menu', checkedIndices: [0, 3] }],
  },
})

export const Labels = LabelsRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep((model) => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))
        const filtered = matches(labels, model.labelQuery)
        const value = selected === undefined ? undefined : filtered[selected.index]

        if (value === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        const next = toggle(model.labelsValue, value)

        return Update.combineSteps([
          DropdownExampleBlock.makeFieldsStep(() => ({ labelsValue: () => next })),
          LabelsRaw.requestSelection({
            selection: multiple(
              filtered.flatMap((label, index) => (next.includes(label) ? [index] : [])),
            ),
          }),
        ])
      }),
  }),
})

const ComponentsRaw = DropdownExampleBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'components',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'components-menu', checkedIndices: [2, 6] }],
  },
})

export const Components = ComponentsRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep((model) => {
        const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

        if (selected === undefined) {
          return DropdownExampleBlock.makeNoopStep()
        }

        const filtered = matches(model.componentValues, model.componentQuery)
        const value = filtered[selected.index] ?? model.componentQuery.trim()

        const created =
          selected.index === filtered.length &&
          value !== '' &&
          !model.componentValues.some((current) => current.toLowerCase() === value.toLowerCase())

        if (value === '') {
          return DropdownExampleBlock.makeNoopStep()
        }

        const values = created ? [...model.componentValues, value] : model.componentValues
        const used = toggle(model.used, value)
        const query = created ? '' : model.componentQuery

        return Update.combineSteps([
          DropdownExampleBlock.makeFieldsStep(() => ({
            componentValues: () => values,
            used: () => used,
            componentQuery: () => query,
          })),
          ComponentsRaw.requestSelection({
            selection: multiple(
              matches(values, query).flatMap((label, index) =>
                used.includes(label) ? [index] : [],
              ),
            ),
          }),
        ])
      }),
  }),
})

export const Move = MoveRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownSubBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep(() =>
        Update.combineSteps(
          events.map((emitted) =>
            Match.value(emitted).pipe(
              Match.tagsExhaustive({
                OpenChanged: (event) =>
                  Update.combineSteps([
                    FileRaw.requestSubmenuHold({ index: 0, open: event.open }),
                    ...(event.open ? [ShareRaw.requestVisibility({ open: false })] : []),
                  ]),
                RootCloseRequested: () => FileRaw.requestVisibility({ open: false }),
                Selected: (event) =>
                  DropdownExampleBlock.makeFieldsStep(() => ({
                    lastAction: () => `Move to ${folders[event.index]}`,
                  })),
              }),
            ),
          ),
        ),
      ),
  }),
})

export const Share = ShareRaw.withOutMessagePolicy({
  fold: DropdownExampleBlock.makeOutMessageFold(DropdownSubBlock, {
    Events: ({ events }) =>
      DropdownExampleBlock.makeStep(() =>
        Update.combineSteps(
          events.map((emitted) =>
            Match.value(emitted).pipe(
              Match.tagsExhaustive({
                OpenChanged: (event) =>
                  Update.combineSteps([
                    FileRaw.requestSubmenuHold({ index: 1, open: event.open }),
                    ...(event.open ? [MoveRaw.requestVisibility({ open: false })] : []),
                  ]),
                RootCloseRequested: () => FileRaw.requestVisibility({ open: false }),
                Selected: (event) =>
                  DropdownExampleBlock.makeFieldsStep(() => ({
                    lastAction: () => (event.index === 0 ? 'Copy link' : 'Email'),
                  })),
              }),
            ),
          ),
        ),
      ),
  }),
})

export const DocTabs = DropdownExampleBlock.makeRecordBinding(PreviewControlsBlock, {
  field: 'docTabs',
})
const initDocTabs = [
  'basic',
  'groups',
  'triggered',
  'submenus',
  'multiple',
  'searchable',
  'searchable-multiple',
  'create',
].map((key) =>
  DropdownExampleBlock.makeStep((model) =>
    initAndInsert(DocTabs, model, {
      key,
      args: [
        {
          id: previewCodeTabId('dropdown', key),
          idPrefix: previewCodeTabId('dropdown', key),
          selectedIndex: 0,
        },
      ],
    }),
  ),
)
export const DropdownExampleComposition = DropdownExampleBlock.makeComposition({
  bindings: [
    DocTabs,
    Basic,
    Groups,
    Triggered,
    File,
    Status,
    Language,
    Labels,
    Components,
    Move,
    Share,
  ],
})

export const init = DropdownExampleComposition.makeInit(() => ({
  model: {
    ...documentationDefaults,
    docTabs: {},
    selected: Option.some(0),
    view: 0,
    languageValue: 'Auto detect',
    languageQuery: '',
    statuses: [0, 1, 2],
    labelsValue: ['Bug', 'Design'],
    labelQuery: '',
    componentValues: components,
    used: ['Button', 'Combobox'],
    componentQuery: '',
    isDisabled: false,
    lastAction: 'No action',
  },
  steps: initDocTabs,
}))

export const update = DropdownExampleComposition.makeUpdate({
  ClickedDisabled: DropdownExampleBlock.makeFieldsStep(() => ({ isDisabled: Boolean.not })),
  UpdatedLanguageQuery: DropdownExampleBlock.makeStep((model, { value }) =>
    Update.combineSteps([
      DropdownExampleBlock.makeFieldsStep(() => ({ languageQuery: () => value })),
      Language.requestSelection({
        selection: single(matches(languages, value).indexOf(model.languageValue)),
      }),
    ]),
  ),
  UpdatedLabelQuery: DropdownExampleBlock.makeStep((model, { value }) =>
    Update.combineSteps([
      DropdownExampleBlock.makeFieldsStep(() => ({ labelQuery: () => value })),
      Labels.requestSelection({
        selection: multiple(
          matches(labels, value).flatMap((label, index) =>
            model.labelsValue.includes(label) ? [index] : [],
          ),
        ),
      }),
    ]),
  ),
  UpdatedComponentQuery: DropdownExampleBlock.makeStep((model, { value }) =>
    Update.combineSteps([
      DropdownExampleBlock.makeFieldsStep(() => ({ componentQuery: () => value })),
      Components.requestSelection({
        selection: multiple(
          matches(model.componentValues, value).flatMap((label, index) =>
            model.used.includes(label) ? [index] : [],
          ),
        ),
      }),
    ]),
  ),
})

export const motion = createMotionScope('dropdown-example')

export const dependencies = Layer.mergeAll(layer, menuLayer, subLayer, PreviewControlsLayer)

export { Message }

export const inMessageUpdate = DropdownExampleComposition.makeInMessageUpdate({
  InformedOfDocumentation: DropdownExampleBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          controlsHoverModeOf(child) === hoverMode
            ? []
            : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
        ),
        DropdownExampleBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),

        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.basic) === hoverMode
            ? { model: current }
            : Basic.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.groups) === hoverMode
            ? { model: current }
            : Groups.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.triggered) === hoverMode
            ? { model: current }
            : Triggered.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.file) === hoverMode
            ? { model: current }
            : File.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.status) === hoverMode
            ? { model: current }
            : Status.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.language) === hoverMode
            ? { model: current }
            : Language.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.labels) === hoverMode
            ? { model: current }
            : Labels.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.components) === hoverMode
            ? { model: current }
            : Components.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.move) === hoverMode
            ? { model: current }
            : Move.requestHoverMode({ mode: hoverMode }),
        ),
        DropdownExampleBlock.makeStep((current) =>
          dropdownHoverModeOf(current.share) === hoverMode
            ? { model: current }
            : Share.requestHoverMode({ mode: hoverMode }),
        ),
      ]),
  ),
})
