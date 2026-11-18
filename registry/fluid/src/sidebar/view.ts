import { sourceStyleAttributes } from '../lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import { spring } from '../lib/springs.js'
import { cn } from '../lib/utils.js'
import { surfaceClasses } from '../lib/surface-classes.js'
import { createPresentationContext, resolvePresentation } from '../presentation.js'
import { isDialogOpen } from '../dialog.js'
import { sidebarBreakpointClasses } from '../sidebar-breakpoints.js'
import { Message } from './definition.js'
import type { Model, SidebarRenderInfo, SidebarViewInputs } from './definition.js'
import { SidebarRailTooltipContent, sidebarShortcutKey } from '../sidebar-tooltip-content.js'
import { sidebarRailPresent } from './rail.js'
import { SidebarComposition, Observe, Mobile, PeekPresence, RailTooltips } from './composition.js'

const sidebarWidthTransition = (model: typeof Model.Type, shown: boolean, widthShown: boolean) => {
  if (model.resizing) {
    if (model.dragFlip === 0) {
      return { duration: 0 }
    }

    return shown ? spring.moderate : spring.moderate.exit
  }

  return widthShown ? spring.slow : spring.slow.exit
}

export const sidebarView = SidebarComposition.makeView.withInputs<SidebarViewInputs>(
  (model, inputs, h) => {
    const { options } = model
    const mobileOpen = isDialogOpen(model.dialog)
    const { shape, size, surface, reducedMotion } = resolvePresentation(inputs)
    const ambientContext = createPresentationContext(inputs)
    const floatingContext = createPresentationContext({
      context: ambientContext,
      surface: Math.min(surface + 1, 8),
    })
    const sheetContext = createPresentationContext({
      context: ambientContext,
      surface: Math.min(surface + 2, 8),
    })
    const floatingSurface = resolvePresentation({ context: floatingContext }).surface
    const sheetSurface = resolvePresentation({ context: sheetContext }).surface
    const railKey = `${options.id}-rail`
    const shown = options.collapsible === 'none' || model.open

    const info: SidebarRenderInfo = {
      open: options.collapsible === 'none' || (model.mobile ? mobileOpen : shown),
      mobile: model.mobile,
      peeking: model.peeking,
      side: options.side,
      ownerId: options.id,
      shortcut: options.shortcut,
      shortcutKey: sidebarShortcutKey(options.shortcut, options.side),
      trigger: childAttributes([
        h.Type('button'),
        h.DataAttribute('sidebar-owner', options.id),
        h.AriaLabel('Toggle sidebar'),
        h.AriaExpanded(model.mobile ? mobileOpen : shown),
        h.OnClick(Message.Toggled()),
      ]),
    }

    const visible = shown || model.peeking
    const widthShown = options.collapsible === 'none' || (shown && !model.mobile)
    const right = options.side === 'right'
    const floating = options.variant === 'floating'
    const peekEnabled = options.peek !== 'none' && !shown && !model.resizing

    const widthTransition = sidebarWidthTransition(model, shown, widthShown)
    const offscreenX = right ? '100%' : '-100%'

    const peekSides = right
      ? { floating: 'right-2', fixed: 'right-0' }
      : { floating: 'left-2', fixed: 'left-0' }

    const panel = (overlay = false) =>
      h.div(
        [
          h.DataAttribute('sidebar-panel', ''),
          h.DataAttribute('sidebar', 'sidebar'),
          h.Class(
            cn(
              'flex h-full w-full min-h-0 flex-col',
              !overlay &&
                options.collapsible !== 'none' &&
                floating &&
                surfaceClasses(floatingSurface, 3),
              !overlay && options.collapsible !== 'none' && floating && shape.container,
              !overlay &&
                inputs.bordered !== false &&
                options.variant === 'sidebar' &&
                (right ? 'border-l border-border' : 'border-r border-border'),
              inputs.panelClassName,
            ),
          ),
          h.Style(
            options.variant === 'sidebar'
              ? {}
              : {
                  '--rail-fade-start': `${shape.containerRadius}px`,
                  '--rail-fade-end': `${shape.containerRadius + 24}px`,
                },
          ),
        ],
        inputs.content(
          { ...info, occurrence: 'desktop', idPrefix: `${options.id}-desktop` },
          overlay || (floating && options.collapsible !== 'none')
            ? floatingContext
            : ambientContext,
        ),
      )

    const renderRail = () =>
      h.block(
        RailTooltips.embedView({
          slotId: 'rail-trigger',
          model: model.railTooltips,
          viewInputs: {
            part: 'triggers',
            render: ({ tooltip }) => tooltip(railKey),
            renderTrigger: (_key, { button }) =>
              button(
                childAttributes([
                  h.Type('button'),
                  h.Tabindex(-1),
                  h.AriaLabel('Resize or collapse sidebar'),
                  h.DataAttribute('sidebar-rail', ''),
                  h.DataAttribute('sidebar', 'rail'),
                  h.Style({
                    '--rail-fade-start': `${shape.containerRadius}px`,
                    '--rail-fade-end': `${shape.containerRadius + 24}px`,
                  }),
                  h.Class(
                    cn(
                      'absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:w-px after:bg-transparent hover:after:bg-foreground/25 after:transition-colors after:duration-80',
                      right ? 'left-0 after:left-0' : 'right-0 after:right-0',
                      Option.contains(model.railTooltipOpen, true) && 'after:bg-foreground/25',
                      floating &&
                        (right ? 'left-1 after:left-[3.5px]' : 'right-1 after:right-[3.5px]'),
                      options.variant !== 'sidebar' &&
                        'after:inset-y-2 after:[mask-image:linear-gradient(to_bottom,transparent_var(--rail-fade-start),black_var(--rail-fade-end),black_calc(100%-var(--rail-fade-end)),transparent_calc(100%-var(--rail-fade-start)))]',
                    ),
                  ),
                ]),
                [],
              ),
          },
        }),
      )

    const renderDesktop = () =>
      inputs.animate(
        h.div(
          [
            h.DataAttribute('slot', 'sidebar'),
            h.DataAttribute('state', shown ? 'expanded' : 'collapsed'),
            h.DataAttribute('side', options.side),
            h.DataAttribute('variant', options.variant),
            h.Class(
              cn(
                options.collapsible === 'none'
                  ? 'peer sticky top-0 flex h-svh shrink-0 flex-col'
                  : 'peer shrink-0 sticky top-0 h-svh',
                options.collapsible !== 'none' &&
                  sidebarBreakpointClasses(options.mobileBreakpoint, model.mobile, model.mounted),
                inputs.sidebarClassName,
                right && 'order-last',
                options.collapsible !== 'none' &&
                  (peekEnabled || model.pinHold ? 'z-[var(--z-sticky,30)]' : 'overflow-hidden'),
              ),
            ),
          ],
          [
            ...(options.collapsible === 'none'
              ? [panel()]
              : peekEnabled
                ? [
                    h.block(
                      PeekPresence.embedView({
                        slotId: 'peek',
                        model: model.peekPresence,
                        viewInputs: {
                          className: cn(
                            'absolute inset-y-2 z-50 flex flex-col overflow-hidden',
                            peekSides[floating ? 'floating' : 'fixed'],
                            shape.container,
                            surfaceClasses(floatingSurface, 3),
                          ),
                          attributes: childAttributes([
                            h.DataAttribute('sidebar', 'peek'),
                            h.Style({
                              width: `calc(var(--sidebar-width) - ${floating ? '1rem' : '0.5rem'})`,
                            }),
                          ]),
                          animate: (node, present) =>
                            inputs.animate(node, {
                              initial: { x: right ? '108%' : '-108%' },
                              animate: { x: 0 },
                              exit: {
                                x: right ? '108%' : '-108%',
                                transition: spring.moderate.exit,
                              },
                              transition: spring.moderate,
                              present,
                            }),
                          content: () => panel(true),
                        },
                      }),
                    ),
                  ]
                : [
                    inputs.animate(
                      h.div(
                        [
                          h.Class(
                            cn(
                              'flex h-full flex-col',
                              floating && 'p-2',
                              options.variant === 'inset' && 'py-2',
                              'top-0 bottom-0 w-(--sidebar-width)',
                              right ? 'right-0' : 'left-0',
                              'absolute',
                            ),
                          ),
                        ],
                        [panel(), ...(options.rail ? [renderRail()] : [])],
                      ),
                      {
                        initial: false,
                        animate: { x: visible ? 0 : offscreenX },
                        transition: widthTransition,
                      },
                    ),
                  ]),
            ...(peekEnabled
              ? [
                  h.button(
                    [
                      h.Type('button'),
                      h.AriaLabel('Peek sidebar'),
                      h.AriaExpanded(model.peeking),
                      h.DataAttribute('sidebar-peek-strip', ''),
                      h.OnClick(Message.ChangedPeek({ open: true })),
                      h.Class(
                        cn(
                          'group/peek-strip absolute inset-y-0 z-40 w-3 cursor-pointer outline-none',
                          right ? 'right-0' : 'left-0',
                        ),
                      ),
                    ],
                    [
                      h.span([
                        h.AriaHidden(true),
                        h.Class(
                          cn(
                            'absolute inset-y-0 w-px bg-border opacity-0 transition-opacity duration-80 group-hover/peek-strip:opacity-100 group-focus-visible/peek-strip:opacity-100',
                            right ? 'right-0' : 'left-0',
                          ),
                        ),
                      ]),
                    ],
                  ),
                ]
              : []),
          ],
        ),
        {
          initial: false,
          animate: { width: widthShown ? model.width : '0rem' },
          transition: widthTransition,
        },
      )

    const renderInset = () =>
      h.main(
        [
          h.DataAttribute('slot', 'sidebar-inset'),
          h.Class(
            cn(
              'relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background',
              'peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:peer-data-[side=left]:ml-0 peer-data-[variant=inset]:peer-data-[side=right]:mr-0',
              'peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=left]:ml-2 peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=right]:mr-2',
              'transition-[margin] duration-80',
              shape.variant === 'pill'
                ? 'peer-data-[variant=inset]:rounded-3xl'
                : shape.variant === 'sharp'
                  ? 'peer-data-[variant=inset]:rounded-[1px]'
                  : 'peer-data-[variant=inset]:rounded-xl',
              'peer-data-[variant=inset]:bg-surface-2 peer-data-[variant=inset]:shadow-surface-2',
              inputs.insetClassName,
            ),
          ),
        ],
        inputs.inset(info, ambientContext),
      )

    const renderMobile = () =>
      options.collapsible === 'none'
        ? h.empty
        : h.block(
            Mobile.embedView({
              slotId: 'mobile',
              model: model.dialog,
              viewInputs: {
                ...inputs,
                size: 'lg',
                presentation: { shape: shape.variant, size: size.variant, surface },
                showCloseButton: false,
                hasDescription: false,
                className: 'contents',
                panelRender: (attributes, children, key) =>
                  h.keyed('div')(
                    key ?? `${options.id}-mobile-panel`,
                    sourceStyleAttributes({ width: options.widthMobile }, [
                      h.Class(
                        cn(
                          'fixed inset-y-0 z-[var(--z-modal,50)] flex flex-col overflow-hidden outline-none text-foreground',
                          surfaceClasses(sheetSurface, 3),
                          right ? 'right-0' : 'left-0',
                          'pointer-events-auto max-w-[calc(100vw-32px)]',
                        ),
                      ),
                      ...attributes,
                      h.Tabindex(-1),
                      h.DataAttribute('sidebar-mobile-panel', ''),
                      h.DataAttribute('sidebar', 'sidebar'),
                      h.DataAttribute('mobile', 'true'),
                      h.DataAttribute('side', options.side),
                    ]),
                    children,
                  ),
                backdropRender: (attributes) =>
                  h.div([
                    ...attributes,
                    h.Class('fixed inset-0 bg-black/40 dark:bg-black/80 z-[var(--z-overlay,40)]'),
                  ]),
                panelMotion: (open) => ({
                  initial: { x: offscreenX },
                  animate: { x: open ? 0 : offscreenX },
                  transition: open ? spring.moderate : spring.moderate.exit,
                }),
                backdropMotion: (open) => ({
                  initial: { opacity: 0 },
                  animate: { opacity: open ? 1 : 0 },
                  transition: open ? { duration: spring.moderate.duration } : spring.moderate.exit,
                }),
                content: (context) => [
                  h.h2([h.Id(context.titleId), h.Class('sr-only')], [inputs.title ?? 'Sidebar']),
                  h.button(
                    [...context.close, h.Class('sr-only'), h.AriaLabel('Close sidebar')],
                    ['Close sidebar'],
                  ),
                  ...inputs.mobileContent(
                    { ...info, occurrence: 'mobile', idPrefix: `${options.id}-mobile` },
                    sheetContext,
                  ),
                ],
              },
            }),
          )

    return h.block(
      RailTooltips.embedView({
        slotId: 'rail-popups',
        model: model.railTooltips,
        viewInputs: {
          part: 'popups',
          animate: inputs.animate,
          entries: sidebarRailPresent(model)
            ? [{ key: railKey, shapeClass: shape.item, reducedMotion }]
            : [],
          renderContent: () => SidebarRailTooltipContent(info.shortcutKey, h),
          renderPopups: (popups) =>
            h.div(
              [
                h.OnMount(
                  Observe({
                    breakpoint: options.mobileBreakpoint,
                    shortcut: options.shortcut,
                    side: options.side,
                    persist: options.persist,
                  }),
                ),
                h.DataAttribute('slot', 'sidebar-wrapper'),
                h.DataAttribute('sidebar-owner', options.id),
                h.DataAttribute('sidebar-open', String(shown)),
                h.DataAttribute('sidebar-peeking', String(model.peeking)),
                h.DataAttribute('sidebar-peek', options.peek),
                h.DataAttribute(
                  'sidebar-pin-hold',
                  model.pinHold ? String(model.pinGeneration) : '',
                ),
                h.DataAttribute('sidebar-drag-flip', String(model.dragFlip)),
                ...(Option.isNone(model.persisted)
                  ? []
                  : [
                      h.DataAttribute(
                        'sidebar-persist-value',
                        String(Option.getOrThrow(model.persisted)),
                      ),
                    ]),
                h.Style({
                  '--sidebar-width': model.width,
                  '--sidebar-width-mobile': options.widthMobile,
                }),
                h.Class(
                  cn(
                    'group/sidebar-wrapper relative flex min-h-svh w-full',
                    options.variant === 'inset' && 'bg-background',
                    inputs.className,
                  ),
                ),
              ],
              [renderDesktop(), renderInset(), renderMobile(), ...popups],
            ),
        },
      }),
    )
  },
)
