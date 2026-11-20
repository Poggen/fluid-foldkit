/**
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
export const LightboxDocumentDataAttributes = {
  /** Present during a morph. Value is `opening` or `closing`. */
  viewTransition: 'data-ramka-view-transition',
  /**
   * Present while the morph dissolves trigger↔item snapshots (Trigger
   * `crossfade` is active for this phase). Absent for the default hard-cut.
   */
  crossfade: 'data-ramka-crossfade',
  /**
   * Present during a morph. Value is the active `viewTransition` timing
   * preset name (`default`, `snappy`, `relaxed`, `spring`) — read by the
   * composited morph and available to skin CSS for per-preset styling.
   */
  viewTransitionPreset: 'data-ramka-vt-preset',
  /**
   * Present during a morph ONLY when the page declares foreign
   * `view-transition-name`s that must be neutralized so they don't ride
   * over the morph. Kept off otherwise: the rule's universal selector makes
   * the attribute flip a full-document style invalidation, which on large
   * DOMs is the dominant cost of starting (and finishing) a morph.
   */
  viewTransitionIsolate: 'data-ramka-vt-isolate',
} as const
export type LightboxDocumentDataAttributes =
  (typeof LightboxDocumentDataAttributes)[keyof typeof LightboxDocumentDataAttributes]

export const LightboxSlidesDataAttributes = {
  /** Always present on the slides scrollport. */
  slides: 'data-ramka-slides',
  /** Current active index. */
  activeIndex: 'data-active-index',
  /** `forward` or `backward`. */
  direction: 'data-direction',
  /** Always `horizontal`. */
  orientation: 'data-orientation',
  /**
   * Present while the `ssrSlideShift` transform stand-in is applied: from the
   * server render of an open lightbox until the mount layout effect swaps the
   * real scroll offset in (same commit — the swap never paints). While set,
   * every slide is translated so the active one occupies the scrollport at
   * scroll offset 0, and the scrollport's `overflow-x` is frozen so a
   * pre-hydration swipe can't reveal the empty positions the translated
   * slides vacated.
   */
  ssrShift: 'data-ssr-shift',
} as const
export type LightboxSlidesDataAttributes =
  (typeof LightboxSlidesDataAttributes)[keyof typeof LightboxSlidesDataAttributes]
