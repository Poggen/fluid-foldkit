import { fontWeights } from './lib/font-weight.js'
import { Button } from '@foldkit/ui'
import { Function, Match } from 'effect'
import type * as Mount from 'foldkit/mount'
import type { InputCopyViewBuilder } from './input-copy-core.js'
import type { Model } from './input-copy-state.js'
import type { Message, ResultLifetime } from './input-copy-effects.js'
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html, TaggedAttribute } from 'foldkit/html'
import { cn } from './lib/utils.js'

import { spring } from './lib/springs.js'

import type { TargetMotionOptions } from './motion-target.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export interface InputCopyTooltip {
  readonly shapeClass: string
  readonly content: string
  readonly delayDuration: number
  readonly sideOffset: number
  readonly forceOpen: boolean | undefined
}

export interface InputCopyViewInputs extends Presentation {
  readonly iconOnly?: boolean
  readonly accessibleLabel?: string
  readonly label?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  /** Real native Tooltip composition; must report visibility through the public operation. */
  readonly tooltip: (
    context: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
    options: InputCopyTooltip,
  ) => Html
}

export function inputCopyPaint(
  model: typeof Model.Type,
  inputs: InputCopyViewInputs,
  h: InputCopyViewBuilder,
  events: {
    readonly copy: typeof Message.Type
    readonly mount: ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof ResultLifetime>>>
    readonly down: ReturnType<InputCopyViewBuilder['OnPointerDown']>
    readonly enter: ReturnType<InputCopyViewBuilder['OnMouseEnter']>
    readonly leave: ReturnType<InputCopyViewBuilder['OnMouseLeave']>
    readonly completed: Extract<
      TaggedAttribute<typeof Message.Type>,
      { readonly _tag: 'OnCustomEvent' }
    >
  },
): Html {
  const p = resolvePresentation(inputs)
  const buttonVariant = model.variant === 'button'
  const displayedButtonVariant = model.displayedVariant === 'button'
  const left = model.align === 'left'
  const rowPy = p.size.variant === 'compact' ? 'py-1' : 'py-2'

  const hasLabel = inputs.label !== undefined && inputs.label !== ''

  const label = Match.value(model.displayed).pipe(
    Match.when('idle', () => 'Copy'),
    Match.when('error', () => 'Failed'),
    Match.when('copied', () => 'Copied'),
    Match.exhaustive,
  )

  const countKey = Match.value(model.displayed).pipe(
    Match.when('idle', () => (displayedButtonVariant ? 'copy-label' : 'copy')),
    Match.orElse(
      (displayed) =>
        `${displayed === 'error' ? 'error' : 'check'}-${displayedButtonVariant ? 'label-' : ''}${model.displayedCount}`,
    ),
  )

  const renderGlyph = () =>
    model.displayed === 'idle'
      ? p.icons.copy(
          {
            size: 14,
            strokeWidth: 1.5,
            className: 'transition-[stroke-width] duration-80 group-hover:stroke-[2]',
          },
          h,
        )
      : h.svg(
          [
            h.Width('14'),
            h.Height('14'),
            h.ViewBox('2 4 20 16'),
            h.Fill('none'),
            h.Stroke('currentColor'),
            h.StrokeLinecap('round'),
            h.StrokeLinejoin('round'),
            ...(displayedButtonVariant ? [h.StrokeWidth('2')] : []),
          ],
          [
            inputs.animate(
              h.path([
                h.D(model.displayed === 'error' ? 'M9 9L15 15M15 9L9 15' : 'M6 12L10 16L18 8'),
              ]),
              {
                initial: model.glyphInitial ? { pathLength: 0 } : false,
                animate: { pathLength: 1, transition: { duration: 0.08, ease: 'easeOut' } },
              },
            ),
          ],
        )

  const glyph = renderGlyph()

  const switched = inputs.animate(
    h.keyed('span')(
      countKey,
      [
        h.Class(
          cn(
            'flex items-center',
            displayedButtonVariant ? 'gap-1.5' : 'justify-center',
            model.displayed === 'error' && 'text-destructive',
            !displayedButtonVariant &&
              model.displayed !== 'idle' &&
              '[&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]',
          ),
        ),
        events.completed,
      ],
      displayedButtonVariant
        ? [
            h.span([h.Class('flex items-center justify-center')], [glyph]),
            h.span(
              [h.Class('select-none inline-grid text-left')],
              [
                h.span(
                  [h.Class('col-start-1 row-start-1 invisible'), h.AriaHidden(true)],
                  ['Copied'],
                ),
                h.span([h.Class('col-start-1 row-start-1')], [label]),
              ],
            ),
          ]
        : [glyph],
    ),
    {
      initial: model.glyphInitial
        ? { opacity: 0, scale: model.displayed === 'idle' ? 0.8 : 0.6 }
        : false,
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
      transition: spring.fast,
      present: !model.exiting,
    },
  )

  const action = h.span(
    [
      h.Class(
        cn(
          'shrink-0 transition-colors duration-80',
          inputs.iconOnly ? 'p-0' : `px-1.5 ${rowPy}`,
          'text-muted-foreground group-hover:text-foreground',
          buttonVariant && `flex items-center gap-1.5 ${p.size.text}`,
        ),
      ),
      ...(buttonVariant ? [h.Style({ fontVariationSettings: fontWeights.normal })] : []),
    ],
    [switched],
  )

  const value = h.span(
    [
      h.Class(
        cn(
          'flex-1 min-w-0 text-left text-foreground font-mono select-none truncate',
          p.size.text,
          rowPy,
          left ? 'pl-1' : 'pl-0',
        ),
      ),
      h.Style({ fontVariationSettings: fontWeights.normal }),
    ],
    [
      h.mark(
        [
          h.Class(
            'bg-transparent text-foreground transition-colors duration-80 group-hover:bg-[color-mix(in_oklab,var(--fluid-accent,#6B97FF)_20%,transparent)] group-hover:text-foreground',
          ),
        ],
        [model.value],
      ),
    ],
  )

  return Button.view(
    {
      onClick: events.copy,
      isDisabled: model.disabled,
      type: 'button',
      toView: ({ button: nativeAttributes }) => {
        const resolvedNative = nativeAttributes.flatMap((attribute) =>
          '_tag' in attribute ? childAttributes([attribute]) : [attribute],
        )

        const ownButtonAttributes = [
          ...resolvedNative,
          ...childAttributes([
            h.Id(`${model.id}-button`),
            h.Disabled(model.disabled),
            events.down,
            h.AriaLabel(
              inputs.accessibleLabel ??
                Match.value(model.status).pipe(
                  Match.when('copied', () => 'Copied'),
                  Match.when('error', () => 'Copy failed'),
                  Match.when('idle', () => (hasLabel ? 'Copy' : 'Copy to clipboard')),
                  Match.exhaustive,
                ),
            ),
            ...(hasLabel ? [h.AriaLabelledBy(`${model.id}-button ${model.id}-label`)] : []),
            h.Class(
              cn(
                'group flex items-center w-full cursor-pointer outline-none transition-[color,background-color,border-radius,box-shadow] duration-80',
                'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                inputs.iconOnly && 'size-6 justify-center',
                p.shape.input,
              ),
            ),
          ]),
        ]

        const button = (attributes: ReadonlyArray<ChildAttribute>) =>
          h.keyed('button')(
            model.variant,
            [...attributes, ...ownButtonAttributes],
            inputs.iconOnly ? [action] : left ? [action, value] : [value, action],
          )

        return h.div(
          [
            h.Id(model.id),
            ...events.mount,
            h.Class(
              cn(
                'flex flex-col gap-0.5',
                model.disabled && 'opacity-50 pointer-events-none',
                inputs.className,
              ),
            ),
            events.enter,
            events.leave,
            ...(inputs.attributes ?? []),
          ],
          [
            hasLabel
              ? h.span(
                  [
                    h.Class(cn('text-muted-foreground', p.size.text, left ? 'pl-1' : 'pl-0')),
                    h.Id(`${model.id}-label`),
                    h.Style({ fontVariationSettings: fontWeights.normal }),
                  ],
                  [inputs.label ?? ''],
                )
              : null,
            buttonVariant
              ? button([])
              : inputs.tooltip(
                  {
                    trigger: ({ button: renderButton }) =>
                      renderButton(
                        ownButtonAttributes,
                        inputs.iconOnly ? [action] : left ? [action, value] : [value, action],
                        model.variant,
                      ),
                  },
                  {
                    shapeClass: p.shape.bg,
                    content: Match.value(model.tooltipState).pipe(
                      Match.when('idle', () => 'Copy to clipboard'),
                      Match.orElse(() => (model.status === 'error' ? 'Copy failed' : 'Copied')),
                    ),
                    delayDuration: 500,
                    sideOffset: 2,
                    forceOpen: Match.value(model.tooltipState).pipe(
                      Match.when('copied', () => true),
                      Match.when('suppressed', () => false),
                      Match.when('idle', Function.constUndefined),
                      Match.exhaustive,
                    ),
                  },
                ),
          ],
        )
      },
    },
    h,
  )
}
