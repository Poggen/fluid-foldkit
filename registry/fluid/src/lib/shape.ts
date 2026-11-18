/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */

export type ShapeVariant = 'pill' | 'rounded' | 'sharp'

export interface ShapeClasses {
  /** The variant these classes belong to — handy for conditionals. */
  variant: ShapeVariant
  item: string
  bg: string
  focusRing: string
  mergedBg: string
  container: string
  button: string
  input: string

  bgRadius: number
  /** Numeric counterpart of `container`. Popup shells use a 4px inset, so
   *  containerRadius = bgRadius + 4 keeps their curves concentric. */
  containerRadius: number
  mergedRadius: number
}

export function nestedRadius(outerRadius: number, inset: number, borderWidth = 0) {
  return Math.max(0, outerRadius - inset - borderWidth)
}

export const popupShape: (shape: ShapeVariant) => ShapeClasses = (shape: ShapeVariant) =>
  shape === 'sharp' ? shapeMap.sharp : shapeMap.rounded

export const shapeMap: Record<ShapeVariant, ShapeClasses> = {
  pill: {
    variant: 'pill',
    item: 'rounded-[20px]',
    bg: 'rounded-[20px]',

    focusRing: 'rounded-[22px]',
    mergedBg: 'rounded-2xl',
    container: 'rounded-3xl',
    button: 'rounded-[20px]',
    input: 'rounded-[20px]',
    bgRadius: 20,
    containerRadius: 24,
    mergedRadius: 16,
  },
  sharp: {
    variant: 'sharp',
    item: 'rounded-[1px]',
    bg: 'rounded-[1px]',
    focusRing: 'rounded-[3px]',
    mergedBg: 'rounded-[1px]',
    container: 'rounded-[1px]',
    button: 'rounded-[1px]',
    input: 'rounded-[1px]',
    bgRadius: 1,
    containerRadius: 1,
    mergedRadius: 1,
  },
  rounded: {
    variant: 'rounded',
    item: 'rounded-lg',
    bg: 'rounded-lg',
    focusRing: 'rounded-[10px]',
    mergedBg: 'rounded-lg',
    container: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    bgRadius: 8,
    containerRadius: 12,
    mergedRadius: 8,
  },
}
