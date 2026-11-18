import { MessageAssetsQuery } from './message-assets-query'
import type { AuthoredMessagesBlock as Root } from './authored-message-definition'
import { thinkingIndicatorAnimations } from '@foldkit-visuals/fluid/thinking-indicator'
import type { InputMessageViewInputs } from '@foldkit-visuals/fluid/input-message'
import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import type { DocumentTooltipOccurrenceViewInputs } from '@foldkit-visuals/fluid/tooltip'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { collapsedStackHeight, queueCardHeight } from '@foldkit-visuals/fluid/queued-stack'
import { ObserveTranscript } from './authored-message-definition'
import {
  Composition,
  Composers,
  Chats,
  Stack,
  Tooltips,
  Thinking,
  Transcript,
  DocumentationTabs,
} from './authored-message-composition'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import { sections } from './message-scenes'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion, target } from '../motion'
import { reorder } from '../gallery/fluid/interactive-bindings'
import { presentation } from '../settings'
import { documentationRuntime } from '../documentation-runtime'
export const authoredMessageView = (Message: typeof Root.Message) =>
  Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const assetError = Option.getOrUndefined(
      AsyncData.getError(MessageAssetsQuery.read(model.assetsQuery)),
    )
    const context = presentation(settings)
    const triggers = new Map<string, DocumentTooltipOccurrenceViewInputs['trigger']>()
    return h.div(
      [],
      [
        assetError !== undefined
          ? h.p([h.Role('alert')], [`Example attachments could not load: ${assetError}`])
          : null,
        h.block(
          Tooltips.embedView({
            slotId: 'docs-message-tooltips',
            model: model.tooltips,
            viewInputs: {
              renderTrigger: (key, inputs) => {
                const trigger = triggers.get(key)
                if (trigger === undefined) throw new Error(`Missing message tooltip ${key}`)
                return trigger(inputs)
              },
              renderDocument: (content, popups) => h.div([], [content, ...popups]),
              render: ({ tooltip }) => {
                const decorate = (
                  inputs: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
                  options: {
                    readonly key: string
                    readonly content: string
                    readonly side: 'top' | 'left'
                    readonly shapeClass: string
                  },
                ) => {
                  triggers.set(options.key, inputs.trigger)
                  return tooltip(options.key, {
                    content: options.content,
                    shapeClass: options.shapeClass,
                    animate: motion.node,
                    reducedMotion: 'user',
                  })
                }
                const transcript = (section: string) =>
                  model.turns
                    .filter((turn) => turn.section === section)
                    .flatMap((turn) => {
                      const child = model.chats[turn.key]
                      if (child === undefined) return []
                      const morphing = turn.queueId !== null && turn.queueId === model.morphId
                      return [
                        h.block(
                          Chats.embedView({
                            key: turn.key,
                            slotId: child.id,
                            model: child,
                            viewInputs: {
                              context,
                              animate: (node, options) =>
                                motion.node(node, {
                                  ...options,
                                  ...(turn.seeded ? { initial: false as const } : {}),
                                  ...(morphing
                                    ? {
                                        initial: false as const,
                                        layout: true,
                                        layoutId: `qm-${turn.queueId}`,
                                        layoutDependency: String(model.revision),
                                      }
                                    : {}),
                                }),
                              children: () =>
                                turn.thinking
                                  ? h.block(
                                      Thinking.embedView({
                                        slotId: 'docs-message-thinking',
                                        model: model.thinking,
                                        viewInputs: {
                                          ...thinkingIndicatorAnimations(target),
                                          showIcon: false,
                                          className: 'px-0 py-0',
                                          size: settings.size,
                                        },
                                      }),
                                    )
                                  : morphing
                                    ? motion.node(
                                        h.span([h.Class('inline-block align-top')], [turn.text]),
                                        { layout: true, animate: {} },
                                      )
                                    : turn.text,
                            },
                          }),
                        ),
                      ]
                    })
                const composer = (key: string) => {
                  const child = model.composers[key]
                  return child === undefined
                    ? h.empty
                    : h.block(
                        Composers.embedView({
                          key,
                          slotId: child.id,
                          model: child,
                          viewInputs: {
                            context,
                            animate: motion.node,
                            getReorder: () => reorder,
                            tooltip: decorate,
                            textareaLabel: `${sections.find((scene) => scene.key === key)?.title ?? key} message`,
                            ...(key === 'queued'
                              ? { placeholder: 'Send while I’m responding to queue a message…' }
                              : key === 'handler'
                                ? { placeholder: 'Press Enter to send. Shift+Enter for newline.' }
                                : {}),
                            ...(key === 'left'
                              ? {
                                  leftSlot: ({
                                    context,
                                    filePickerAttributes,
                                  }: Parameters<
                                    NonNullable<InputMessageViewInputs['leftSlot']>
                                  >[0]) => [
                                    Button(
                                      {
                                        context,
                                        variant: 'ghost',
                                        buttonSize: 'icon-sm',
                                        children: [],
                                        leadingIcon: defaultIcons.plus,
                                        attributes: [
                                          ...filePickerAttributes(),
                                          h.AriaLabel('Attach'),
                                        ],
                                      },
                                      h,
                                    ),
                                  ],
                                }
                              : {}),
                            ...(key === 'right'
                              ? {
                                  rightSlot: ({
                                    context,
                                  }: Parameters<
                                    NonNullable<InputMessageViewInputs['rightSlot']>
                                  >[0]) => [
                                    Button(
                                      {
                                        context,
                                        variant: 'ghost',
                                        buttonSize: 'sm',
                                        trailingIcon: defaultIcons['chevron-down'],
                                        children: ['Sonnet 4.6'],
                                      },
                                      h,
                                    ),
                                  ],
                                }
                              : {}),
                          },
                        }),
                      )
                }
                return h.div(
                  [],
                  sections.map((scene) => {
                    const tabs = model.documentationTabs[scene.key]
                    if (tabs === undefined)
                      throw new Error(`Missing message documentation tabs ${scene.key}`)
                    const floating = scene.key === 'attachments' || scene.key === 'queued'
                    const streaming =
                      Option.getOrNull(model.composers.queued?.status ?? Option.none()) ===
                      'streaming'
                    const playback =
                      scene.key === 'queued'
                        ? {
                            label: model.isPaused ? 'Resume' : streaming ? 'Pause' : 'Reset',
                            message: Message.ClickedPlayback(),
                          }
                        : model.turns.some((turn) => turn.section === scene.key)
                          ? {
                              label: scene.key === 'attachments' ? 'Reset' : 'Clear messages',
                              message: Message.ClickedClear({ section: scene.key }),
                            }
                          : undefined
                    const content: ReadonlyArray<Html> =
                      scene.key === 'transcript'
                        ? [
                            h.block(
                              Transcript.embedView({
                                slotId: 'docs-message-transcript-example',
                                model: model.transcript,
                                viewInputs: {
                                  context,
                                  animate: motion.node,
                                  getReorder: () => reorder,
                                  tooltip: decorate,
                                },
                              }),
                            ),
                          ]
                        : floating
                          ? [
                              h.div(
                                [
                                  h.Class('relative w-full self-stretch'),
                                  h.OnMount(ObserveTranscript({ section: scene.key })),
                                ],
                                [
                                  h.div(
                                    [
                                      h.DataAttribute('demo-transcript', ''),
                                      h.Class('absolute inset-0 overflow-y-auto scrollbar-hide'),
                                    ],
                                    [
                                      h.div(
                                        [
                                          h.Class('flex min-h-full flex-col justify-start gap-2'),
                                          h.Style({
                                            paddingBottom:
                                              scene.key === 'queued'
                                                ? `calc(var(--composer-height, 100px) + 8px + ${model.stack.queue.length ? collapsedStackHeight(model.stack.queue.length, queueCardHeight({ context })) + 8 : 0}px)`
                                                : 'calc(var(--composer-height, 100px) + 12px)',
                                          }),
                                        ],
                                        transcript(scene.key),
                                      ),
                                    ],
                                  ),
                                  ...(scene.key === 'queued'
                                    ? [
                                        h.block(
                                          Stack.embedView({
                                            slotId: 'docs-message-stack',
                                            model: model.stack,
                                            viewInputs: {
                                              context,
                                              animate: motion.node,
                                              tooltip: decorate,
                                              morphLayoutId: (item) => `qm-${item.id}`,
                                              layoutDependency: String(model.revision),
                                            },
                                          }),
                                        ),
                                      ]
                                    : []),
                                  h.div(
                                    [
                                      h.DataAttribute('demo-composer', ''),
                                      h.Class('absolute inset-x-0 bottom-0'),
                                    ],
                                    [composer(scene.key)],
                                  ),
                                ],
                              ),
                            ]
                          : [
                              h.div(
                                [h.Class('w-full max-w-xl flex flex-col gap-3')],
                                [
                                  ...(scene.key === 'handler' ? transcript('handler') : []),
                                  composer(scene.key),
                                ],
                              ),
                            ]
                    return docSection(h, {
                      title: scene.title,
                      children: content,
                      source: documentationRuntime().sources['authored-messages'],
                      pane:
                        model.documentationTabs[scene.key]?.tabs.selectedIndex === 1
                          ? 'code'
                          : 'preview',
                      tabsId: previewCodeTabId('input-message', scene.key),
                      tabs: h.block(
                        DocumentationTabs.embedView({
                          key: scene.key,
                          slotId: previewCodeTabId('input-message', scene.key),
                          model: tabs,
                          viewInputs: previewCodeTabsViewInputs(h, {
                            context,
                            animate: target.node,
                            ariaLabel: `${scene.title} example view`,
                          }),
                        }),
                      ),
                      presentation: { context },
                      previewMinHeight: scene.height,
                      ...(floating
                        ? {
                            previewHeight: scene.height,
                            previewAlign: 'bottom' as const,
                            previewPadding: 'compact' as const,
                          }
                        : {}),
                      ...(floating ? {} : { className: 'w-full max-w-xl' }),
                      actions:
                        playback === undefined
                          ? []
                          : [
                              decorate(
                                {
                                  trigger: ({ button }) =>
                                    Button(
                                      {
                                        context,
                                        variant: 'ghost',
                                        buttonSize: 'compact',
                                        children: [],

                                        leadingIcon:
                                          defaultIcons[
                                            playback.label === 'Resume'
                                              ? 'play'
                                              : playback.label === 'Pause'
                                                ? 'pause'
                                                : 'rotate-ccw'
                                          ],
                                        attributes: [
                                          h.AriaLabel(playback.label),
                                          h.OnClick(playback.message),
                                        ],
                                        render: (attributes, children) =>
                                          button(
                                            attributes.flatMap((attribute) =>
                                              '__childAttribute' in attribute
                                                ? [attribute]
                                                : childAttributes([attribute]),
                                            ),
                                            children,
                                          ),
                                      },
                                      h,
                                    ),
                                },
                                {
                                  key: `docs-message-playback-${scene.key}`,
                                  content: playback.label,
                                  side: 'top',
                                  shapeClass:
                                    settings.shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
                                },
                              ),
                            ],
                    })
                  }),
                )
              },
            },
          }),
        ),
      ],
    )
  })
