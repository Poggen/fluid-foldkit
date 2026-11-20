/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import type { Model } from './block.js'
import type { PartContext } from './parts-contracts.js'
import { isOpen } from './block.js'

/** Explicit read scopes replace React's ambient contexts without a second store. */
export const getContext = (model: Model) => ({
  id: model.id,
  open: model.open,
  activeIndex: model.index,
  itemCount: model.items.length,
  loop: model.options.loop ?? false,
  dir: model.options.dir ?? 'ltr',
})
export const getItemContext = (context: PartContext | null, index: number) =>
  context === null
    ? null
    : { index, active: index === context.index, id: `${context.id}-panel-${index}` }
export const getTriggerContext = (context: PartContext | null, index: number, id?: string) =>
  context === null
    ? null
    : {
        open: context.open,
        active: context.open && context.index === index,
        id: id ?? `${context.id}-trigger-${index}`,
        morphTarget:
          context.open &&
          index ===
            (context.morphTo === 'origin'
              ? (context.openerIndex ?? 0)
              : context.morphTo === 'closest'
                ? context.morphTargetIndex
                : context.index),
      }
export const getMediaContext = (context: PartContext | null, index: number) =>
  getItemContext(context, index)
export const getStageContext = (context: PartContext | null) =>
  context === null ? null : { id: context.id, open: context.open, activeIndex: context.index }

/** The handle produces connected parent Steps. The parent Runtime remains the execution owner. */
export function createHandle<Open, Close, Navigate>(binding: {
  readonly requestOpen: (input: { readonly index?: number; readonly triggerId?: string }) => Open
  readonly requestClose: () => Close
  readonly requestNavigate: (input: {
    readonly index: number
    readonly source?: 'imperative'
  }) => Navigate
}) {
  return {
    open: (index?: number, options?: { readonly triggerId?: string }) =>
      binding.requestOpen({ ...(index === undefined ? {} : { index }), ...options }),
    close: () => binding.requestClose(),
    goTo: (index: number) => binding.requestNavigate({ index, source: 'imperative' }),
    isOpen,
  }
}

/** Detached zoom controls, expressed as connected parent Steps rather than mutable refs. */
export function createZoomHandle<Zoom, In, Out, Reset>(binding: {
  readonly requestZoom: (input: {
    readonly zoom: number
    readonly rapid?: boolean
    readonly focalX?: number
    readonly focalY?: number
  }) => Zoom
  readonly requestZoomIn: () => In
  readonly requestZoomOut: () => Out
  readonly requestZoomReset: (input: { readonly rapid?: boolean }) => Reset
}) {
  return {
    zoomIn: () => binding.requestZoomIn(),
    zoomOut: () => binding.requestZoomOut(),
    zoomTo: (
      zoom: number,
      options?: { readonly rapid?: boolean; readonly dx?: number; readonly dy?: number },
    ) =>
      binding.requestZoom({
        zoom,
        ...(options?.rapid === undefined ? {} : { rapid: options.rapid }),
        ...(options?.dx === undefined ? {} : { focalX: options.dx }),
        ...(options?.dy === undefined ? {} : { focalY: options.dy }),
      }),
    reset: (rapid?: boolean) => binding.requestZoomReset(rapid === undefined ? {} : { rapid }),
  }
}
