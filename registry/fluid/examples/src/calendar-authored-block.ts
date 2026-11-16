import { hoverModeOf as calendarHoverModeOf } from '@foldkit-visuals/fluid/calendar'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'

import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import { CalendarAuthoredBlock, Selection, Shuffle } from './calendar-authored-definition.js'
import { documentationDefaults } from './documentation.js'
import { docSection } from './doc-section.js'
import source from './calendar-authored-block.ts?raw'
import { DateTime, Effect, Layer } from 'effect'
import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import {
  CalendarBlock,
  calendarTooltipKeys,
  calendarViewInputs,
  layer as CalendarLayer,
} from '@foldkit-visuals/fluid/calendar'
import type { CalendarViewInputs } from '@foldkit-visuals/fluid/calendar'

import {
  makeCalendarEnvironment,
  prepareCalendar,
} from '@foldkit-visuals/fluid/calendar/environment'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'

import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'

import { SwitchBlock, SwitchLayer, createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  Settings,
  defaults,
  controls,
  valueFor,
  demoRate,
  revisionFor,
  occurrenceOptions,
  authoredRules,
  cellSizeFor,
  examples,
} from './calendar-authored-data.js'

const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
export const calendarEnvironmentLayer = Layer.unwrap(
  Effect.gen(function* constructCalendarEnvironment() {
    const now = yield* DateTime.nowInCurrentZone.pipe(DateTime.withCurrentZoneLocal)
    const today = DateTime.toDateUtc(now)
    const booked = [4, 5, 6, 12, 19, 20].map((days) =>
      DateTime.toDateUtc(DateTime.add(DateTime.startOf(now, 'day'), { days })),
    )

    const environment = makeCalendarEnvironment((id, revision) =>
      authoredRules({ id, revision, booked, today }),
    )

    return environment
  }),
)
export const layer = Layer.unwrap(
  Effect.gen(function* constructCalendarExamples() {
    const now = yield* DateTime.nowInCurrentZone.pipe(DateTime.withCurrentZoneLocal)
    const today = DateTime.toDateUtc(now)

    const environment = calendarEnvironmentLayer

    const prepared = yield* Effect.all(
      [...examples.map((example) => example.key), 'playground'].map((key) =>
        prepareCalendar(occurrenceOptions(key, today)).pipe(
          Effect.map((config) => ({ key, config })),
        ),
      ),
    ).pipe(Effect.provide(environment))

    const initialSingle = prepared.find((entry) => entry.key === 'single')?.config.initial.selection
      .selected

    if (initialSingle === undefined) {
      throw new Error('Missing authored single selection')
    }

    const Calendars = CalendarAuthoredBlock.makeRecordBinding(CalendarBlock, {
      field: 'calendars',
    }).withOutMessagePolicy({
      fold: (key) =>
        CalendarAuthoredBlock.makeOutMessageFold(CalendarBlock, {
          Transitioned: ({ events }) =>
            CalendarAuthoredBlock.makeStep((model) => {
              const child = model.calendars[key]

              if (child === undefined) {
                return CalendarAuthoredBlock.makeNoopStep()
              }

              const picked = events.findLast((event) => 'value' in event)

              if (picked === undefined) {
                return CalendarAuthoredBlock.makeNoopStep()
              }

              return Update.combineSteps([
                ...(key === 'playground'
                  ? [
                      CalendarAuthoredBlock.makeFieldsStep(() =>
                        model.settings.mode === 'single'
                          ? { singleDate: () => picked.value }
                          : { range: () => picked.value },
                      ),
                    ]
                  : []),
                Calendars.requestAcceptance(key, {
                  selection: { ...child.calendar.selection, selected: picked.value },
                  month: child.calendar.month,
                  controlledMonth: false,
                }),
              ])
            }),
        }),
    })

    const BaseSelects = CalendarAuthoredBlock.makeRecordBinding(SelectBlock, { field: 'selects' })

    const BaseWeek = CalendarAuthoredBlock.makeRequiredFieldBinding(SwitchBlock, {
      field: 'weekSwitch',
      init: { contextToArgs: () => [{ id: 'calendar-week-numbers', checked: false }] },
    })

    const configure = (settings: Settings) =>
      CalendarAuthoredBlock.makeStep((model) => {
        const child = model.calendars.playground

        if (child === undefined) {
          return CalendarAuthoredBlock.makeNoopStep()
        }

        return Update.combineSteps([
          CalendarAuthoredBlock.makeFieldsStep(() => ({ settings: () => settings })),
          ...controls.map((control) =>
            BaseSelects.requestConfigure(control.key, {
              items: control.items,
              value: valueFor(settings, control.key),
            }),
          ),
          BaseWeek.requestConfigure({ checked: settings.weekNumbers, disabled: false }),
          Calendars.requestRefresh('playground', {
            revision: revisionFor(settings.days),
          }),
          Calendars.requestSynchronization('playground', {
            selection: {
              ...child.calendar.selection,
              mode: settings.mode,
              selected: settings.mode === 'single' ? model.singleDate : model.range,
            },
            month: child.calendar.month,
            controlledMonth: false,
            presentation: {
              hoverMode: calendarHoverModeOf(child),
              numberOfMonths: settings.months,
              orientation: settings.orientation,
              showWeekNumber: settings.weekNumbers,
            },
            occurrenceFocus: false,
          }),
        ])
      })

    const Selects = BaseSelects.withOutMessagePolicy({
      fold: (key) =>
        CalendarAuthoredBlock.makeOutMessageFold(SelectBlock, {
          Selected: ({ value }) =>
            CalendarAuthoredBlock.makeStep((model) => {
              const next = { ...model.settings }

              if (key === 'mode' && (value === 'single' || value === 'range')) {
                next.mode = value
              }

              if (key === 'months' && (value === '1' || value === '2')) {
                next.months = value === '1' ? 1 : 2
              }

              if (
                key === 'orientation' &&
                (value === 'auto' || value === 'horizontal' || value === 'vertical')
              ) {
                next.orientation = value
              }

              if (
                key === 'days' &&
                (value === 'all' || value === 'booked' || value === 'weekdays')
              ) {
                next.days = value
              }

              if (key === 'cellSize') {
                next.cellSize = cellSizeFor(value)
              }

              return configure(next)
            }),
          OpenChanged: () => CalendarAuthoredBlock.makeNoopStep(),
        }),
    })

    const Week = BaseWeek.withOutMessagePolicy({
      fold: CalendarAuthoredBlock.makeOutMessageFold(SwitchBlock, {
        Toggled: () =>
          CalendarAuthoredBlock.makeStep((model) =>
            configure({ ...model.settings, weekNumbers: !model.settings.weekNumbers }),
          ),
      }),
    })

    const Tooltips = CalendarAuthoredBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
      field: 'tooltips',
      init: { contextToArgs: () => [] },
    }).withOutMessagePolicy({
      fold: CalendarAuthoredBlock.makeOutMessageFold(DocumentTooltipBlock, {
        Transaction: () => CalendarAuthoredBlock.makeNoopStep(),
      }),
    })

    const DocumentationTabs = CalendarAuthoredBlock.makeRecordBinding(PreviewControlsBlock, {
      field: 'documentationTabs',
    })
    const documentationTabsHover = (mode: 'fluid' | 'standard') =>
      CalendarAuthoredBlock.makeStep((model) =>
        Update.combineSteps(
          Object.entries(model.documentationTabs).flatMap(([section, child]) =>
            controlsHoverModeOf(child) === mode
              ? []
              : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
          ),
        ),
      )
    const initDocumentationTabs = CalendarAuthoredBlock.makeStep(() =>
      Update.combineSteps(
        examples
          .map((example) => example.key)
          .map((section) =>
            CalendarAuthoredBlock.makeStep((model) =>
              initAndInsert(DocumentationTabs, model, {
                key: section,
                args: [
                  {
                    id: previewCodeTabId('calendar', section),
                    idPrefix: previewCodeTabId('calendar', section),
                    selectedIndex: 0,
                  },
                ],
              }),
            ),
          ),
      ),
    )
    const CalendarAuthoredComposition = CalendarAuthoredBlock.makeComposition({
      bindings: [DocumentationTabs, Calendars, Selects, Week, Tooltips],
    })

    const init = CalendarAuthoredComposition.makeInit(() => ({
      model: {
        ...documentationDefaults,
        documentationTabs: {},
        calendars: {},
        selects: {},
        settings: defaults,
        singleDate: initialSingle,
        range: Selection.cases.Empty.make({}),
      },
      steps: [
        initDocumentationTabs,
        ...prepared.map(({ key, config }) =>
          CalendarAuthoredBlock.makeStep((model) =>
            initAndInsert(Calendars, model, { key, args: [config] }),
          ),
        ),
        ...controls.map((control) =>
          CalendarAuthoredBlock.makeStep((model) =>
            initAndInsert(Selects, model, {
              key: control.key,
              args: [
                {
                  id: `calendar-${control.key}`,
                  items: control.items,
                  value: valueFor(defaults, control.key),
                },
              ],
            }),
          ),
        ),
        ...prepared.flatMap(({ key }) =>
          calendarTooltipKeys(key).map((tooltipKey) => Tooltips.requestAdd({ key: tooltipKey })),
        ),
      ],
    }))

    const update = CalendarAuthoredComposition.makeUpdate({
      ClickedShuffle: CalendarAuthoredBlock.makeCommandsStep(() => [Shuffle()]),
      Configured: CalendarAuthoredBlock.makeStep.fromMessage(({ settings }) => configure(settings)),
    })

    const motion = createTargetMotionScope('calendar-authored')
    const controlsMotion = createMotionScope('calendar-authored-controls')
    const switchMotion = createSwitchMotionScope('calendar-authored-switch')

    const view = CalendarAuthoredComposition.makeView((model, h) => {
      const appearance = { shape: model.docShape, size: model.docSize, hoverMode: model.docHover }
      const context = createPresentationContext({ ...appearance, reducedMotion: 'user' })
      const triggers = new Map<string, Parameters<CalendarViewInputs['tooltip']>[0]['render']>()

      return h.block(
        Tooltips.embedView({
          slotId: 'calendar-tooltips',
          model: model.tooltips,
          viewInputs: {
            renderTrigger: (key, { button }) => {
              const render = triggers.get(key)

              if (render === undefined) {
                throw new Error(`Missing Calendar tooltip ${key}`)
              }

              return render({ button })
            },
            render: ({ tooltip }) => {
              const calendar = (key: string) => {
                const child = model.calendars[key]

                if (child === undefined) {
                  throw new Error(`Missing Calendar ${key}`)
                }

                let cellSize: number | undefined

                if (key === 'big') {
                  cellSize = 56
                } else if (key === 'playground' && model.settings.cellSize !== null) {
                  ;({ cellSize } = model.settings)
                }

                const calendarOptions: Parameters<typeof calendarViewInputs>[1] = {
                  key,
                  context,
                  motion,
                  keyboardTrigger: false,
                  tooltip,
                  registerTrigger: (name, render) => {
                    triggers.set(name, render)
                  },
                }

                let viewInputs: CalendarViewInputs = calendarViewInputs(
                  h,
                  cellSize === undefined ? calendarOptions : { ...calendarOptions, cellSize },
                )

                if (key === 'big') {
                  viewInputs = {
                    ...viewInputs,
                    dayDetail: (day: Date) => {
                      const rate = demoRate(day)

                      return h.span(
                        [h.Class(rate <= 119 ? 'text-[color:var(--success)]' : '')],
                        [`$${rate}`],
                      )
                    },
                  }
                }

                return h.block(Calendars.embedView({ key, slotId: key, model: child, viewInputs }))
              }

              return h.div(
                [
                  h.Class(
                    model.isDocEmbedded
                      ? ''
                      : "max-w-220 m-[0_auto] p-[48px_24px_96px] [font-variation-settings:'wght'_400,'opsz'_14] [&_>_h1]:text-[28px] [&_>_h1]:leading-[34px] [&_>_h1]:[font-variation-settings:'wght'_700,'opsz'_25] [&_>_h1]:m-[0_0_8px] [&_>_section]:m-[40px_0] [&_h2]:text-[20px] [&_h2]:leading-[28px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[0_0_12px] [&_>_a]:text-[13px] [&_>_a]:[color:var(--muted-foreground)] [&_>_a]:underline",
                  ),
                ],
                [
                  model.isDocEmbedded ? null : h.h1([], ['Calendar']),
                  ...examples.map((example) =>
                    docSection(h, {
                      title: example.title,
                      description: example.description,
                      children: [calendar(example.key)],
                      source,
                      presentation: { context },
                      previewMinHeight: example.height,
                      pane:
                        model.documentationTabs[example.key]?.tabs.selectedIndex === 1
                          ? 'code'
                          : 'preview',
                      tabsId: previewCodeTabId('calendar', example.key),
                      tabs: h.block(
                        DocumentationTabs.embedView({
                          key: example.key,
                          slotId: previewCodeTabId('calendar', example.key),
                          model: documentationTabsFor(model.documentationTabs, example.key),
                          viewInputs: previewCodeTabsViewInputs(h, {
                            context,
                            animate: controlsMotion.node,
                            ariaLabel: `${example.key} example view`,
                          }),
                        }),
                      ),
                    }),
                  ),
                ],
              )
            },
            renderDocument: (content, popups) => h.div([], [content, ...popups]),
            ...appearance,
          },
        }),
      )
    })

    const inMessageUpdate = CalendarAuthoredComposition.makeInMessageUpdate({
      InformedOfDocumentation: CalendarAuthoredBlock.makeStep(
        (model, { embedded, shape, size, hoverMode }) =>
          Update.combineSteps([
            documentationTabsHover(hoverMode),
            CalendarAuthoredBlock.makeFieldsStep(() => ({
              isDocEmbedded: () => embedded,
              docShape: () => shape,
              docSize: () => size,
              docHover: () => hoverMode,
            })),
            ...Object.entries(model.calendars).flatMap(([key, child]) =>
              calendarHoverModeOf(child) === hoverMode
                ? []
                : [Calendars.requestHoverMode(key, { mode: hoverMode })],
            ),
          ]),
      ),
    })
    return CalendarAuthoredBlock.makeLayer({
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: Shuffle.layer,
    }).pipe(
      Layer.provide(
        Layer.mergeAll(CalendarLayer, TooltipLayer, SelectLayer, SwitchLayer, PreviewControlsLayer),
      ),
      Layer.provideMerge(environment),
      Layer.provideMerge(Layer.mergeAll(motion.layer, controlsMotion.layer, switchMotion.layer)),
    )
  }),
)
export { CalendarAuthoredBlock } from './calendar-authored-definition.js'
