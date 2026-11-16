import { fontWeights } from './lib/font-weight.js'
import { Array } from 'effect'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { QueuedMessage } from './input-message-domain.js'

import { nestedRadius } from './lib/shape.js'

import { spring } from './lib/springs.js'

import { typeClass } from './lib/type-scale.js'

import { cn } from './lib/utils.js'

import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { collapsedStackHeight, stackCardHeight, stackExpanded } from './queued-stack-state.js'
import type { StackSlot, StackState } from './queued-stack-state.js'

interface QueuedStackPresentationInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly tooltip: (
    context: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
    options: {
      readonly key: string
      readonly content: string
      readonly side: 'left' | 'top'
      readonly shapeClass: string
    },
  ) => Html
}

/** Shared-layout morphing requires the caller's external geometry revision. */
export type QueuedStackViewInputs = QueuedStackPresentationInputs &
  (
    | {
        readonly morphLayoutId: (item: QueuedMessage) => string
        readonly layoutDependency: string
      }
    | {
        readonly morphLayoutId?: never
        readonly layoutDependency?: never
      }
  )

export const queuedStackTooltipDescriptors = (
  model: StackState,
): ReadonlyArray<{
  readonly key: string
  readonly content: string
  readonly side: 'left' | 'top'
}> => {
  if (!model.rootVisible) {
    return []
  }

  const expanded = model.exitSnapshot?.expanded ?? stackExpanded(model)
  const touch = model.exitSnapshot?.touch ?? model.touch
  const count = model.exitSnapshot?.count ?? model.queue.length
  const collapse = touch && expanded

  return [
    {
      key: `${model.id}/${collapse ? 'collapse' : 'count'}`,
      content: collapse ? 'Collapse' : `${count} queued message${count === 1 ? '' : 's'}`,
      side: 'left',
    },
    ...model.slots.flatMap(({ item }) => [
      { key: `${model.id}/edit/${item.id}`, content: 'Edit', side: 'top' } satisfies {
        readonly key: string
        readonly content: string
        readonly side: 'top'
      },
      { key: `${model.id}/remove/${item.id}`, content: 'Remove', side: 'top' } satisfies {
        readonly key: string
        readonly content: string
        readonly side: 'top'
      },
    ]),
  ]
}

export interface StackPaintBindings {
  readonly root: ReadonlyArray<ChildAttribute>
  readonly count: ReadonlyArray<ChildAttribute>
  readonly card: (slot: typeof StackSlot.Type) => ReadonlyArray<ChildAttribute>
  readonly edit: (id: string) => ReadonlyArray<ChildAttribute>
  readonly remove: (id: string) => ReadonlyArray<ChildAttribute>
  readonly collapse: ReadonlyArray<ChildAttribute>
  readonly thumbnail: (item: QueuedMessage, index: number, radius: number) => Html
}

export function queuedStackPaint<Message>(
  model: StackState,
  inputs: QueuedStackViewInputs,
  bindings: StackPaintBindings,
  h: HtmlBuilder<Message>,
) {
  if (!model.rootVisible) {
    return h.empty
  }

  const { shape, size, surface, icons, reducedMotion, prefersReducedMotion } =
    resolvePresentation(inputs)

  // AnimatePresence retains the last subtree while the entire stack fades out.
  const paint = model.exitSnapshot ? { ...model, ...model.exitSnapshot } : model
  const cardH = stackCardHeight(paint)
  const expanded = model.exitSnapshot?.expanded ?? stackExpanded(model)
  const count = model.exitSnapshot?.count ?? model.queue.length

  const height = expanded
    ? count * cardH + Math.max(count - 1, 0) * 8
    : collapsedStackHeight(count, cardH)

  const radius = nestedRadius(shape.bgRadius, paint.compact ? 7 : 8)

  const gutter = inputs.tooltip(
    {
      trigger: ({ button, div }) =>
        paint.touch && expanded
          ? button(
              [
                ...childAttributes([
                  h.Class(
                    cn(
                      'absolute bottom-0 left-0 flex items-center justify-center text-muted-foreground outline-none hover:text-foreground',
                      shape.button,
                      'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                    ),
                  ),
                  h.Type('button'),
                  h.AriaLabel('Collapse queued messages'),
                  h.Style({ height: `${cardH}px`, width: '40px' }),
                ]),
                ...bindings.collapse,
              ],
              [icons['chevron-down']({ size: 18, strokeWidth: 2 }, h)],
            )
          : div(
              childAttributes([
                h.Class(
                  'absolute bottom-0 left-0 flex items-center justify-end gap-1 pr-1 text-muted-foreground',
                ),
                h.Style({ height: `${cardH}px`, width: '40px' }),
              ]),
              [
                model.countPaint === null
                  ? h.empty
                  : inputs.animate(
                      h.span(
                        [
                          h.Class(
                            'pointer-events-none text-[length:var(--fs-micro-compact,10px)] leading-none tabular-nums text-muted-foreground',
                          ),
                          ...bindings.count,
                          h.Style({ fontVariationSettings: fontWeights.semibold }),
                        ],
                        [String(model.countPaint)],
                      ),
                      {
                        initial: { opacity: 0, scale: 0.6 },
                        animate: {
                          opacity: model.countPresent ? 1 : 0,
                          scale: model.countPresent ? 1 : 0.6,
                        },
                        transition: spring.fast,
                        onAnimationComplete: (element) => {
                          element.dispatchEvent(
                            new CustomEvent(`fluid-stack-count-${model.countGeneration}`),
                          )
                        },
                      },
                    ),
                icons['corner-down-right']({ size: 16, strokeWidth: 2 }, h),
              ],
            ),
    },
    {
      key: `${model.id}/${paint.touch && expanded ? 'collapse' : 'count'}`,
      content:
        paint.touch && expanded ? 'Collapse' : `${count} queued message${count === 1 ? '' : 's'}`,
      side: 'left',
      shapeClass: shape.bg,
    },
  )

  const cardMotion = (
    slot: typeof StackSlot.Type,
    item: QueuedMessage,
    position: number,
  ): MotionOptions => {
    const dragging = paint.draggingId === item.id
    const peek = Math.min(position, 2)
    const expandedY = dragging ? paint.dragY : -position * (cardH + 8)
    const expandedScale = dragging ? 1.03 : 1

    const transition = () => {
      if (!slot.present) {
        return { duration: 0.12 }
      }

      if (dragging) {
        return { duration: 0 }
      }

      return spring.moderate
    }

    const options: MotionOptions = {
      initial: slot.initial ? { opacity: 0, y: 14, scale: 0.96 } : false,
      animate: slot.present
        ? {
            y: expanded ? expandedY : -peek * 12,
            scale: expanded ? expandedScale : 1 - peek * 0.05,
            opacity: expanded || position <= 2 ? 1 : 0,
          }
        : { opacity: 0, scale: 0.9 },
      transition: transition(),
      onAnimationComplete: (element) => {
        element.dispatchEvent(new CustomEvent(`fluid-stack-card-${slot.generation}`))
      },
    }

    const layoutId =
      paint.pointerDownId === null
        ? Array.match(item.files, {
            onEmpty: () => inputs.morphLayoutId?.(item),
            onNonEmpty: () => undefined,
          })
        : undefined

    if (layoutId !== undefined) {
      // A sibling Block render must not start a queue layout projection commit.
      // Values, not a freshly allocated object, identify this owner's layout.
      const layoutDependency = JSON.stringify([
        model,
        shape.variant,
        size.variant,
        surface,
        reducedMotion,
        prefersReducedMotion,
        inputs.layoutDependency,
        layoutId,
      ])

      return { ...options, layoutId, layoutDependency }
    }

    return options
  }

  return inputs.animate(
    h.div(
      [
        h.Class('absolute inset-x-0 z-10'),
        h.Id(model.id),
        h.Style({ bottom: `${paint.bottom}px` }),
        h.DataAttribute('queued-stack', ''),
        h.DataAttribute('stack-expanded', String(expanded)),
        ...bindings.root,
      ],
      [
        inputs.animate(
          h.div(
            [h.Class('absolute inset-0')],
            [
              gutter,
              ...model.slots.map((slot, index) => {
                const { item } = slot
                const currentIndex = model.queue.findIndex((entry) => entry.id === item.id)
                const position = currentIndex === -1 ? index : currentIndex
                const dragging = paint.draggingId === item.id

                const actionButton = (kind: 'edit' | 'remove') =>
                  inputs.tooltip(
                    {
                      trigger: ({ button }) =>
                        button(
                          [
                            ...childAttributes([
                              h.Type('button'),
                              h.AriaLabel(
                                `${kind === 'edit' ? 'Edit' : 'Remove'} queued message: ${item.text}`,
                              ),
                              h.Class(
                                cn(
                                  'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground',
                                  shape.button,
                                  'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                                ),
                              ),
                            ]),
                            ...(kind === 'edit'
                              ? bindings.edit(item.id)
                              : bindings.remove(item.id)),
                          ],
                          [
                            icons[kind === 'edit' ? 'pencil' : 'x'](
                              { size: 14, strokeWidth: kind === 'edit' ? 2 : 2.5 },
                              h,
                            ),
                          ],
                        ),
                    },
                    {
                      key: `${model.id}/${kind}/${item.id}`,
                      content: kind === 'edit' ? 'Edit' : 'Remove',
                      side: 'top',
                      shapeClass: shape.bg,
                    },
                  )

                return inputs.animate(
                  h.keyed('div')(
                    item.id,
                    [
                      h.Class(
                        `group/qm absolute bottom-0 left-10 right-10 flex select-none items-center bg-[color-mix(in_oklab,var(--accent),var(--background)_68%)] ${
                          paint.compact
                            ? `gap-1.5 ${item.files.length > 0 ? 'pl-1.5' : 'pl-3'} pr-1`
                            : `gap-2 ${item.files.length > 0 ? 'pl-2' : 'pl-3.5'} pr-1.5`
                        } ${typeClass('subtitle', paint.compact ? 'compact' : 'default')} text-muted-foreground shadow-surface-3 active:cursor-grabbing ${shape.bg}`,
                      ),
                      h.DataAttribute('stack-item', item.id),
                      h.Style({
                        height: `${cardH}px`,
                        transformOrigin: 'bottom center',
                        zIndex: String(dragging ? 200 : 100 - position),
                        cursor: expanded ? 'grab' : 'default',
                        ...(expanded ? { touchAction: 'none' } : {}),
                      }),
                      ...bindings.card(slot),
                    ],
                    [
                      item.files.length
                        ? h.div(
                            [h.Class('pointer-events-none flex shrink-0 items-center gap-1')],
                            [
                              ...item.files
                                .slice(0, 3)
                                .map((_file, fileIndex) =>
                                  bindings.thumbnail(item, fileIndex, radius),
                                ),
                              item.files.length > 3
                                ? h.span(
                                    [
                                      h.Class(
                                        cn(
                                          'flex items-center justify-center bg-background/40 text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] tabular-nums text-foreground',
                                          paint.compact ? 'h-6 w-6' : 'h-7 w-7',
                                        ),
                                      ),
                                      h.Style({ borderRadius: `${radius}px` }),
                                    ],
                                    [`+${item.files.length - 3}`],
                                  )
                                : h.empty,
                            ],
                          )
                        : h.empty,
                      h.span(
                        [h.Class('pointer-events-none min-w-0 flex-1 truncate')],
                        [
                          item.text ||
                            `${item.files.length} attachment${item.files.length === 1 ? '' : 's'}`,
                        ],
                      ),
                      h.div(
                        [
                          h.Class(
                            cn(
                              'shrink-0 items-center gap-1',
                              paint.touch ? 'flex' : 'hidden group-hover/qm:flex',
                            ),
                          ),
                        ],
                        [actionButton('edit'), actionButton('remove')],
                      ),
                    ],
                  ),
                  cardMotion(slot, item, position),
                )
              }),
            ],
          ),
          {
            animate: { y: model.bump ? -7 : 0 },
            transition: model.bump
              ? { duration: 0 }
              : { type: 'spring', duration: 0.42, bounce: 0.5 },
          },
        ),
      ],
    ),
    {
      initial: { opacity: 0 },
      animate: { opacity: model.rootPresent ? 1 : 0, height },
      transition: { ...spring.moderate, bounce: 0 },
      onAnimationComplete: (element) => {
        element.dispatchEvent(new CustomEvent(`fluid-stack-root-${model.rootGeneration}`))
      },
    },
  )
}
