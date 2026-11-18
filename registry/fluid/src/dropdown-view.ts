import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { rectAt } from './lib/indexed-geometry.js'
import { Option } from 'effect'
import type {
  Model,
  createDropdownComposition,
  DropdownConfigSchema,
} from './dropdown-composition.js'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, HtmlBuilder } from 'foldkit/html'
import { Elevated } from './elevated.js'
import type { ElevatedProps } from './elevated.js'
import { resolvePresentation, createPresentationContext } from './presentation.js'
import type { DropdownProps } from './dropdown-props.js'
import { DROPDOWN_ANIMATION_COMPLETE } from './dropdown-resources.js'
import { dropdownHighlightMotion, dropdownSelectionMotion } from './dropdown-motion.js'
import { popupMotionClass, popupScrollAreaClass, popupViewportClass } from './lib/popup.js'
import { popupShape } from './lib/shape.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { Observe, ObserveTrigger } from './dropdown-composition.js'

const dropdownPosition: (
  model: typeof Model.Type,
  inputs: DropdownProps,
) => Required<Pick<DropdownProps, 'side' | 'align' | 'sideOffset' | 'alignOffset'>> =
  function dropdownPosition(model: typeof Model.Type, inputs: DropdownProps) {
    const state = model.controller
    const submenuSide = inputs.direction === 'rtl' ? 'left' : 'right'

    return {
      side: inputs.side ?? (state.sub ? submenuSide : 'bottom'),
      align: inputs.align ?? 'start',
      sideOffset: inputs.sideOffset ?? 6,
      alignOffset: inputs.alignOffset ?? (state.sub ? -4 : 0),
    }
  }

type DropdownRuntime<Key extends symbol, ConfigSchema extends DropdownConfigSchema> = ReturnType<
  typeof createDropdownComposition<Key, ConfigSchema>
>

function dropdownTrigger<Message>(
  model: typeof Model.Type,
  inputs: DropdownProps,
  h: HtmlBuilder<Message>,
) {
  const state = model.controller
  const open = state.phase === 'open'
  const presentation = resolvePresentation(inputs)

  return inputs.trigger?.(
    [
      ...childAttributes([
        h.Id(`${state.id}-trigger`),
        ...(state.sub ? [h.Role('menuitem')] : [h.Type('button')]),
        h.AriaHasPopup('menu'),
        h.AriaExpanded(open),
        h.AriaControls(`${state.id}-panel`),
        h.Disabled(state.disabled),
        h.DataAttribute('state', open ? 'open' : 'closed'),
        h.DataAttribute('direction', inputs.direction ?? 'ltr'),
        h.DataAttribute('trigger-press-event', inputs.triggerPressEvent ?? 'click'),
        h.DataAttribute('open-on-hover', String(inputs.openOnHover ?? false)),
      ]),
      ...(inputs.triggerAttributes ?? []),
    ],
    {
      context: createPresentationContext({
        ...inputs,
        hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
      }),
    },
  )
}

export function dropdownView<const Key extends symbol, ConfigSchema extends DropdownConfigSchema>(
  runtime: DropdownRuntime<Key, ConfigSchema>,
) {
  const {
    Composition: FluidDropdownComposition,
    Selected,
    Highlight,
    Focus,
    Selection,
    Scroll,
    Hover,
  } = runtime

  return FluidDropdownComposition.makeView.withInputs<DropdownProps>((model, inputs, h) => {
    const state = model.controller
    const open = state.phase === 'open'
    const presentation = resolvePresentation(inputs)
    const shape = popupShape(presentation.shape.variant)
    const trigger = dropdownTrigger(model, inputs, h)
    const position = dropdownPosition(model, inputs)

    const surfaceContext = createPresentationContext({
      ...inputs,
      surface: Math.min(presentation.surface + 2, 8),
      hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
    })

    const decorations = () => [
      ...(!model.overlaysHidden && Option.isSome(state.checkedIndices)
        ? [
            h.block(
              Selection.embedView({
                slotId: model.selection.id,
                model: model.selection,
                viewInputs: { animate: dropdownSelectionMotion(inputs.animate) },
              }),
            ),
          ]
        : []),
      ...(model.overlaysHidden
        ? []
        : [
            h.block(
              Selected.embedView({
                slotId: model.selected.id,
                model: model.selected,
                viewInputs: {
                  className: `${shape.bg} bg-active!`,
                  animate: dropdownHighlightMotion(inputs.animate, 'selected', null),
                },
              }),
            ),
          ]),
      h.block(
        Highlight.embedView({
          slotId: model.highlight.id,
          model: model.highlight,
          viewInputs: {
            className: shape.bg,
            mode: model.hover.mode,
            animate: dropdownHighlightMotion(
              inputs.animate,
              'hover',
              state.litBy === 'pointer'
                ? Option.match(state.checkedIndex, {
                    onNone: () => null,
                    onSome: (index) => rectAt(model.hover.itemRects, index) ?? null,
                  })
                : null,
            ),
          },
        }),
      ),
      ...(model.overlaysHidden
        ? []
        : [
            h.block(
              Focus.embedView({
                slotId: model.focus.id,
                model: model.focus,
                viewInputs: {
                  className: `${shape.focusRing} bg-transparent! z-20 border border-[color:var(--focus-ring,#6B97FF)]`,
                  animate: dropdownHighlightMotion(inputs.animate, 'focus', null),
                },
              }),
            ),
          ]),
    ]

    let panelClass = `relative flex flex-col w-72 max-w-full ${shape.container} p-1 select-none`

    if (!state.inline) {
      panelClass = `flex flex-col ${state.sub ? 'w-56' : 'w-72 min-w-[var(--anchor-width)]'} max-w-full max-h-[min(480px,var(--available-height))] overflow-hidden ${shape.container} select-none outline-none`
    }

    const panel = () => {
      const props: ElevatedProps<Parameters<typeof h.OnClick>[0]> = {
        context: createPresentationContext(inputs),
        offset: 2,
        shadowLevel: 3,
        className: cn(panelClass, inputs.contentClassName),
        attributes: sourceStyleAttributes(
          { pointerEvents: state.inline || open ? 'auto' : 'none' },
          [
            h.Id(`${state.id}-panel`),
            h.DataAttribute('fluid-dropdown-panel', ''),
            h.Role(state.inline ? 'group' : 'menu'),
            ...(state.inline ? [] : [h.AriaLabelledBy(`${state.id}-trigger`)]),
            h.Tabindex(-1),
            ...(inputs.contentAttributes ?? []),
          ],
        ),
        children: () => {
          const rows = h.block(
            Hover.embedView({
              slotId: model.hover.id,
              model: model.hover,
              viewInputs: {
                className: state.inline ? 'relative flex flex-col' : 'relative flex flex-col p-1',
                content: () => [
                  ...decorations(),
                  ...inputs.content({
                    context: surfaceContext,
                    id: state.id,
                    activeIndex: model.hover.activeIndex,
                    multiple: Option.isSome(state.checkedIndices),
                    inMenu: !state.inline,
                    ...Option.match(state.checkedIndex, {
                      onNone: () => ({}),
                      onSome: (checkedIndex) => ({ checkedIndex }),
                    }),
                    ...Option.match(state.checkedIndices, {
                      onNone: () => ({}),
                      onSome: (checkedIndices) => ({ checkedIndices }),
                    }),
                  }),
                ],
              },
            }),
          )

          return state.inline
            ? [rows]
            : [
                h.block(
                  Scroll.embedView({
                    slotId: model.scroll.id,
                    model: model.scroll,
                    viewInputs: {
                      className: popupScrollAreaClass,
                      viewportClassName: cn(popupViewportClass, 'scroll-fade'),
                      children: [],
                      content: () => [rows],
                    },
                  }),
                ),
              ]
        },
      }

      return Elevated(
        inputs.contentRender === undefined
          ? props
          : {
              ...props,
              render: (attributes, children) =>
                inputs.contentRender?.(
                  attributes.flatMap<ChildAttribute>((attribute) =>
                    '_tag' in attribute ? childAttributes([attribute]) : [attribute],
                  ),
                  children,
                ) ?? h.div(attributes, children),
            },
        h,
      )
    }

    const content =
      state.inline || (state.mounted && state.phase !== 'absent')
        ? h.div(
            [
              h.Class(cn(state.inline ? '' : 'z-popover')),
              h.Id(state.id),
              h.Style({ pointerEvents: state.inline || open ? 'auto' : 'none' }),
              h.DataAttribute('state', open ? 'open' : 'closed'),
              h.DataAttribute('generation', String(state.generation)),
              h.DataAttribute('requested-side', position.side),
              h.DataAttribute('requested-align', position.align),
              h.DataAttribute('side-offset', String(position.sideOffset)),
              h.DataAttribute('align-offset', String(position.alignOffset)),
              h.DataAttribute('direction', inputs.direction ?? 'ltr'),
              h.DataAttribute('trigger-press-event', inputs.triggerPressEvent ?? 'click'),
              h.DataAttribute('open-on-hover', String(inputs.openOnHover ?? false)),
              h.DataAttribute('sub', String(state.sub)),
              h.DataAttribute('restore-focus', String(state.restoreFocus)),
              h.DataAttribute('opening-edge', state.openingEdge),
              h.DataAttribute('opening-input', state.litBy),
              h.DataAttribute('opened-by-hover', String(state.openedByHover)),
              h.DataAttribute('typeahead-query', state.search),
              h.OnMount(
                Observe({
                  id: state.id,
                  rootId: state.rootId,
                  parentId: state.parentId,
                  inline: state.inline,
                  side: position.side,
                  align: position.align,
                  sideOffset: position.sideOffset,
                  alignOffset: position.alignOffset,
                }),
              ),
            ],
            [
              state.inline
                ? panel()
                : inputs.animate(
                    h.div(
                      [h.Class(cn('z-[var(--z-popover,60)] outline-none', popupMotionClass))],
                      [panel()],
                    ),
                    {
                      initial: { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
                      animate: open
                        ? { opacity: 1, y: 0, scaleY: 1 }
                        : { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
                      transition: open ? spring.fast : spring.fast.exit,
                      onAnimationComplete: (element) => {
                        element.parentElement?.dispatchEvent(
                          new CustomEvent(DROPDOWN_ANIMATION_COMPLETE),
                        )
                      },
                    },
                  ),
            ],
          )
        : h.empty

    return h.div(
      [
        h.Class(inputs.className ?? ''),
        h.OnMount(
          ObserveTrigger({
            id: state.id,
            sub: state.sub,
            direction: inputs.direction ?? 'ltr',
          }),
        ),
        ...(inputs.attributes ?? []),
      ],
      [trigger ?? h.empty, content],
    )
  })
}
