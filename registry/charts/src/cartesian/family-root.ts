import { DrawingElementBase } from './lifecycle'
import type { TimeSeriesProps } from './root-options'
import { cn } from '../kit/classes'
import { bklitSurfaceStyle } from './style'

export const familyResourceElements: (
  drawingHost: HTMLElement,
  id: string,
) => FamilyResourceElements = function familyResourceElements(
  drawingHost: HTMLElement,
  id: string,
) {
  if (DrawingElementBase === undefined || !(drawingHost instanceof DrawingElementBase))
    return { drawingHost, visualRoot: undefined }
  const root = drawingHost.closest('[data-bkm-native-chart]')
  const Div = drawingHost.ownerDocument.defaultView?.HTMLDivElement
  if (Div === undefined || !(root instanceof Div) || root.dataset.bkmNativeChart !== id) {
    throw new TypeError('Family resource requires its committed chart root')
  }
  return { visualRoot: root, drawingHost }
}

export function timeSeriesRoot<Row>(props: TimeSeriesProps<Row>) {
  return {
    className: cn('relative w-full', props.className),
    style: {
      aspectRatio: props.aspectRatio ?? '2 / 1',
      touchAction: 'none',
      ...(props.width === undefined ? {} : { width: props.width }),
      ...(props.height === undefined ? {} : { height: props.height }),
      ...bklitSurfaceStyle,
      ...props.style,
    },
  }
}

export interface FamilyResourceElements {
  readonly visualRoot: HTMLDivElement | undefined
  readonly drawingHost: HTMLElement
}
