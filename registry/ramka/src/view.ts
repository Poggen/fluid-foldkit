/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Option, Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { LightboxBlock, Model } from './block.js'
import type { PartContext } from './parts-contracts.js'
import * as Part from './parts.js'
import { LightboxComposition } from './composition.js'
import { Observe } from './host.js'
import { resolveViewTransitionTiming } from './morph/vt-timing.js'
import { minZoom, maxZoom } from './state.js'

function makeParts<Message, Requirements>(
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  let groupNumber = 0
  const groupContext = () => ({
    ...context,
    thumbnailGroupId: `${context.id}-thumbnail-group-${groupNumber++}`,
  })
  return {
    Trigger: (props: Parameters<typeof Part.Trigger>[0]) => Part.Trigger(props, context, h),
    Portal: (props: Parameters<typeof Part.Portal>[0]) => Part.Portal(props, context, h),
    Content: (props: Parameters<typeof Part.Content>[0]) => Part.Content(props, context, h),
    Backdrop: (props: Parameters<typeof Part.Backdrop>[0]) => Part.Backdrop(props, context, h),
    Close: (props: Parameters<typeof Part.Close>[0]) => Part.Close(props, context, h),
    Stage: (props: Parameters<typeof Part.Stage>[0]) => Part.Stage(props, context, h),
    Slides: (props: Parameters<typeof Part.Slides>[0]) => Part.Slides(props, context, h),
    Slide: (props: Parameters<typeof Part.Slide>[0]) => Part.Slide(props, context, h),
    Item: (props: Parameters<typeof Part.Item>[0]) => Part.Item(props, context, h),
    Media: (props: Parameters<typeof Part.Media>[0]) => Part.Media(props, context, h),
    Previous: (props: Parameters<typeof Part.Previous>[0]) => Part.Previous(props, context, h),
    Next: (props: Parameters<typeof Part.Next>[0]) => Part.Next(props, context, h),
    Counter: (props: Parameters<typeof Part.Counter>[0]) => Part.Counter(props, context, h),
    Caption: (props: Parameters<typeof Part.Caption>[0]) => Part.Caption(props, context, h),
    ThumbnailGroup: (props: Parameters<typeof Part.ThumbnailGroup>[0]) =>
      Part.ThumbnailGroup(props, groupContext(), h),
    Thumbnail: (props: Parameters<typeof Part.Thumbnail>[0]) => Part.Thumbnail(props, context, h),
    ThumbnailStrip: (props: Parameters<typeof Part.ThumbnailStrip>[0]) =>
      Part.ThumbnailStrip(props, context, h),
    ThumbnailStripTrack: (props: Parameters<typeof Part.ThumbnailStripTrack>[0]) =>
      Part.ThumbnailStripTrack(props, groupContext(), h),
    Zoom: (props: Parameters<typeof Part.Zoom>[0]) => Part.Zoom(props, context, h),
    ZoomIn: (props: Parameters<typeof Part.ZoomIn>[0]) => Part.ZoomIn(props, context, h),
    ZoomOut: (props: Parameters<typeof Part.ZoomOut>[0]) => Part.ZoomOut(props, context, h),
    CSPProvider: (props: Parameters<typeof Part.CSPProvider>[0]) =>
      Part.CSPProvider(props, context, h),
  }
}
export type Parts = ReturnType<typeof makeParts>

export const view = LightboxComposition.makeView.withInputs((model, inputs, h) => {
  const { Message } = LightboxBlock
  const timing = resolveViewTransitionTiming(model.options.viewTransition)
  const caption = model.items[model.index]?.caption
  const present =
    model.phase === 'Preparing' ||
    model.phase === 'Opening' ||
    model.phase === 'Open' ||
    (model.phase === 'Closing' && (model.open || model.retainedPortal))
  const context: PartContext = {
    id: model.id,
    open: model.open,
    nativeOpen: model.open || model.retainedPortal || model.phase === 'Preparing',
    index: model.index,
    count: model.items.length,
    dir: model.options.dir ?? 'ltr',
    loop: model.options.loop ?? false,
    caption: inputs.caption?.(model.index) ?? (caption === undefined ? undefined : [caption]),
    captionRegistryEmpty:
      inputs.caption === undefined && !model.items.some((item) => item.caption !== undefined),
    placeholderIndices: model.placeholderIndices,
    mounted: present,
    keepMounted: model.options.keepMounted ?? false,
    parked: !present,
    preparing: model.phase === 'Preparing' || (model.phase === 'Closing' && model.retainedPortal),
    morphTo: model.options.morphTo ?? 'active',
    ...(Option.isSome(model.zoomAnimationTarget)
      ? {
          zoomAnimationTarget: model.zoomAnimationTarget.value.zoom,
          zoomAnimationChangesZoom: model.zoomAnimationTarget.value.changesZoom,
          zoomAnimationX: model.zoomAnimationTarget.value.x,
          zoomAnimationY: model.zoomAnimationTarget.value.y,
        }
      : {}),
    zooming: model.gestureZooming,
    dragging: model.dragging,
    zoom: model.zoom,
    x: model.x,
    y: model.y,
    minZoom: minZoom(model),
    maxZoom: maxZoom(model),
    zoomBounds: model.items.map((item, index) => ({
      minZoom: Math.max(0.1, item.zoom?.minZoom ?? model.options.minZoom ?? 1),
      maxZoom: Math.max(
        item.zoom?.minZoom ?? model.options.minZoom ?? 1,
        item.zoom?.maxZoom ?? model.options.maxZoom ?? model.autoMaxZooms[index] ?? 4,
      ),
    })),
    ssr: model.initialPaint,
    zoomAvailable: inputs.hasZoom ?? model.hasZoom,
    preload: model.options.preload === 'all' ? Infinity : (model.options.preload ?? 1),
    inSlides: inputs.render === undefined,
    ...(model.options.dir === undefined ? {} : { dirAttribute: model.options.dir }),
    vtDuration: `${timing.duration}ms`,
    vtEasing: timing.cssEasing,
    vtRootEasing: timing.cssRootEasing,
    focusedThumbnailGroup: model.focusedThumbnailGroup,
    thumbnailStripScrubbing: model.thumbnailScrubbing,
    thumbnailStripPositioned: model.thumbnailPositioned,
    hasThumbnails: inputs.hasThumbnails ?? (inputs.render === undefined || model.hasThumbnails),
    morphTargetId: model.morphTargetId,
    morphTargetIndex:
      model.triggers.find((trigger) => trigger.id === model.morphTargetId)?.index ??
      (model.options.morphTo === 'origin' ? model.origin : model.index),
    direction: model.direction,
    openerIndex: model.origin,
    openerId: model.triggerId || '__no-opening-trigger__',
    pulling:
      model.open &&
      model.phase !== 'Closing' &&
      model.pullActive &&
      Option.isNone(model.pullAnimation),
    pullSnapping: Option.isSome(model.pullAnimation),
    ...(Option.isSome(model.pullAnimation)
      ? {
          pullSnapDuration: `${model.pullAnimation.value.duration}ms`,
          pullSnapEasing: model.pullAnimation.value.easing,
        }
      : {}),
    pullDismissing: model.phase === 'Closing' && model.pullActive,
    pullProgress: Option.isSome(model.pullAnimation) ? 0 : model.pullProgress,
    contentAttributes: childAttributes([h.OnCancel(Message.Dismissed())]),
    openAt: (index, triggerId) =>
      childAttributes([
        h.DataAttribute('ramka-action', 'open'),
        h.DataAttribute('ramka-index', String(index)),
        h.DataAttribute('ramka-trigger-id', triggerId ?? `${model.id}-trigger-${index}`),
      ]),
    close: childAttributes([h.DataAttribute('ramka-action', 'close')]),
    navigate: (index, source) =>
      childAttributes([
        h.DataAttribute('ramka-action', 'navigate'),
        h.DataAttribute('ramka-index', String(index)),
        h.DataAttribute('ramka-source', source ?? 'thumbnail'),
      ]),
    previous: childAttributes([h.DataAttribute('ramka-action', 'previous')]),
    next: childAttributes([h.DataAttribute('ramka-action', 'next')]),
    zoomIn: childAttributes([h.DataAttribute('ramka-action', 'zoom-in')]),
    zoomOut: childAttributes([h.DataAttribute('ramka-action', 'zoom-out')]),
    resetZoom: childAttributes([h.DataAttribute('ramka-action', 'zoom-reset')]),
  }
  const parts = makeParts(context, h)
  const custom = inputs.render
  const body = custom
    ? custom(parts, context)
    : h.div(
        [],
        [
          h.div(
            [h.Class('ramka-triggers')],
            model.items.map((item, index) =>
              parts.Trigger({
                index,
                children: inputs.trigger?.(index, {
                  active: index === model.index,
                  open: model.open,
                }) ?? [item.alt ?? item.caption ?? String(index + 1)],
              }),
            ),
          ),
          !present && !model.options.keepMounted
            ? null
            : parts.Portal({
                children: [
                  parts.Backdrop({}),
                  parts.Content({
                    label: inputs.label,
                    children: [
                      h.div(
                        [h.Class('ramka-toolbar')],
                        [
                          parts.Close({
                            label: inputs.closeLabel ?? 'Close',
                            children: [inputs.closeLabel ?? 'Close'],
                          }),
                          parts.Previous({
                            label: inputs.previousLabel ?? 'Previous',
                            children: [inputs.previousLabel ?? 'Previous'],
                          }),
                          parts.Next({
                            label: inputs.nextLabel ?? 'Next',
                            children: [inputs.nextLabel ?? 'Next'],
                          }),
                          parts.ZoomIn({
                            label: inputs.zoomInLabel ?? 'Zoom in',
                            children: [inputs.zoomInLabel ?? 'Zoom in'],
                          }),
                          parts.ZoomOut({
                            label: inputs.zoomOutLabel ?? 'Zoom out',
                            children: [inputs.zoomOutLabel ?? 'Zoom out'],
                          }),
                          parts.Counter({}),
                        ],
                      ),
                      parts.Stage({
                        children: [
                          parts.Slides({
                            ssrSlideShift: model.initialPaint,
                            label: inputs.carouselLabel,
                            roleDescription: inputs.carouselRoleDescription ?? 'carousel',
                            children: model.items.map((item, index) =>
                              parts.Slide({
                                index,
                                attributes: childAttributes([h.Key(item.id)]),
                                children: [
                                  parts.Item({
                                    index,
                                    attributes: childAttributes([h.Key(item.id)]),
                                    label:
                                      inputs.slideLabel?.(index, model.items.length) ??
                                      `${index + 1} / ${model.items.length}`,
                                    children: () => [
                                      parts.Zoom({
                                        index,
                                        children: [
                                          parts.Media({
                                            index,
                                            ...(item.width === undefined
                                              ? {}
                                              : { width: item.width }),
                                            ...(item.height === undefined
                                              ? {}
                                              : { height: item.height }),
                                            children: [
                                              inputs.item(index, {
                                                active: index === model.index,
                                                zoom:
                                                  index === model.index
                                                    ? model.zoom
                                                    : minZoom(model),
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ),
                          }),
                        ],
                      }),
                      parts.Caption({}),
                      parts.ThumbnailStrip({
                        children: [
                          parts.ThumbnailStripTrack({
                            label: inputs.thumbnailsLabel ?? inputs.carouselLabel,
                            children: model.items.map((item, index) =>
                              parts.Thumbnail({
                                index,
                                label:
                                  inputs.slideLabel?.(index, model.items.length) ??
                                  `${index + 1} / ${model.items.length}`,
                                children: inputs.thumbnail?.(index) ?? [String(index + 1)],
                              }),
                            ),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
        ],
      )
  return h.div(
    [
      h.DataAttribute('ramka-root', ''),
      ...(inputs.className ? [h.Class(inputs.className)] : []),
      h.Id(`${model.id}-root`),
      h.DataAttribute(
        'ramka-container',
        inputs.portalContainerId === null ? '__inline__' : (inputs.portalContainerId ?? ''),
      ),
      h.DataAttribute('ramka-model', JSON.stringify(Schema.encodeSync(Model)(model))),
      h.OnMount(Observe({ id: model.id })),
    ],
    [body],
  )
})
