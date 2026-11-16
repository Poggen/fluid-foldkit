// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  [
    // whitespace-nowrap: a label never breaks onto 2 lines. It also makes
    // the label the button's narrowest width, so a tight row moves the
    // button (or overflows) instead of squeezing it.
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer select-none whitespace-nowrap',
    'transition-colors duration-80',
    'disabled:not-aria-busy:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
  ],
  {
    variants: {
      variant: {
        primary: 'text-background',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        destructive:
          '[--btn-red:var(--color-red-500,oklch(63.7%_0.237_25.331))] text-[color:light-dark(var(--color-red-700,oklch(50.5%_0.213_27.518)),var(--color-red-400,oklch(70.4%_0.191_22.216)))]',
      },
      // The two-step size ladder shared by every control — see /docs/sizes.
      // default = 36px control height, compact = 28px for dense surfaces.
      size: {
        default: 'h-9 px-4 text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] gap-1.5',
        compact:
          'h-7 px-3 text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)] gap-1',
        toolbar:
          'h-7 px-1 text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)] gap-1',
        icon: 'h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4',
        'icon-compact': 'h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
        // Source Sidebar toolbars use a fixed 24px footprint within the compact ladder.
        'icon-toolbar': 'size-6 shrink-0 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
      iconLeft: { true: '' },
      iconRight: { true: '' },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: 'compact', iconLeft: true, className: 'pl-2' },
      { size: 'default', iconLeft: true, className: 'pl-3' },
      { size: 'compact', iconRight: true, className: 'pr-2' },
      { size: 'default', iconRight: true, className: 'pr-3' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export type ButtonSizeCanonical =
  | 'default'
  | 'compact'
  | 'toolbar'
  | 'icon'
  | 'icon-compact'
  | 'icon-toolbar'

export type ButtonSize = ButtonSizeCanonical | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-lg'

export const bgVariants = {
  primary:
    '[--btn-bg:var(--foreground)] group-hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))] group-active:[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--tint)] group-hover:[--btn-bg:var(--tint-hover)] group-active:[--btn-bg:var(--tint)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  // The border ring is an outer 1px shadow at rest that hands off to an
  // inset 1px shadow when pressed, so the ring moves inward with the
  // surface. The translucent fill only ever reaches the ring's inner edge
  // (exactly the surface box), so it needs no spread of its own.
  tertiary:
    'bg-transparent shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-hover:bg-hover group-active:bg-active group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  // Translucent fill + same-color spread never double up: outer shadows
  // render only outside the surface box.
  ghost:
    'bg-transparent shadow-[0_0_0_1px_transparent] group-hover:bg-hover group-hover:shadow-[0_0_0_1px_var(--hover)] group-active:bg-active group-active:shadow-[0_0_0_0px_var(--active)]',
  destructive:
    '[--btn-bg:light-dark(color-mix(in_oklab,var(--btn-red)_15%,transparent),color-mix(in_oklab,var(--btn-red)_20%,transparent))] group-hover:[--btn-bg:light-dark(color-mix(in_oklab,var(--btn-red)_25%,transparent),color-mix(in_oklab,var(--btn-red)_30%,transparent))] group-active:[--btn-bg:light-dark(color-mix(in_oklab,var(--btn-red)_15%,transparent),color-mix(in_oklab,var(--btn-red)_20%,transparent))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
}

export const activeBgVariants = {
  primary:
    '[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--tint)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  tertiary:
    'bg-active shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  ghost: 'bg-active shadow-[0_0_0_1px_var(--active)] group-active:shadow-[0_0_0_0px_var(--active)]',
  destructive:
    '[--btn-bg:light-dark(color-mix(in_oklab,var(--btn-red)_25%,transparent),color-mix(in_oklab,var(--btn-red)_30%,transparent))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
}

const restingBackground = (classes: string): string =>
  classes
    .split(' ')
    .filter((value) => !value.startsWith('group-hover:') && !value.startsWith('group-active:'))
    .join(' ')

export const loadingBgVariants = {
  primary: restingBackground(bgVariants.primary),
  secondary: restingBackground(bgVariants.secondary),
  tertiary: restingBackground(bgVariants.tertiary),
  ghost: restingBackground(bgVariants.ghost),
  destructive: restingBackground(bgVariants.destructive),
}
