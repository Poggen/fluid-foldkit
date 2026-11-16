import { modifyFields } from 'foldkit/struct'
import {
  DocumentationTabs,
  documentationTabsFor,
  documentationTabsHover,
  initDocumentationTabs,
} from './thinking-example-documentation.js'
import { layer as PreviewControlsLayer } from '../../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import { documentationDefaults } from './documentation.js'
import { docSection } from './doc-section.js'
import source from './thinking-example-block.ts?raw'
import thinkingImage from './assets/thinking-og.png'
import type { Html } from 'foldkit/html'
import type { ThinkingStepViewInputs } from '@foldkit-visuals/fluid/thinking-step'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  ThinkingStepSources,
  ThinkingStepSource,
  ThinkingStepImage,
} from '@foldkit-visuals/fluid/thinking-step/parts'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Layer, Match } from 'effect'
import { Update } from 'foldkit'
import { ThinkingStepsLayer, ThinkingStepDetailsLayer } from '@foldkit-visuals/fluid/thinking-steps'
import { layer as stepLayer } from '@foldkit-visuals/fluid/thinking-step'
import {
  ThinkingDemoBlock,
  Message,
  ReadPlaybackTime,
  WaitBeforeThinkingStep,
  WaitBeforeThinkingCharacters,
  ObserveThinkingVisibility,
  getDemo,
  occurrence,
} from './thinking-example-playback.js'
import type { Model } from './thinking-example-playback.js'

import { Roots, Rows, Details, statusAt, initChildren } from './thinking-example-children.js'
import { handleCompletedReadPlaybackTime } from './thinking-example-clock.js'
export { Roots, Rows, Details, statusAt } from './thinking-example-children.js'

export const ThinkingDemoComposition = ThinkingDemoBlock.makeComposition({
  bindings: [DocumentationTabs, Roots, Rows, Details],
  mounts: [ObserveThinkingVisibility],
})

export const init = ThinkingDemoComposition.makeInit((id: string) => ({
  model: {
    ...documentationDefaults,
    documentationTabs: {},
    id,
    generation: 0,
    fired: 0,
    epoch: 0,
    playback: 'paused',
    isManuallyPaused: false,
    elapsed: 0,
    started: 0,
    characters: 0,
    roots: {},
    rows: {},
    details: {},
  },
  steps: [initDocumentationTabs, initChildren],
}))

export const update = ThinkingDemoComposition.makeUpdate({
  Interrupted: ThinkingDemoBlock.makeNoopStep(),
  ClickedToggle: ThinkingDemoBlock.makeStep((model) =>
    ThinkingDemoBlock.makeCommandsStep(() => [
      ReadPlaybackTime({ action: 'toggle', generation: model.generation }),
    ]),
  ),
  UpdatedVisibility: ThinkingDemoBlock.makeStep((model, { ratio }) => {
    if (getDemo(model.id).delays.length === 0 || (ratio >= 0.1 && ratio < 0.5)) {
      return ThinkingDemoBlock.makeNoopStep()
    }

    return ThinkingDemoBlock.makeCommandsStep(() => [
      ReadPlaybackTime({ action: ratio >= 0.5 ? 'enter' : 'leave', generation: model.generation }),
    ])
  }),
  CompletedReadPlaybackTime: handleCompletedReadPlaybackTime,
  CompletedWaitBeforeThinkingStep: ThinkingDemoBlock.makeStep(
    (model, { generation, epoch, now }) => {
      if (
        generation !== model.generation ||
        epoch !== model.epoch ||
        model.playback !== 'playing'
      ) {
        return ThinkingDemoBlock.makeNoopStep()
      }

      const demo = getDemo(model.id)

      const fired = model.fired + 1
      const elapsed = demo.delays[model.fired] ?? model.elapsed
      const finished = fired >= demo.delays.length

      const next: Model = modifyFields(model, {
        fired: () => fired,
        elapsed: () => elapsed,
        started: () => now,
        characters: () => 0,
        playback: () => (finished ? 'finished' : 'playing'),
      })

      const active = demo.rows[fired - 1]

      return Update.combineSteps([
        ThinkingDemoBlock.makeStep(() => ({
          model: next,
          commands: [
            WaitBeforeThinkingCharacters.Interrupt({ generation }, () => Message.Interrupted()),
            ...(finished
              ? []
              : [
                  WaitBeforeThinkingStep({
                    generation,
                    epoch,
                    delay: (demo.delays[fired] ?? elapsed) - elapsed,
                  }),
                ]),
            ...(!finished && active?.streamText !== undefined
              ? [WaitBeforeThinkingCharacters({ generation, index: fired - 1 })]
              : []),
          ],
        })),
        ...demo.rows.map((_row, index) =>
          Rows.requestConfigure(`${occurrence(model)}-${index}`, { status: statusAt(next, index) }),
        ),
      ])
    },
  ),
  CompletedWaitBeforeThinkingCharacters: ThinkingDemoBlock.makeStep(
    (model, { generation, index }) => {
      if (
        generation !== model.generation ||
        index !== model.fired - 1 ||
        model.playback === 'finished'
      ) {
        return ThinkingDemoBlock.makeNoopStep()
      }

      const text = getDemo(model.id).rows[index]?.streamText

      if (text === undefined) {
        return ThinkingDemoBlock.makeNoopStep()
      }

      const characters = Math.min(text.length, model.characters + 3)

      return ThinkingDemoBlock.makeStep(() => ({
        model: modifyFields(model, { characters: () => characters }),
        commands:
          characters < text.length ? [WaitBeforeThinkingCharacters({ generation, index })] : [],
      }))
    },
  ),
})

export const dependencies = Layer.mergeAll(
  ThinkingStepsLayer,
  ThinkingStepDetailsLayer,
  stepLayer,
  PreviewControlsLayer,
)

export const effectsLayer = Layer.mergeAll(
  ReadPlaybackTime.layer,
  WaitBeforeThinkingStep.layer,
  WaitBeforeThinkingCharacters.layer,
  ObserveThinkingVisibility.layer,
)

export const targetMotion = createTargetMotionScope('thinking-example')

export const motion = createMotionScope('thinking-example-parts')

export const inMessageUpdate = ThinkingDemoComposition.makeInMessageUpdate({
  InformedOfDocumentation: ThinkingDemoBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        documentationTabsHover(hoverMode),
        ThinkingDemoBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),
      ]),
  ),
})

export const view = ThinkingDemoComposition.makeView((model, h) => {
  const context = createPresentationContext({
    shape: model.docShape,
    size: model.docSize,
    hoverMode: model.docHover,
    icons: defaultIcons,
    reducedMotion: 'user',
  })
  const demo = getDemo(model.id)
  const key = occurrence(model)
  const root = model.roots[key]

  if (root === undefined) {
    throw new Error(`Missing Thinking root: ${key}`)
  }

  const children = demo.rows.map((row, index) => {
    const rowKey = `${key}-${index}`
    const step = model.rows[rowKey]

    if (step === undefined) {
      throw new Error(`Missing Thinking step: ${rowKey}`)
    }

    const extras: Array<Html> = []
    const completed = statusAt(model, index) === 'complete'

    if (row.details !== undefined && completed) {
      const details = model.details[rowKey]

      if (details === undefined) {
        throw new Error(`Missing Thinking details: ${rowKey}`)
      }

      extras.push(
        h.block(
          Details.embedView({
            key: rowKey,
            slotId: `${rowKey}-details`,
            model: details,
            viewInputs: {
              context,
              animate: targetMotion.node,
              label: () => row.summary ?? '',
              details: row.details,
              content: () => [],
            },
          }),
        ),
      )
    }

    if (row.sources !== undefined && completed) {
      extras.push(
        ThinkingStepSources(
          {
            children: row.sources.map((source, sourceIndex) =>
              ThinkingStepSource(
                {
                  context,
                  children: [source],
                  delay: (sourceIndex + 1) * 0.05,
                  animate: motion.node,
                },
                h,
              ),
            ),
          },
          h,
        ),
      )
    }

    if (row.image !== undefined && completed) {
      extras.push(
        ThinkingStepImage(
          {
            context,
            src: thinkingImage,
            caption: row.image,
            animate: motion.node,
          },
          h,
        ),
      )
    }

    if (row.streamText !== undefined) {
      const displayed = completed ? row.streamText : row.streamText.slice(0, model.characters)

      if (displayed !== '') {
        extras.push(h.span([h.Class('text-body text-muted-foreground leading-4.5')], [displayed]))
      }
    }

    const base: ThinkingStepViewInputs = {
      context,
      animate: targetMotion.node,
      label: row.label,
      icon: row.icon,
      isLast:
        index === demo.rows.length - 1 || (demo.delays.length > 0 && model.fired <= index + 1),
      children: () => extras,
    }

    const described =
      row.description === undefined ? base : { ...base, description: row.description }

    const viewInputs =
      row.showIcon === undefined ? described : { ...described, showIcon: row.showIcon }

    return h.block(Rows.embedView({ key: rowKey, slotId: rowKey, model: step, viewInputs }))
  })

  const body = h.block(
    Roots.embedView({
      key,
      slotId: key,
      model: root,
      viewInputs: {
        context,
        animate: targetMotion.node,
        label: () => demo.header,
        className: demo.id === 'text' ? 'w-full px-8' : '',
        content: () => children,
      },
    }),
  )

  const playbackLabel = Match.value(model.playback).pipe(
    Match.when('playing', () => 'Pause'),
    Match.when('paused', () => 'Play'),
    Match.when('finished', () => 'Replay'),
    Match.exhaustive,
  )

  const playbackIcon = Match.value(model.playback).pipe(
    Match.when('playing', () => defaultIcons.pause),
    Match.when('paused', () => defaultIcons.play),
    Match.when('finished', () => defaultIcons['rotate-ccw']),
    Match.exhaustive,
  )
  return h.div(
    [
      h.Id(`thinking-${demo.id}`),
      ...(demo.delays.length === 0 ? [] : [h.OnMount(ObserveThinkingVisibility())]),
    ],
    [
      docSection(h, {
        title: demo.title,
        children: [body],
        source,
        presentation: { context },
        pane: model.documentationTabs[demo.id]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabsId: previewCodeTabId('thinking-steps', demo.id),
        tabs: h.block(
          DocumentationTabs.embedView({
            key: demo.id,
            slotId: previewCodeTabId('thinking-steps', demo.id),
            model: documentationTabsFor(model.documentationTabs, demo.id),
            viewInputs: previewCodeTabsViewInputs(h, {
              context,
              animate: targetMotion.node,
              ariaLabel: `${demo.id} example view`,
            }),
          }),
        ),
        className: 'relative w-full',
        actions:
          demo.delays.length === 0
            ? []
            : [
                Button(
                  {
                    context,
                    variant: 'ghost',
                    buttonSize: 'icon',
                    children: [playbackIcon({ size: 16, strokeWidth: 1.5 }, h)],
                    attributes: [
                      h.OnClick(Message.ClickedToggle()),
                      h.AriaLabel(`${playbackLabel} ${demo.title}`),
                      h.Title(playbackLabel),
                    ],
                  },
                  h,
                ),
              ],
      }),
    ],
  )
})

export const layer = ThinkingDemoBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: effectsLayer,
}).pipe(Layer.provide(dependencies))
