// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import type { DialogContentProps } from './dialog-parts.js'
import { Button } from './button.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { DialogContent, dialogContentClass } from './dialog-parts.js'
import { resolvePresentation } from './presentation.js'
import { createDialogContentContext } from './dialog-presentation.js'
import type { MotionOptions } from './motion.js'
import type { DialogContext } from './dialog-contracts.js'
import type { dialogComposition } from './dialog-composition.js'
import { dialogContract, Portal, Observe } from './dialog-definition.js'
import { DIALOG_MOTION_COMPLETE } from './dialog-observation.js'

export const dialogView = <const Key extends symbol>(
  Composition: ReturnType<typeof dialogComposition<Key>>,
) =>
  Composition.makeView.withInputs((model, inputs, h) => {
    const { Message } = dialogContract
    const open = model.isOpen
    const visible = model.mounted && model.phase !== 'Closed'

    const hostAttributes = childAttributes([
      h.Class(
        'w-full h-full max-w-full max-h-full p-0 [border:none] bg-transparent text-inherit inset-0 pointer-events-none [&_[data-fluid-dialog-panel]]:pointer-events-auto [&_[data-fluid-dialog-backdrop]]:pointer-events-auto z-(--z-modal,50) m-0 overflow-visible',
      ),
      h.Id(model.id),
      h.Open(visible),
      h.AriaLabelledBy(`${model.id}-dialog-title`),
      ...(inputs.hasDescription === true
        ? [h.AriaDescribedBy(`${model.id}-dialog-description`)]
        : []),
      ...(model.modal && visible ? [h.AriaModal(true)] : []),
      h.DataAttribute('fluid-dialog', ''),
      h.DataAttribute('state', open ? 'open' : 'closed'),
      h.DataAttribute('dialog-phase', model.phase),
      h.DataAttribute('dialog-generation', String(model.generation)),
      h.DataAttribute('dialog-modal', String(model.modal)),
      h.DataAttribute('callbacks-id', inputs.callbacksId ?? ''),
      h.DataAttribute(
        'focus-selector',
        Option.getOrElse(model.focusSelector, () => ''),
      ),
      h.DataAttribute(
        'return-focus-selector',
        Option.getOrElse(model.returnFocusSelector, () => ''),
      ),
      h.Style({ position: model.scoped ? 'absolute' : 'fixed' }),
      h.OnMount(Observe({ id: model.id })),
    ])

    const controls = {
      closeButton: childAttributes([
        h.Type('button'),
        h.OnClick(Message.ObservedOpenIntent({ open: false })),
      ]),
      panel: childAttributes([h.Id(`${model.id}-panel`)]),
    }

    const render = () => {
      if (!visible) {
        return h.dialog(hostAttributes, [])
      }

      const { size: contentSize, ...inherited } = inputs
      const presentationProps = { ...inherited, ...inputs.presentation }
      const presentation = resolvePresentation(presentationProps)
      const position = inputs.position ?? 'center'
      const { scoped } = model
      const transition = open ? spring.slow : spring.slow.exit

      const close = [
        ...controls.closeButton,
        ...childAttributes([h.DataAttribute('fluid-dialog-close', '')]),
      ]

      const context: DialogContext = {
        id: model.id,
        open,
        titleId: `${model.id}-dialog-title`,
        descriptionId: `${model.id}-dialog-description`,
        close,
        initialFocus: childAttributes([h.DataAttribute('fluid-dialog-initial-focus', '')]),
        presentation: {
          context: createDialogContentContext(inputs),
        },
      }

      const makePanelAttributes = () => [
        ...controls.panel,
        ...childAttributes([
          h.Tabindex(-1),
          h.AriaLabelledBy(context.titleId),
          ...(inputs.hasDescription === true ? [h.AriaDescribedBy(context.descriptionId)] : []),
          ...(inputs.hasDescription === false
            ? [h.DataAttribute('description-override', 'none')]
            : []),
          h.DataAttribute('fluid-dialog-panel', ''),
          h.DataAttribute(open ? 'open' : 'closed', ''),
          ...(model.phase === 'Opening' ? [h.DataAttribute('starting-style', '')] : []),
          ...(open ? [] : [h.DataAttribute('ending-style', '')]),
        ]),
        ...(inputs.contentAttributes ?? []),
      ]

      const panelAttributes = makePanelAttributes()

      const makeChildren = () => [
        ...inputs.content(context),
        ...(inputs.showCloseButton === false
          ? []
          : [
              Button(
                {
                  ...context.presentation,
                  variant: 'ghost',
                  buttonSize: 'icon-sm',
                  className: 'absolute right-3 top-3',
                  attributes: close,
                  children: [presentation.icons.x({}, h), h.span([h.Class('sr-only')], ['Close'])],
                },
                h,
              ),
            ]),
      ]

      const children = makeChildren()

      const defaultPanel = () => {
        type Requirements =
          | Mount.RequirementsOf<typeof Portal>
          | Mount.RequirementsOf<typeof Observe>

        let properties: DialogContentProps<typeof Message.Type, Requirements> = {
          ...inputs,
          presentation: presentationProps,
          scoped,
          className: inputs.contentClassName ?? '',
          attributes: panelAttributes,
          children,
        }

        if (contentSize !== undefined) {
          properties = { ...properties, size: contentSize }
        }

        const custom = inputs.contentRender

        if (custom !== undefined) {
          return custom(
            [...childAttributes([h.Class(dialogContentClass(properties))]), ...panelAttributes],
            children,
          )
        }

        return DialogContent(properties, h)
      }

      const panelNode =
        inputs.panelRender === undefined
          ? defaultPanel()
          : inputs.panelRender(panelAttributes, children)

      const makePanelMotion = (): MotionOptions =>
        inputs.panelMotion?.(open) ?? {
          initial: {
            opacity: 0,
            scale: 0.97,
            x: '-50%',
            y: position === 'top' ? 0 : '-50%',
          },
          animate: {
            opacity: open ? 1 : 0,
            scale: open ? 1 : 0.97,
            x: '-50%',
            y: position === 'top' ? 0 : '-50%',
          },
          transition,
          reducedMotion: presentation.reducedMotion,
        }

      const panelMotion = makePanelMotion()

      const animatedContent = inputs.animate(panelNode, {
        ...panelMotion,
        onAnimationComplete: (element) => {
          panelMotion.onAnimationComplete?.(element)
          const panel = element.closest('[data-fluid-dialog-panel]') ?? element
          panel.dispatchEvent(
            new CustomEvent(DIALOG_MOTION_COMPLETE, { bubbles: true, detail: model.generation }),
          )
        },
      })

      const renderBackdrop = () => {
        const backdropAttributes = childAttributes([
          h.DataAttribute('fluid-dialog-backdrop', ''),
          h.Role('presentation'),
          h.DataAttribute(open ? 'open' : 'closed', ''),
        ])

        const backdropNode =
          inputs.backdropRender?.(backdropAttributes) ??
          h.div([
            ...backdropAttributes,
            h.Class(
              cn(
                scoped ? 'absolute' : 'fixed',
                'inset-0 z-[var(--z-overlay,40)] bg-black/40 dark:bg-black/80',
              ),
            ),
          ])

        const motion: MotionOptions = inputs.backdropMotion?.(open) ?? {
          initial: { opacity: 0 },
          animate: { opacity: open ? 1 : 0 },
          transition,
          reducedMotion: presentation.reducedMotion,
        }

        return inputs.animate(backdropNode, {
          ...motion,
          onAnimationComplete: (element) => {
            motion.onAnimationComplete?.(element)
            element.dispatchEvent(
              new CustomEvent(DIALOG_MOTION_COMPLETE, { bubbles: true, detail: model.generation }),
            )
          },
        })
      }

      const backdrop = renderBackdrop()

      return h.dialog(
        [
          ...hostAttributes,
          h.DataAttribute(
            'parent-dialog',
            Option.getOrElse(model.parentId, () => ''),
          ),
        ],
        [backdrop, animatedContent],
      )
    }

    const triggerState = () => (open ? [h.DataAttribute('popup-open', '')] : [])

    const trigger = inputs.trigger?.([
      ...childAttributes([
        h.Id(`${model.id}-trigger`),
        h.DataAttribute('fluid-dialog-trigger', model.id),
        h.Type('button'),
        h.AriaHasPopup('dialog'),
        h.AriaExpanded(open),
        h.AriaControls(model.id),
        ...triggerState(),
        h.OnClick(Message.ObservedOpenIntent({ open: !open })),
      ]),
      ...(inputs.triggerAttributes ?? []),
    ])

    return h.div(
      [h.Class(inputs.className ?? '')],
      [
        trigger ?? null,
        h.div(
          [
            h.Class('contents'),
            h.OnMount(Portal({ id: model.id, containerId: inputs.portalContainerId ?? '' })),
          ],
          [render()],
        ),
      ],
    )
  })
