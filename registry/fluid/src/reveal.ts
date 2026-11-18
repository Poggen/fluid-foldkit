/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { cn } from './lib/utils.js'

/** Classes preserve native HTML composition, including nested scroll sections and SSR markup. */
export const Reveal: <Message>(props: RevealProps<Message>, h: HtmlBuilder<Message>) => Html =
  function Reveal<Message>(props: RevealProps<Message>, h: HtmlBuilder<Message>) {
    const attributes = [
      h.Class(
        cn(
          props.preset,
          props.scroll && 'reveal-scroll',
          props.items && 'reveal-items',
          props.swap && 'reveal-swap',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ]

    return (
      props.render ? props.render(attributes, props.children) : h.div(attributes, props.children)
    ) satisfies Html
  }

export const RevealSkeleton: <Message>(
  props: RevealSkeletonProps<Message>,
  h: HtmlBuilder<Message>,
) => Html = function RevealSkeleton<Message>(
  props: RevealSkeletonProps<Message>,
  h: HtmlBuilder<Message>,
) {
  return h.div(
    [
      h.DataAttribute('slot', 'skeleton'),
      h.Class(cn('bg-accent animate-pulse rounded-md', props.className)),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
  ) satisfies Html
}

export interface RevealPreset {
  readonly spring: 'slow' | 'moderate'
  readonly distance?: number
  readonly scale?: number
  readonly step: number
  readonly scrollStart?: number
  readonly scroll?: number
}

/** Exact authored presets; styles.css supplies their CSS and native view timelines. */
export const revealPresets = {
  'reveal-landing': {
    spring: 'slow',
    distance: 12,
    scale: 0.94,
    step: 0.1,
    scrollStart: 12,
    scroll: 120,
  },
  'reveal-landing-subtle': {
    spring: 'slow',
    distance: 8,
    scale: 0.98,
    step: 0.06,
    scrollStart: 8,
    scroll: 60,
  },
  'reveal-product': { spring: 'moderate', step: 0.06 },
  'reveal-product-subtle': { spring: 'moderate', step: 0.04 },
} satisfies Record<string, RevealPreset>

export type RevealPresetName = keyof typeof revealPresets

export interface RevealProps<Message> {
  readonly preset?: RevealPresetName
  readonly scroll?: boolean
  readonly items?: boolean
  readonly swap?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  readonly children: ReadonlyArray<Html | string>
  readonly render?: (
    attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ) => Html
}

export interface RevealSkeletonProps<Message> {
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  readonly children?: ReadonlyArray<Html | string>
}
