import { editedConfigurationFields } from '../playground/configuration-acceptance'
import { requestPreview } from './preview-request'
import { controlsForConfiguration } from '../playground/configuration'
import type { ComponentPresentation } from '../settings'
import { hoverModeOf as tabsHoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { modifyFields } from 'foldkit/struct'
import { Boolean, Effect, Layer, Number, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { layer as AuthoredLayer } from './authored'
import { pageAt } from '../../../lib/catalogue'
import { controlsFor, initialConfiguration, controlValue } from '../playground/page'
import {
  PlaygroundConfiguration,
  decodeConfiguration,
  configurationForPage,
} from '../playground/configuration'
import { layer as ControlLayer, controlConfig } from './control'
import { layer as HoverLayer } from '@foldkit-visuals/fluid/hover'
import { layer as HoverHighlightLayer } from '@foldkit-visuals/fluid/hover-highlight'
import { layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import { layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { layer as InspectorLayer } from '../../../components/docs/inspector'
import { layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { ComponentReferenceBlock } from './block'
import { Shuffle, ShuffleShortcut, SynchronizeConfigurationUrl } from './commands'
import {
  ComponentReferenceComposition as Composition,
  Controls,
  ControlsHover,
  ControlsHighlight,
  Authored,
  PlaygroundTabs,
  ApiScrolls,
  ShuffleTooltip,
  apiScrollKey,
  changeProp,
  view,
} from './view'
const configurationEqual = Schema.toEquivalence(PlaygroundConfiguration)
const initial = (path: string) => {
  const page = pageAt(path)
  const configuration = page === undefined ? { _tag: 'none' as const } : initialConfiguration(page)
  return {
    path,
    configuration,
    revision: 0,
    sourceFile: '',
    isSourceOpen: false,
    apiScrolls: [],
  }
}
const reconcileChrome = (presentation: ComponentPresentation) =>
  ComponentReferenceBlock.makeStep((model) =>
    Update.combineSteps([
      ...(tabsHoverModeOf(model.previewTabs) === presentation.hover
        ? []
        : [PlaygroundTabs.requestHoverMode({ mode: presentation.hover })]),
      ...(model.controlsHover.mode === presentation.hover
        ? []
        : [
            ControlsHover.requestConfigure({
              options: {
                mode: presentation.hover,
                axis: 'y',
                nearest: false,
                gapClick: true,
                maxDistance: Infinity,
              },
            }),
            ComponentReferenceBlock.makeStep((current) =>
              ControlsHighlight.informOfSource({
                snapshot: current.controlsHover,
                hidden: false,
                mode: presentation.hover,
              }),
            ),
          ]),
    ]),
  )
const synchronizeControls = ComponentReferenceBlock.makeStep((model) => {
  const page = pageAt(model.path)
  const descriptors =
    model.configuration._tag === 'chart' && page !== undefined
      ? controlsFor(page)
      : controlsForConfiguration(model.configuration)
  return Update.combineSteps(
    model.controls.flatMap((control) => {
      const descriptor = descriptors.find((item) => item.prop === control.model.prop)
      if (descriptor === undefined) return []
      const value = controlValue(model.configuration, control.model.prop, control.model.value)
      const disabled = descriptor.enabled === false
      return [
        ...(descriptor.kind === 'number' &&
        (control.model.min !== descriptor.min ||
          control.model.max !== descriptor.max ||
          control.model.step !== descriptor.step)
          ? [
              Controls.informOfBounds(control.key, {
                min: descriptor.min,
                max: descriptor.max,
                step: descriptor.step,
              }),
            ]
          : []),
        ...(control.model.value === value ? [] : [Controls.informOfValue(control.key, { value })]),
        ...(control.model.disabled === disabled
          ? []
          : [Controls.informOfAvailability(control.key, { disabled })]),
      ]
    }),
  )
})
const reconcilePresentation = (presentation: ComponentPresentation) =>
  ComponentReferenceBlock.makeStep((model) => {
    const steps = Update.combineSteps([
      reconcileChrome(presentation),

      Authored.informOfPresentation({ presentation }),
    ])
    return (connected: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(connected),
        requestPreview(model.path, {
          configuration: model.configuration,
          presentation,
          edited: [],
          intent: 'reconcile',
        }),
      )
  })
const implementation = {
  init: Composition.makeInit((path, flags, presentation) => {
    const page = pageAt(path)
    const embedded =
      flags.preview?.configuration === undefined
        ? Option.none()
        : decodeConfiguration(flags.preview.configuration)
    const configuration =
      page === undefined
        ? initial(path).configuration
        : Option.isSome(embedded) &&
            (embedded.value._tag === 'chart' ? embedded.value.slug : embedded.value._tag) ===
              page.slug
          ? embedded.value
          : configurationForPage(page, flags.preview)
    return {
      childInitContext: {
        path,
        presentation,
      },
      model: { ...initial(path), configuration },
      steps: [
        ShuffleTooltip.requestAdd({ key: 'docs-playground-shuffle', options: {} }),
        reconcileChrome(presentation),
        Authored.informOfPresentation({ presentation }),
        synchronizeControls,
      ],
    }
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfApiContracts: ComponentReferenceBlock.makeStep((_model, { indexes }) =>
      Update.combineSteps([
        ComponentReferenceBlock.makeFieldsStep(() => ({ apiScrolls: () => [] })),
        ...indexes.map((index) =>
          ComponentReferenceBlock.makeStep((parent) =>
            ApiScrolls.init({
              key: apiScrollKey(parent.path, index),
              args: [
                {
                  id: `docs-api-${parent.path.replaceAll('/', '-')}-${index}`,
                  orientation: 'horizontal',
                },
              ],
              toParentModel: (child) =>
                modifyFields(parent, {
                  apiScrolls: () => [
                    ...parent.apiScrolls,
                    { key: apiScrollKey(parent.path, index), model: child },
                  ],
                }),
            }),
          ),
        ),
      ]),
    ),
    InformedOfAcceptedConfiguration: ComponentReferenceBlock.makeStep(
      (model, { path, configuration }) =>
        path !== model.path || model.configuration === configuration
          ? { model }
          : Update.combineSteps([
              ComponentReferenceBlock.makeFieldsStep(() => ({
                configuration: () => configuration,
                revision: Number.increment,
              })),
              synchronizeControls,
              ComponentReferenceBlock.makeCommandsStep(() => [
                SynchronizeConfigurationUrl({ path, configuration }),
              ]),
            ]),
    ),
    InformedOfPresentation: ComponentReferenceBlock.makeStep.fromMessage(({ presentation }) =>
      reconcilePresentation(presentation),
    ),
    InformedOfLocation: ComponentReferenceBlock.makeStep((model, { options, presentation }) => {
      const page = pageAt(model.path)
      if (page === undefined) return { model }
      const embedded =
        options.configuration === undefined
          ? Option.none()
          : decodeConfiguration(options.configuration)
      const configuration =
        Option.isSome(embedded) &&
        (embedded.value._tag === 'chart' ? embedded.value.slug : embedded.value._tag) === page.slug
          ? embedded.value
          : configurationForPage(page, options)
      if (configurationEqual(model.configuration, configuration)) return { model }
      const steps = Update.combineSteps([
        ComponentReferenceBlock.makeFieldsStep(() => ({
          configuration: () => configuration,
          revision: Number.increment,
        })),

        synchronizeControls,
      ])
      return (connected: Parameters<typeof steps>[0]) =>
        Update.withOutMessage(
          steps(connected),
          requestPreview(model.path, {
            configuration,
            presentation,
            edited: editedConfigurationFields(model.configuration, configuration),
            intent: 'reconcile',
          }),
        )
    }),
    InformedOfPage: ComponentReferenceBlock.makeStep((model, { path, presentation }) => {
      if (model.path === path) return { model }
      const page = pageAt(path)
      const steps = Update.combineSteps([
        ComponentReferenceBlock.makeStep((current) => ({
          model: modifyFields(current, {
            path: () => path,
            configuration: () => initial(path).configuration,
            revision: Number.increment,
            sourceFile: () => '',
            isSourceOpen: () => false,
            apiScrolls: () => [],
            controls: () => [],
          }),
        })),
        reconcileChrome(presentation),
        ControlsHover.requestClear(),
        ControlsHighlight.requestHide(),
        PlaygroundTabs.requestSelected({ selectedIndex: 0 }),

        Authored.informOfPage({ slug: page?.slug ?? '', presentation }),
        ...(page === undefined
          ? []
          : controlsFor(page).map((control) =>
              ComponentReferenceBlock.makeStep((parent) =>
                Controls.init({
                  key: `${path}:${control.prop}`,
                  args: [controlConfig(control)],
                  toParentModel: (child) =>
                    modifyFields(parent, {
                      controls: () => [
                        ...parent.controls,
                        { key: `${path}:${control.prop}`, model: child },
                      ],
                    }),
                }),
              ),
            )),
        synchronizeControls,
      ])
      return (connected: Parameters<typeof steps>[0]) =>
        Update.withOutMessage(
          steps(connected),
          requestPreview(path, { configuration: initial(path).configuration, presentation }),
        )
    }),
  }),
  update: Composition.makeUpdate.compose(
    Composition.makeUpdate({
      UpdatedProp: ComponentReferenceBlock.makeStep.fromMessage(({ prop, value }) =>
        changeProp(prop, value),
      ),
      PickedFile: ComponentReferenceBlock.makeFieldsStep.fromMessage(({ path }) => ({
        sourceFile: () => path,
      })),
      ToggledSource: ComponentReferenceBlock.makeFieldsStep(() => ({
        isSourceOpen: Boolean.not,
      })),
      RequestedShuffle: ComponentReferenceBlock.makeStep((model) => ({
        model: modifyFields(model, { revision: Number.increment }),
        commands: [Shuffle({ path: model.path, revision: model.revision + 1 })],
      })),
      CompletedShuffle: ComponentReferenceBlock.makeStep(
        (model, { path, revision, configuration }) => {
          if (path !== model.path || revision !== model.revision) return { model }
          const steps = Update.combineSteps([
            ComponentReferenceBlock.makeFieldsStep(() => ({ configuration: () => configuration })),
            ...model.controls.map((control) =>
              Controls.informOfValue(control.key, {
                value: controlValue(configuration, control.model.prop, control.model.value),
              }),
            ),
          ])
          return (connected: Parameters<typeof steps>[0]) =>
            Update.withOutMessage(
              steps(connected),
              requestPreview(path, {
                configuration,
                edited: editedConfigurationFields(model.configuration, configuration),
                intent: 'edit',
              }),
            )
        },
      ),
      RequestedReset: ComponentReferenceBlock.makeStep((model) => {
        const page = pageAt(model.path)
        const configuration =
          page === undefined ? { _tag: 'none' as const } : initialConfiguration(page)
        const steps = Update.combineSteps([
          ComponentReferenceBlock.makeFieldsStep(() => ({
            configuration: () => configuration,
            revision: Number.increment,
          })),
          ...model.controls.map((control) =>
            Controls.informOfValue(control.key, {
              value: controlValue(configuration, control.model.prop, control.model.value),
            }),
          ),
        ])
        return (connected: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(
            steps(connected),
            requestPreview(model.path, { configuration, intent: 'reset' }),
          )
      }),
      CompletedSynchronizeConfigurationUrl: ComponentReferenceBlock.makeNoopStep(),
      RequestedRetry: ComponentReferenceBlock.makeOutMessageStep((model) =>
        ComponentReferenceBlock.OutMessage.RequestedReload({ path: model.path }),
      ),
    }),
    Composition.makeUpdate.each((_model, message, { before }) =>
      ComponentReferenceBlock.makeStep((model) => {
        if (model.configuration === before.configuration && message._tag !== 'RequestedReset')
          return { model }
        return Update.combineSteps([
          synchronizeControls,
          ComponentReferenceBlock.makeCommandsStep(() => [
            SynchronizeConfigurationUrl({ path: model.path, configuration: model.configuration }),
          ]),
        ])
      }),
    ),
  ),
  EffectsLayer: Layer.mergeAll(
    Shuffle.layer,
    ShuffleShortcut.layer,
    SynchronizeConfigurationUrl.layer,
  ),
}
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()
  return { ...implementation, children, view: yield* view }
})
export const layer = ComponentReferenceBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      ControlLayer,
      AuthoredLayer,
      TabsLayer,
      HoverLayer,
      HoverHighlightLayer,
      ScrollAreaLayer,
      TooltipLayer,
      InspectorLayer,
    ),
  ),
)
