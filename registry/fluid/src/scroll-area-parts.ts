import { sourceStyleAttributes } from './lib/source-style-attributes.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { Presentation } from './presentation.js'
import { resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'
import { scrollAxisMetrics, scrollBarPolicy, type ScrollAreaModel } from './scroll-area-state.js'

export interface ScrollAreaProps extends Presentation {
  readonly className?: string
  readonly viewportClassName?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly viewportAttributes?: ReadonlyArray<ChildAttribute>
  readonly children: ReadonlyArray<Html>
  readonly content?: () => ReadonlyArray<Html>
  readonly horizontalBarAttributes?: ReadonlyArray<ChildAttribute>
  readonly verticalBarAttributes?: ReadonlyArray<ChildAttribute>
  readonly keepMountedHorizontal?: boolean
  readonly keepMountedVertical?: boolean
  readonly scrollBar?: (axis: 'x' | 'y', defaultBar: Html) => Html
}

export interface ScrollBarProps extends Presentation {
  readonly orientation?: 'vertical' | 'horizontal'
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly keepMounted?: boolean
}

export function ScrollBar<Message, R>(
  model: ScrollAreaModel,
  props: ScrollBarProps,
  h: HtmlBuilder<Message, R>,
  corner?: boolean,
): Html {
  const axis = props.orientation === 'horizontal' ? 'x' : 'y'
  const vertical = axis === 'y'
  const metric = scrollAxisMetrics(model, axis)
  const policy = scrollBarPolicy(model, axis, props.keepMounted)
  const { overflow } = policy

  if (!policy.mounted) {
    return h.empty
  }

  const other = scrollBarPolicy(model, axis === 'x' ? 'y' : 'x')
  const hasCorner = corner ?? (model.settings.orientation === 'both' && other.mounted)
  const shape = resolvePresentation(props).shape
  const scrolling = vertical ? model.scrollingY : model.scrollingX

  return h.div(
    sourceStyleAttributes(
      {
        ...(vertical
          ? { '--scroll-area-thumb-height': `${metric.size}px` }
          : { '--scroll-area-thumb-width': `${metric.size}px` }),
        ...(vertical
          ? { bottom: hasCorner ? '10px' : '0px' }
          : { insetInlineEnd: hasCorner ? '10px' : '0px' }),
      },
      [
        h.Class(
          cn(
            'group/scrollbar absolute z-20 flex touch-none select-none',
            'opacity-0 transition-opacity duration-120 ease-out delay-160',
            'data-[hovering]:duration-160 data-[scrolling]:duration-160',
            'data-[hovering]:opacity-100 data-[scrolling]:opacity-100',
            'data-[hovering]:delay-0 data-[scrolling]:delay-0',
            vertical ? 'top-0 right-0 h-full w-2.5' : 'bottom-0 left-0 h-2.5 w-full flex-col',
            props.className,
          ),
        ),
        h.DataAttribute('slot', 'scroll-area-scrollbar'),
        h.DataAttribute('scroll-axis', axis),
        h.DataAttribute('orientation', vertical ? 'vertical' : 'horizontal'),
        ...(model.hovered ? [h.DataAttribute('hovering', '')] : []),
        ...(scrolling ? [h.DataAttribute('scrolling', '')] : []),
        ...(props.attributes ?? []),
      ],
    ),
    overflow
      ? [
          h.div([
            h.Class(
              cn(
                'relative bg-[rgb(var(--overlay)/0.08)] transition-[background-color,width,height] duration-160 ease-in-out',
                'group-hover/scrollbar:bg-[rgb(var(--overlay)/0.12)] active:!bg-[rgb(var(--overlay)/0.16)]',
                shape.bg,
                vertical
                  ? 'mx-auto my-1 w-1 -translate-x-0.5 h-[var(--scroll-area-thumb-height)] group-hover/scrollbar:w-1.5'
                  : 'my-auto mx-1 h-1 -translate-y-0.5 w-[var(--scroll-area-thumb-width)] group-hover/scrollbar:h-1.5',
              ),
            ),
            h.DataAttribute('slot', 'scroll-area-thumb'),
            h.Style({
              transform: vertical
                ? `translate3d(0,${metric.offset}px,0)`
                : `translate3d(${metric.offset}px,0,0)`,
            }),
          ]),
        ]
      : [],
  )
}

export function scrollAreaView<Message, R>(
  model: ScrollAreaModel,
  props: ScrollAreaProps,
  attributes: NonNullable<Parameters<HtmlBuilder<Message, R>['div']>[0]>,
  h: HtmlBuilder<Message, R>,
): Html {
  const children = props.content?.() ?? props.children
  const orientation = model.settings.orientation

  const hasCorner =
    orientation === 'both' &&
    scrollBarPolicy(model, 'x', props.keepMountedHorizontal).mounted &&
    scrollBarPolicy(model, 'y', props.keepMountedVertical).mounted

  const viewport = h.div(
    [
      h.Class(
        cn(
          'size-full rounded-[inherit]',
          model.touch &&
            (orientation === 'vertical'
              ? 'overflow-y-auto'
              : orientation === 'horizontal'
                ? 'overflow-x-auto'
                : 'overflow-auto'),
          props.viewportClassName,
          model.touch
            ? orientation === 'vertical'
              ? 'overflow-y-auto'
              : orientation === 'horizontal'
                ? 'overflow-x-auto'
                : 'overflow-auto'
            : 'overflow-x-scroll overflow-y-scroll',
          Option.isSome(model.drag) ? 'snap-none' : '',
          model.touch ? '' : '[scrollbar-width:none]',
        ),
      ),
      h.DataAttribute('slot', 'scroll-area-viewport'),
      h.Tabindex(
        model.touch ||
          model.geometry.scrollWidth > model.geometry.width ||
          model.geometry.scrollHeight > model.geometry.height
          ? 0
          : -1,
      ),
      h.Style({}),
      ...(props.viewportAttributes ?? []),
    ],
    model.touch
      ? children
      : [h.div([h.DataAttribute('scroll-content', ''), h.Class('min-w-fit')], children)],
  )

  const bars = ['y', 'x']
    .filter((axis): axis is 'y' | 'x' => axis === 'y' || axis === 'x')
    .filter((axis) => (axis === 'x' ? orientation !== 'vertical' : orientation !== 'horizontal'))
    .map((axis) => {
      const bar = ScrollBar(
        model,
        {
          ...(props.shape === undefined ? {} : { shape: props.shape }),
          ...(props.size === undefined ? {} : { size: props.size }),
          ...(props.surface === undefined ? {} : { surface: props.surface }),
          ...(props.context === undefined ? {} : { context: props.context }),
          attributes:
            axis === 'x'
              ? (props.horizontalBarAttributes ?? [])
              : (props.verticalBarAttributes ?? []),
          keepMounted:
            (axis === 'x' ? props.keepMountedHorizontal : props.keepMountedVertical) ?? false,
          orientation: axis === 'x' ? 'horizontal' : 'vertical',
        },
        h,
        hasCorner,
      )

      return props.scrollBar?.(axis, bar) ?? bar
    })

  return h.div(
    sourceStyleAttributes(
      {
        '--scroll-area-corner-width': hasCorner ? '10px' : '0px',
        '--scroll-area-corner-height': hasCorner ? '10px' : '0px',
      },
      [
        h.Class(cn('relative overflow-hidden', props.className, 'relative')),
        h.Id(model.id),
        h.DataAttribute('slot', 'scroll-area'),
        ...(Option.isSome(model.drag)
          ? [h.DataAttribute('scroll-dragging', String(model.drag.value.pointer))]
          : []),
        h.Dir(model.settings.direction),
        ...(!model.touch ? [h.Role('presentation')] : []),
        ...(model.touch ? [h.Role('group'), h.AriaRoleDescription('scroll area')] : []),
        ...attributes,
        ...(props.attributes ?? []),
      ],
    ),
    [
      viewport,
      ...bars,
      ...(hasCorner && !model.touch
        ? [h.div([h.Class('absolute end-0 bottom-0 w-[10px] h-[10px]')])]
        : []),
    ],
  )
}
