// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { cva } from 'class-variance-authority'

export const badgeColors = {
  accent: 'var(--fluid-accent, #6B97FF)',
  gray: '#a3a3a3',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
}

export type BadgeColor = keyof typeof badgeColors

export const badgeVariants = cva('inline-flex items-center whitespace-nowrap', {
  variants: {
    variant: {
      solid: '',
      dot: 'border border-border text-foreground',
    },
    // The two-step size ladder shared by every control: 24px tall by
    // default, 20px compact. The height is fixed rather than padded so the
    // trimmed label below can't shrink the badge.
    size: {
      default:
        'h-6 px-2.5 text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] gap-1.5',
      compact:
        'h-5 px-2 text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)] gap-1',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'default',
  },
})

export type BadgeSizeCanonical = 'default' | 'compact'

export type BadgeSize = BadgeSizeCanonical | 'sm' | 'md' | 'lg'
