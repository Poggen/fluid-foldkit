/**
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
export const LightboxDocumentCssVars = {
  /**
   * Trigger-side border-radius for the morph group clip (interpolatable px).
   * Written by the library onto `documentElement` during a morph — do not set
   * it yourself.
   * @type string
   */
  morphRadiusTrigger: '--lightbox-morph-radius-trigger',
  /**
   * Item-side border-radius for the morph group clip. Written by the library
   * onto `documentElement` during a morph — do not set it yourself.
   * @type string
   */
  morphRadiusItem: '--lightbox-morph-radius-item',
  /**
   * Start border-radius for the morph group clip (interpolatable px). Derived
   * from the trigger/item radius pair by the library's own view-transition
   * rules, keyed on the morph direction.
   * @type string
   */
  morphBorderRadiusFrom: '--lightbox-morph-border-radius-from',
  /**
   * End border-radius for the morph group clip. Derived from the trigger/item
   * radius pair like `--lightbox-morph-border-radius-from`.
   * @type string
   */
  morphBorderRadiusTo: '--lightbox-morph-border-radius-to',
  /**
   * Opacity of the old morph snapshot on the hard-cut path (no document crossfade).
   * @type number
   */
  morphOldOpacity: '--lightbox-morph-old-opacity',
  /**
   * Opacity of the new morph snapshot on the hard-cut path (1 on open, 0 on close).
   * @type number
   */
  morphNewOpacity: '--lightbox-morph-new-opacity',
  /**
   * Morph + root-snapshot duration from the Root's `viewTransition` timing
   * preset. WRITTEN BY THE LIBRARY in two places — do not set it yourself:
   * onto `documentElement` during a morph (read it in document-level
   * `::view-transition-*` rules, e.g. `calc(var(--lightbox-vt-duration) * 0.5)`
   * for a derived track), and always onto the Portal host, so skin open/close
   * fades inside the portal can use the preset's clock even when no morph
   * runs (non-VT browsers, reduced motion, low-end fallback), e.g.
   * `transition: opacity var(--lightbox-vt-duration, 360ms) ease-out`.
   * @type string
   */
  vtDuration: '--lightbox-vt-duration',
  /**
   * Easing for `::view-transition-group(lightbox-morph)` and the *open*
   * crossfade dissolve. Written by the library from the `viewTransition`
   * preset, like `--lightbox-vt-duration` (during a morph on
   * `documentElement`, always on the Portal host). Close dissolve uses
   * `--lightbox-vt-crossfade-close-easing` (a shorter complementary fade,
   * not the morph curve) so the item yields before the size settle.
   * @type string
   */
  vtEasing: '--lightbox-vt-easing',
  /**
   * Close trigger↔item snapshot dissolve, used while
   * `data-ramka-view-transition:"closing"` and `data-ramka-crossfade` are set.
   * Modest ease-out on a shorter window that still runs old 1→0 and new 0→1 on
   * the same clock (`plus-lighter` stays opaque). Written by the library onto
   * `documentElement` during a morph — do not set it yourself.
   * @type string
   */
  vtCrossfadeCloseEasing: '--lightbox-vt-crossfade-close-easing',
  /**
   * Easing for the root snapshot cross-fade
   * (`::view-transition-old/new(root)`). Written by the library from the
   * `viewTransition` preset, like `--lightbox-vt-duration` (during a morph on
   * `documentElement`, always on the Portal host). A good default for skin
   * backdrop/content fades.
   * @type string
   */
  vtRootEasing: '--lightbox-vt-root-easing',
} as const
export type LightboxDocumentCssVars =
  (typeof LightboxDocumentCssVars)[keyof typeof LightboxDocumentCssVars]

export const LightboxThumbnailStripCssVars = {
  /**
   * End `translateX` travel for the scroll link (negative px length to center
   * the last thumb — `(count - 1) * step` when thumbs are uniform). Set on the
   * ThumbnailStripTrack.
   * @type string
   */
  travel: '--lightbox-thumbnail-strip-travel',
  /**
   * Duration of the element-scoped Slides view transition on pointer thumb
   * select (`selectViewTransition`). Set on Slides (or a parent) and use from
   * `::view-transition-group(root)` — library starts the transition; CSS owns
   * the look. Default fallback in demos: `0.4s`.
   * @type string
   */
  selectVtDuration: '--lightbox-select-vt-duration',
  /**
   * Easing of the element-scoped Slides view transition on pointer thumb
   * select. Pair with `--lightbox-select-vt-duration`. Default fallback in
   * demos: `cubic-bezier(0.22, 1, 0.36, 1)`.
   * @type string
   */
  selectVtEasing: '--lightbox-select-vt-easing',
} as const
export type LightboxThumbnailStripCssVars =
  (typeof LightboxThumbnailStripCssVars)[keyof typeof LightboxThumbnailStripCssVars]
