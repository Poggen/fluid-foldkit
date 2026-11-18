import { KeyCap } from './key-cap.js'
import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
import { Array, Function, Match } from 'effect'

import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { Button } from './button.js'

import { encodeMessageKeyState } from './input-message-native-events.js'

import { inputMessageCommit } from './input-message-commit.js'

import { cn } from './lib/utils.js'

import { fieldTouchClass } from './lib/type-scale.js'

import { surfaceClasses } from './lib/surface-classes.js'

import { spring } from './lib/springs.js'

import type { MotionOptions } from './motion.js'
import type { ReorderScope } from './reorder.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation, PresentationContext } from './presentation.js'
import { inputMessageValues, inputMessageButtonMode } from './input-message-state.js'
import type { InputMessageModel } from './input-message-state.js'
import type {
  InputMessageViewBuilder,
  InputMessageMessage,
  InputMessageMountRequirements,
} from './input-message/composition.js'
import type { MessageFile, QueuedMessage } from './input-message-domain.js'

export interface InputMessageSlotContext {
  readonly context: PresentationContext
  readonly files: ReadonlyArray<MessageFile>
  /** Native event attribute: opens the picker in the original user-activation stack. */
  readonly filePickerAttributes: (acceptOverride?: string) => ReadonlyArray<ChildAttribute>
}

export interface InputMessageViewInputs extends Presentation {
  readonly placeholder?: string
  readonly sendLabel?: string
  readonly className?: string
  readonly style?: Readonly<Record<string, string>>
  readonly textareaStyle?: Readonly<Record<string, string>>
  readonly textareaClassName?: string
  readonly textareaLabel?: string
  readonly textareaDescribedBy?: string
  readonly textareaAttributes?: ReadonlyArray<ChildAttribute>
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly leftSlot?: (context: InputMessageSlotContext) => ReadonlyArray<Html>
  readonly rightSlot?: (context: InputMessageSlotContext) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly getReorder: () => ReorderScope
  readonly tooltip: (
    context: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
    options: {
      readonly key: string
      readonly shapeClass: string
      readonly content: string
      readonly side: 'top'
    },
  ) => Html
}

export interface InputMessagePaintInputs extends InputMessageViewInputs {
  /** Bound native region views, constructed only by the feature's composition. */
  readonly filesRegion: (
    files: ReadonlyArray<MessageFile>,
    size: number,
    height: number | null,
  ) => Html
  readonly queueRegion: (
    items: ReadonlyArray<QueuedMessage>,
    height: number | null,
    isTouch: boolean,
    reduceMotion: boolean,
  ) => Html
  readonly suggestionsRegion: (
    items: ReadonlyArray<string>,
    open: boolean,
    active: number | null,
    listId: string,
    height: number | null,
  ) => Html
}

export interface InputMessagePaintEvents<M> {
  readonly buttonComplete: Extract<Attribute<M>, { readonly _tag: 'OnCustomEvent' }>
  readonly observe: ReadonlyArray<ChildAttribute<InputMessageMountRequirements>>
  readonly input: Extract<Attribute<M>, { readonly _tag: 'OnInput' }>
  readonly blur: Extract<Attribute<M>, { readonly _tag: 'OnBlur' }>
  readonly enter: Extract<Attribute<M>, { readonly _tag: 'OnMouseEnter' }>
  readonly leave: Extract<Attribute<M>, { readonly _tag: 'OnMouseLeave' }>
  readonly submit: Extract<Attribute<M>, { readonly _tag: 'OnClick' }>
  readonly stop: Extract<Attribute<M>, { readonly _tag: 'OnClick' }>
}

export function inputMessagePaint(
  state: InputMessageModel & { readonly activeSuggestion: number | null },
  inputs: InputMessagePaintInputs,
  h: InputMessageViewBuilder,
  events: InputMessagePaintEvents<InputMessageMessage>,
): Html {
  const model = inputMessageValues(state)

  for (const item of inputs.textareaAttributes ?? []) {
    if (
      item.attribute._tag.startsWith('On') ||
      [
        'Value',
        'Disabled',
        'Placeholder',
        'Class',
        'Style',
        'AriaLabel',
        'AriaDescribedBy',
        'AriaActiveDescendant',
        'AriaControls',
        'AriaAutocomplete',
      ].includes(item.attribute._tag)
    ) {
      throw new TypeError(
        'InputMessage textareaAttributes cannot replace owned events/value/presentation; use native Events and explicit textarea presentation inputs',
      )
    }
  }

  const p = resolvePresentation(inputs)

  const innerContext = createPresentationContext({
    ...inputs,
    surface: 2,
    hasSizeProvider: inputs.size !== undefined || p.hasSizeProvider,
  })

  const compact = p.size.variant === 'compact'
  const mode = inputMessageButtonMode(state)
  const canSend = !model.disabled && (model.value.trim().length > 0 || model.files.length > 0)

  const showGhost =
    Boolean(model.placeholderSuggestion) &&
    model.value === '' &&
    !(model.dragOver && model.supportsFiles)

  const textClass = compact
    ? 'text-[length:var(--fs-subtitle-compact,13px)] leading-[var(--lh-subtitle-compact,18px)] px-1.5 py-1.5'
    : 'text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)] px-2 py-2'

  const edgeDrop = '0 1px 1px -0.5px var(--shadow-color)'

  const edge = Match.value(model).pipe(
    Match.when({ dragOver: true }, () => `0 0 0 1px var(--fluid-accent, #6B97FF), ${edgeDrop}`),
    Match.when(
      { focusVisible: true },
      () => `0 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent), ${edgeDrop}`,
    ),
    Match.when(
      { hovered: true, clickToFocus: true, disabled: false },
      () => `0 0 0 1px var(--border), ${edgeDrop}`,
    ),
    Match.orElse(Function.constUndefined),
  )

  const slot: InputMessageSlotContext = {
    context: innerContext,
    files: model.files,
    filePickerAttributes: (acceptOverride) =>
      childAttributes([
        h.DataAttribute('im-file-picker', ''),
        h.DataAttribute('im-file-accept', acceptOverride ?? ''),
      ]),
  }

  const renderSendGlyph = () =>
    model.buttonGlyph === 'stop'
      ? h.span([h.Class('h-3 w-3 rounded-[3px] bg-current')])
      : p.icons['arrow-up'](
          {
            size: compact ? 15 : 19,
            className: cn('block', compact ? '!h-[15px] !w-[15px]' : '!h-[19px] !w-[19px]'),
          },
          h,
        )

  const sendGlyph = renderSendGlyph()

  const renderTextarea = () =>
    h.div(
      [h.Class('relative')],
      [
        h.textarea([
          h.Value(model.value),
          h.DataAttribute('im-textarea', ''),
          events.input,
          events.blur,
          ...Match.value(model).pipe(
            Match.when({ dragOver: true, supportsFiles: true }, () => [
              h.Placeholder('Drop files here to add to chat'),
            ]),
            Match.when(
              (value) =>
                value.placeholderSuggestion !== null && value.placeholderSuggestion.length > 0,
              () => [],
            ),
            Match.orElse(() => [h.Placeholder(inputs.placeholder ?? 'Ask me anything…')]),
          ),
          h.Disabled(model.disabled),
          h.Rows(model.minRows),
          h.AriaLabel(inputs.textareaLabel ?? 'Message'),
          ...Array.match(model.suggestions, {
            onEmpty: () => [],
            onNonEmpty: () =>
              model.value === ''
                ? [h.AriaControls(`${model.id}-suggestions`), h.AriaAutocomplete('list')]
                : [],
          }),
          ...(showGhost ||
          (inputs.textareaDescribedBy !== undefined && inputs.textareaDescribedBy !== '')
            ? [
                h.AriaDescribedBy(
                  [showGhost ? `${model.id}-ghost-hint` : '', inputs.textareaDescribedBy ?? '']
                    .filter(Boolean)
                    .join(' '),
                ),
              ]
            : []),
          ...(model.activeSuggestion === null
            ? []
            : [h.AriaActiveDescendant(`${model.id}-suggestions-${model.activeSuggestion}`)]),
          h.Class(
            cn(
              'w-full resize-none rounded-none bg-transparent outline-none',
              'text-foreground placeholder:text-muted-foreground',
              textClass,
              fieldTouchClass,
              inputs.textareaClassName,
              inputs.textareaStyle === undefined && '',
            ),
          ),
          h.Style({ fontVariationSettings: fontWeights.normal, ...inputs.textareaStyle }),
          ...(inputs.textareaAttributes ?? []),
        ]),
        showGhost
          ? h.div(
              [
                h.Class(
                  cn(
                    'pointer-events-none absolute inset-0 overflow-hidden text-muted-foreground',
                    textClass,
                    fieldTouchClass,
                  ),
                ),
                h.AriaHidden(true),
                h.Style({ fontVariationSettings: fontWeights.normal }),
              ],
              [
                h.span(
                  [h.Class('flex max-w-full items-center gap-1.5')],
                  [
                    h.span([h.Class('min-w-0 truncate')], [model.placeholderSuggestion ?? '']),
                    KeyCap({ children: 'Tab', className: '-translate-y-px' }, h),
                  ],
                ),
              ],
            )
          : null,
        showGhost
          ? h.span(
              [h.Id(`${model.id}-ghost-hint`), h.Class('sr-only')],
              [
                `Suggested prompt: ${model.placeholderSuggestion}. Press Tab to fill the composer with it.`,
              ],
            )
          : null,
      ],
    )

  const renderButton = () =>
    Button(
      {
        context: innerContext,
        surface: 2,
        buttonSize: 'icon-sm',
        variant: 'primary',
        disabled: mode === 'stop' ? model.disabled : !canSend,
        attributes: [
          h.Type('button'),
          mode === 'stop' ? events.stop : events.submit,
          h.AriaLabel(
            Match.value(mode).pipe(
              Match.when('stop', () => 'Stop'),
              Match.when('queue', () => 'Queue message'),
              Match.orElse(() => inputs.sendLabel ?? 'Send'),
            ),
          ),
        ],
        children: [
          inputs.animate(
            h.keyed('span')(
              model.buttonGlyph,
              [h.Class('flex items-center justify-center leading-none'), events.buttonComplete],
              [sendGlyph],
            ),
            {
              initial: Match.value(model).pipe(
                Match.when({ buttonSwaps: 0 }, (): false => false),
                Match.when({ reduceMotion: true }, () => ({ opacity: 0 })),
                Match.orElse(() => ({ opacity: 0, scale: 0.6 })),
              ),
              animate: { opacity: 1, scale: 1 },
              present: !model.buttonExiting,
              exit: model.reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.6, transition: spring.fast.exit },
              transition: spring.fast,
            },
          ),
        ],
      },
      h,
    )

  const renderControls = () =>
    h.div(
      [
        h.Class(
          cn(
            'flex items-center justify-between',
            compact
              ? 'gap-1.5 [&_button]:h-6 [&_button.w-7]:w-6 [&_button]:text-[length:var(--fs-caption-compact,11px)] [&_button]:leading-[var(--lh-caption-compact,14px)]'
              : 'gap-2',
          ),
        ),
      ],
      [
        h.div([h.Class('flex items-center gap-1.5 min-w-0')], inputs.leftSlot?.(slot) ?? []),
        h.div(
          [h.Class('flex items-center gap-1.5 shrink-0')],
          [...(inputs.rightSlot?.(slot) ?? []), renderButton()],
        ),
      ],
    )

  const composerAttributes = () =>
    sourceStyleAttributes(
      edge === undefined ? { ...inputs.style } : { boxShadow: edge, ...inputs.style },
      [
        h.Class(
          cn(
            'flex flex-col gap-1 p-2 transition-[box-shadow,color] duration-80',
            surfaceClasses(2, 2),
            p.shape.container,
            model.clickToFocus && !model.disabled && 'cursor-text',
            model.disabled && 'opacity-50 pointer-events-none',
            inputs.className,
          ),
        ),
        h.Id(model.id),
        h.DataAttribute('im-composer', ''),
        h.DataAttribute('im-accepted-value', model.value),
        h.DataAttribute('im-key-state', encodeMessageKeyState(model)),
        h.DataAttribute('im-accept', model.accept),
        h.DataAttribute('im-min-rows', String(model.minRows)),
        h.DataAttribute('im-max-rows', String(model.maxRows)),
        h.DataAttribute('im-files-enabled', String(model.supportsFiles)),
        h.DataAttribute('im-disabled', String(model.disabled)),
        h.DataAttribute('im-click-to-focus', String(model.clickToFocus)),
        events.enter,
        events.leave,
        ...events.observe,
        ...(inputs.attributes ?? []),
      ],
    )

  return inputMessageCommit(
    h.div(composerAttributes(), [
      model.supportsFiles
        ? h.input([
            h.Type('file'),
            h.Accept(model.accept),
            h.Multiple(model.maxFiles === null || model.maxFiles > 1),
            h.Class('hidden'),
            h.AriaHidden(true),
            h.Tabindex(-1),
          ])
        : null,
      inputs.filesRegion(model.files, model.filePreviewSize, model.filesHeight),
      model.supportsQueue && model.showQueue
        ? inputs.queueRegion(model.queue, model.queueHeight, model.isTouch, model.reduceMotion)
        : null,
      renderTextarea(),
      renderControls(),
      inputs.suggestionsRegion(
        model.suggestions,
        model.suggestions.length > 0 && model.value === '',
        model.activeSuggestion,
        `${model.id}-suggestions`,
        model.suggestionsHeight,
      ),
      h.span([h.Class('sr-only'), h.Role('status'), h.AriaLive('polite')], [model.liveMessage]),
    ]),
    model.value,
    model.minRows,
    model.maxRows,
    model.editRevision,
  )
}
