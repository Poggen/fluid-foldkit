import { hoverModeOf as selectHoverModeOf } from '@foldkit-visuals/fluid/select'
import { hoverModeOf as dropdownHoverModeOf } from '@foldkit-visuals/fluid/dropdown'
import { hoverModeOf as breadcrumbHoverModeOf } from '@foldkit-visuals/fluid/breadcrumb'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import { modifyFields } from 'foldkit/struct'

import { initAndInsert } from 'foldkit/binding'
import { previewCodeTabId } from '../../../../components/docs/preview-code-tabs'
import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Effect, Layer, Option, Predicate, Queue, Random, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { BreadcrumbBlock, layer as BreadcrumbLayer } from '@foldkit-visuals/fluid/breadcrumb'
import { DropdownMenuBlock, menuLayer } from '@foldkit-visuals/fluid/dropdown'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { SwitchBlock, SwitchLayer, createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import {
  BooleanSetting,
  Settings,
  initialSettings,
  sections,
  menuKeys,
  SelectSetting,
  selectSettings,
  selectDisabled,
} from './breadcrumb-example-data.js'

export const motion = createMotionScope('breadcrumb-authored')

export const switchMotion = createSwitchMotionScope('breadcrumb-playground-switches')

const Shape = Schema.Literals(['sharp', 'rounded', 'pill'])

const Mode = Schema.Literals(['fluid', 'standard'])

export const Model = Schema.Struct({
  ...documentationFields,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  trails: Schema.Record(Schema.String, BreadcrumbBlock.Model),
  menus: Schema.Record(Schema.String, DropdownMenuBlock.Model),
  switches: Schema.Record(Schema.String, SwitchBlock.Model),
  selects: Schema.Record(Schema.String, SelectBlock.Model),
  tooltips: DocumentTooltipBlock.Model,
  settings: Settings,
  isExpanded: Schema.Boolean,
  width: Schema.Finite,
  shape: Shape,
  mode: Mode,
})

export const Message = defineMessageUnion({
  UpdatedShape: { shape: Shape },
  UpdatedMode: { mode: Mode },
  UpdatedSettings: { settings: Settings },
  ClickedExpanded: { expanded: Schema.Boolean },
  ClickedPlaygroundExpanded: { expanded: Schema.Boolean },
  Resized: { width: Schema.Finite },
  ClickedShuffle: {},
  CompletedShuffle: { settings: Settings },
})

export const BreadcrumbExampleKey = Symbol('BreadcrumbExample')

export const BreadcrumbExampleBlock = Block.make('BreadcrumbExample', {
  key: BreadcrumbExampleKey,
  Model,
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
    | Block.FactsOf<typeof DropdownMenuBlock>['programRequirements']
  >(),
})

const RawTrails = BreadcrumbExampleBlock.makeRecordBinding(BreadcrumbBlock, { field: 'trails' })

const RawSwitches = BreadcrumbExampleBlock.makeRecordBinding(SwitchBlock, { field: 'switches' })

const RawSelects = BreadcrumbExampleBlock.makeRecordBinding(SelectBlock, { field: 'selects' })

const switchDisabled = (key: BooleanSetting, model: Model): boolean => {
  if (key === 'dropdownStep' || key === 'longName') {
    return model.settings.steps < 3
  }

  if (key === 'openOnHover') {
    const hidden =
      (model.settings.collapse === 'always' && model.settings.steps >= 5) ||
      (model.trails.playground?.hiddenCount ?? 0) > 0

    return (
      !(model.settings.dropdownStep && model.settings.steps >= 3) &&
      !(hidden && model.settings.reveal === 'menu')
    )
  }

  return false
}

const syncSwitches = BreadcrumbExampleBlock.makeStep((model) =>
  Update.combineSteps(
    BooleanSetting.literals.map((key) =>
      RawSwitches.requestConfigure(key, {
        checked: model.settings[key],
        disabled: switchDisabled(key, model),
      }),
    ),
  ),
)

const updateSettings = (settings: Settings, reshape = true) =>
  Update.combineSteps([
    BreadcrumbExampleBlock.makeFieldsStep(() => ({ settings: () => settings })),
    ...(reshape
      ? [
          RawTrails.requestCount('playground', {
            count: settings.collapse === 'overflow' ? settings.steps : 0,
          }),
          RawTrails.requestExpanded('playground', { expanded: false }),
        ]
      : []),
    syncSwitches,
    BreadcrumbExampleBlock.makeStep((model) =>
      Update.combineSteps(
        selectSettings.map(({ key, items }) =>
          RawSelects.requestConfigure(key, {
            items,
            value: String(model.settings[key]),
            disabled: selectDisabled(key, model.settings),
          }),
        ),
      ),
    ),
  ])

export const Selects = RawSelects.withOutMessagePolicy({
  fold: (key) =>
    BreadcrumbExampleBlock.makeOutMessageFold(SelectBlock, {
      OpenChanged: BreadcrumbExampleBlock.makeNoopStep,
      Selected: ({ value }) =>
        BreadcrumbExampleBlock.makeStep((model) => {
          if (!Schema.is(SelectSetting)(key)) return BreadcrumbExampleBlock.makeNoopStep()
          const settings = Schema.decodeUnknownSync(Settings)({
            ...model.settings,
            [key]: key === 'steps' ? Number(value) : value,
          })
          return updateSettings(settings, key !== 'separator')
        }),
    }),
})

export const Trails = RawTrails.withOutMessagePolicy({
  fold: BreadcrumbExampleBlock.makeOutMessageFold(BreadcrumbBlock, {
    ExpandedChanged: BreadcrumbExampleBlock.makeNoopStep,
    LayoutChanged: () => BreadcrumbExampleBlock.makeStep(() => syncSwitches),
  }),
})

export const Menus = BreadcrumbExampleBlock.makeRecordBinding(DropdownMenuBlock, {
  field: 'menus',
}).withOutMessagePolicy({
  fold: (key) =>
    BreadcrumbExampleBlock.makeOutMessageFold(DropdownMenuBlock, {
      Events: ({ events }) =>
        BreadcrumbExampleBlock.makeStep(() => {
          const selected = events.find((event) => Predicate.isTagged(event, 'Selected'))

          return selected && key.endsWith('-step')
            ? Menus.requestSelection(key, {
                selection: {
                  checkedIndex: Option.some(selected.index),
                  checkedIndices: Option.none(),
                },
              })
            : BreadcrumbExampleBlock.makeNoopStep()
        }),
    }),
})

export const Switches = RawSwitches.withOutMessagePolicy({
  fold: (key) =>
    BreadcrumbExampleBlock.makeOutMessageFold(SwitchBlock, {
      Toggled: () =>
        BreadcrumbExampleBlock.makeStep((model) => {
          if (!Schema.is(BooleanSetting)(key)) {
            return BreadcrumbExampleBlock.makeNoopStep()
          }

          return updateSettings({ ...model.settings, [key]: !model.settings[key] }, false)
        }),
    }),
})

export const Tooltips = BreadcrumbExampleBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: BreadcrumbExampleBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: BreadcrumbExampleBlock.makeNoopStep,
  }),
})

const stay = (event: Event) => {
  if (event.target instanceof Element && event.target.closest('a[data-breadcrumb-target]')) {
    event.preventDefault()
  }
}

const Observe = BreadcrumbExampleBlock.makeMountStream('Observe', {
  messages: [Message.Resized],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<Resized>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      throw new Error('Breadcrumb example requires an HTML root')
                    }

                    let drag: {
                      readonly x: number
                      readonly width: number
                      readonly pointer: number
                    } | null = null

                    const down = (event: PointerEvent) => {
                      if (!(event.target instanceof Element)) {
                        return
                      }

                      const handle = event.target.closest<HTMLElement>('[data-breadcrumb-resize]')

                      if (!handle) {
                        return
                      }

                      handle.setPointerCapture(event.pointerId)
                      drag = {
                        x: event.clientX,
                        width: Number(handle.getAttribute('aria-valuenow')),
                        pointer: event.pointerId,
                      }
                    }

                    const move = (event: PointerEvent) => {
                      if (!drag || event.pointerId !== drag.pointer) {
                        return
                      }

                      Queue.offerUnsafe(
                        queue,
                        Message.Resized({
                          width: Math.min(
                            560,
                            Math.max(200, drag.width + (event.clientX - drag.x) * 2),
                          ),
                        }),
                      )
                    }

                    const up = () => {
                      drag = null
                    }

                    element.addEventListener('click', stay)
                    element.addEventListener('pointerdown', down)
                    element.addEventListener('pointermove', move)
                    element.addEventListener('pointerup', up)
                    element.addEventListener('pointercancel', up)

                    return () => {
                      element.removeEventListener('click', stay)
                      element.removeEventListener('pointerdown', down)
                      element.removeEventListener('pointermove', move)
                      element.removeEventListener('pointerup', up)
                      element.removeEventListener('pointercancel', up)
                    }
                  }),
                  (dispose) => Effect.sync(dispose),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})

const Shuffle = BreadcrumbExampleBlock.makeCommand('Shuffle', {
  messages: [Message.CompletedShuffle],
  *handler() {
    return () =>
      Effect.gen(function* handler() {
        const steps = yield* Random.nextIntBetween(3, 6)
        const collapse = yield* Random.nextIntBetween(0, 2)

        return Message.CompletedShuffle({
          settings: {
            steps,
            icons: yield* Random.nextBoolean,
            dropdownStep: yield* Random.nextBoolean,
            collapse: Settings.fields.collapse.literals[collapse] ?? 'never',
            reveal: (yield* Random.nextBoolean) ? 'menu' : 'expand',
            separator: (yield* Random.next) > 0.75 ? 'slash' : 'chevron',
            longName: (yield* Random.next) > 0.6,
            openOnHover: yield* Random.nextBoolean,
          },
        })
      })
  },
})

export const DocTabs = BreadcrumbExampleBlock.makeRecordBinding(PreviewControlsBlock, {
  field: 'docTabs',
})
const initDocTabs = sections
  .map(({ id }) => id)
  .map((key) =>
    BreadcrumbExampleBlock.makeStep((model) =>
      initAndInsert(DocTabs, model, {
        key,
        args: [
          {
            id: previewCodeTabId('breadcrumb', key),
            idPrefix: previewCodeTabId('breadcrumb', key),
            selectedIndex: 0,
          },
        ],
      }),
    ),
  )
export const BreadcrumbExampleComposition = BreadcrumbExampleBlock.makeComposition({
  bindings: [DocTabs, Trails, Menus, Switches, Selects, Tooltips],
  mounts: [Observe],
})

export const init = BreadcrumbExampleComposition.makeInit(() => ({
  model: {
    ...documentationDefaults,
    docTabs: {},
    trails: {},
    menus: {},
    switches: {},
    selects: {},
    settings: initialSettings,
    isExpanded: false,
    width: 340,
    shape: Shape.make(examplePresentation.shape ?? 'sharp'),
    mode: Mode.make(exampleHoverConfig.hoverMode),
  },
  steps: [
    ...initDocTabs,
    ...sections.map(({ id }) =>
      BreadcrumbExampleBlock.makeStep((model) =>
        initAndInsert(Trails, model, {
          key: id,
          args: [
            {
              id: `breadcrumb-${id}`,
              hoverMode: exampleHoverConfig.hoverMode,
              count: id === 'overflow' || id === 'playground' ? 6 : 0,
            },
          ],
        }),
      ),
    ),
    ...menuKeys.map((id) =>
      BreadcrumbExampleBlock.makeStep((model) =>
        initAndInsert(Menus, model, {
          key: id,
          args: [
            id.endsWith('-step')
              ? { id, checkedIndex: 0, hoverMode: exampleHoverConfig.hoverMode }
              : { id, hoverMode: exampleHoverConfig.hoverMode },
          ],
        }),
      ),
    ),
    ...BooleanSetting.literals.map((key) =>
      BreadcrumbExampleBlock.makeStep((model) =>
        initAndInsert(Switches, model, {
          key,
          args: [{ id: `play-${key}`, checked: initialSettings[key] }],
        }),
      ),
    ),
    ...selectSettings.map(({ key, items }) =>
      BreadcrumbExampleBlock.makeStep((model) =>
        initAndInsert(Selects, model, {
          key,
          args: [
            {
              id: `breadcrumb-playground-${key}`,
              items,
              value: String(initialSettings[key]),
              disabled: selectDisabled(key, initialSettings),
              hoverMode: exampleHoverConfig.hoverMode,
            },
          ],
        }),
      ),
    ),
    ...sections.flatMap(({ id }) =>
      Array.from({ length: 8 }, (_, index) =>
        Tooltips.requestAdd({ key: `${id}-${index}`, options: { side: 'bottom' } }),
      ),
    ),
    ...menuKeys.flatMap((key) => [
      Tooltips.requestAdd({ key, options: { side: 'bottom' } }),
      Tooltips.requestAdd({ key: `${key}-trigger`, options: { side: 'bottom' } }),
    ]),
  ],
}))

export const update = BreadcrumbExampleComposition.makeUpdate({
  UpdatedShape: (model, { shape }) => ({ model: modifyFields(model, { shape: () => shape }) }),
  UpdatedMode: BreadcrumbExampleBlock.makeStep((model, { mode }: ModeChanged) =>
    Update.combineSteps([
      BreadcrumbExampleBlock.makeFieldsStep(() => ({ mode: () => mode })),
      ...Object.entries(model.trails).flatMap(([key, child]) =>
        breadcrumbHoverModeOf(child) === mode ? [] : [Trails.requestHoverMode(key, { mode: mode })],
      ),
      ...Object.entries(model.menus).flatMap(([key, child]) =>
        dropdownHoverModeOf(child) === mode ? [] : [Menus.requestHoverMode(key, { mode: mode })],
      ),
      ...Object.entries(model.selects).flatMap(([key, child]) =>
        selectHoverModeOf(child) === mode ? [] : [Selects.requestHoverMode(key, { mode: mode })],
      ),
      ...Object.entries(model.docTabs).flatMap(([key, child]) =>
        controlsHoverModeOf(child) === mode ? [] : [DocTabs.requestHoverMode(key, { mode: mode })],
      ),
    ]),
  ),
  UpdatedSettings: BreadcrumbExampleBlock.makeStep((model, { settings }: SettingsChanged) =>
    settings.separator === model.settings.separator
      ? updateSettings(settings)
      : BreadcrumbExampleBlock.makeFieldsStep(() => ({ settings: () => settings })),
  ),
  ClickedExpanded: (model, { expanded }) => ({
    model: modifyFields(model, { isExpanded: () => expanded }),
  }),
  ClickedPlaygroundExpanded: BreadcrumbExampleBlock.makeStep.fromMessage(({ expanded }) =>
    Trails.requestExpanded('playground', { expanded }),
  ),
  Resized: (model, { width }) => ({ model: modifyFields(model, { width: () => width }) }),
  ClickedShuffle: BreadcrumbExampleBlock.makeCommandsStep(() => [Shuffle()]),
  CompletedShuffle: BreadcrumbExampleBlock.makeStep.fromMessage(({ settings }) =>
    updateSettings(settings),
  ),
})

export const effectsLayer = Layer.merge(Observe.layer, Shuffle.layer)

export const dependencies = Layer.mergeAll(
  BreadcrumbLayer,
  menuLayer,
  TooltipLayer,
  SwitchLayer,
  SelectLayer,
  PreviewControlsLayer,
)

export const rootAttributes = () => Observe()

export const inMessageUpdate = BreadcrumbExampleComposition.makeInMessageUpdate({
  InformedOfDocumentation: BreadcrumbExampleBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          controlsHoverModeOf(child) === hoverMode
            ? []
            : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
        ),
        BreadcrumbExampleBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),
        BreadcrumbExampleBlock.makeFieldsStep(() => ({
          shape: () => shape,
          mode: () => hoverMode,
        })),
        ...Object.entries(model.trails).flatMap(([key, child]) =>
          breadcrumbHoverModeOf(child) === hoverMode
            ? []
            : [Trails.requestHoverMode(key, { mode: hoverMode })],
        ),
        ...Object.entries(model.menus).flatMap(([key, child]) =>
          dropdownHoverModeOf(child) === hoverMode
            ? []
            : [Menus.requestHoverMode(key, { mode: hoverMode })],
        ),
        ...Object.entries(model.selects).flatMap(([key, child]) =>
          selectHoverModeOf(child) === hoverMode
            ? []
            : [Selects.requestHoverMode(key, { mode: hoverMode })],
        ),
      ]),
  ),
})

type Model = typeof Model.Type
type Resized = typeof Message.Resized.Type
type ModeChanged = typeof Message.UpdatedMode.Type
type SettingsChanged = typeof Message.UpdatedSettings.Type
