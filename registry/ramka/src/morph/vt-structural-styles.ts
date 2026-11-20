/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
import { VIEW_TRANSITION_NAME } from './vt-constants.js'
import { LightboxDocumentCssVars, LightboxThumbnailStripCssVars } from './lightbox-css-vars.js'
import {
  LightboxDocumentDataAttributes,
  LightboxSlidesDataAttributes,
} from './lightbox-data-attributes.js'
import { VIEW_TRANSITION_PRESETS } from './vt-timing.js'
import type { MorphStyles } from './styles.js'

const STYLE_MARKER = 'data-ramka-lightbox-vt-styles'

function buildCss() {
  const vt = LightboxDocumentDataAttributes.viewTransition
  const isolate = LightboxDocumentDataAttributes.viewTransitionIsolate
  const crossfade = LightboxDocumentDataAttributes.crossfade
  const slides = LightboxSlidesDataAttributes.slides
  const vars = LightboxDocumentCssVars
  const def = VIEW_TRANSITION_PRESETS.default
  const groupPseudo = `::view-transition-group(${VIEW_TRANSITION_NAME})`
  const oldPseudo = `::view-transition-old(${VIEW_TRANSITION_NAME})`
  const newPseudo = `::view-transition-new(${VIEW_TRANSITION_NAME})`

  const duration = `var(${vars.vtDuration}, ${def.duration}ms)`
  const easing = `var(${vars.vtEasing}, ${def.cssEasing})`
  const closeEasing = `var(${vars.vtCrossfadeCloseEasing}, ${def.cssCrossfadeCloseEasing})`
  const rootEasing = `var(${vars.vtRootEasing}, ${def.cssRootEasing})`

  const dissolveDuration = `calc(${duration} * 0.48)`

  const presetTimingRules = Object.entries(VIEW_TRANSITION_PRESETS)
    .map(
      ([name, spec]) => `
:root[${LightboxDocumentDataAttributes.viewTransitionPreset}="${name}"]::view-transition {
  ${vars.vtDuration}: ${spec.duration}ms;
  ${vars.vtEasing}: ${spec.cssEasing};
  ${vars.vtCrossfadeCloseEasing}: ${spec.cssCrossfadeCloseEasing};
  ${vars.vtRootEasing}: ${spec.cssRootEasing};
}`,
    )
    .join('\n')

  return `
/* Isolate the lightbox morph from the rest of the page. startViewTransition
   captures the WHOLE document, so any consumer element carrying its own
   view-transition-name would be lifted into a separate group and painted on
   the VT layer over the backdrop. Neutralize every name while the morph runs;
   the morph target re-declares its name inline with !important, which
   outranks this author-!important rule on specificity.

   Armed via its own attribute — NOT ${vt} — and only when the page actually
   declares foreign names (see vt-name-isolation.ts). Flipping a root
   attribute that a universal descendant rule keys on invalidates style for
   the entire document — at 20k elements that's a ~120ms restyle at capture
   and another ~60ms at teardown, in every engine. Pages with no names to
   neutralize (the overwhelmingly common case) skip that bill entirely. */
:root[${isolate}] * {
  view-transition-name: none !important;
}

${presetTimingRules}

/* Hard-cut snapshot opacities and the radius from/to derivation, by phase
   (see the hard-cut rules below and applyMorphState for the rationale).
   Published on the ::view-transition pseudo instead of inline on <html> —
   see the preset-timing comment above. Under crossfade the opacity vars are
   inert anyway (the crossfade rules override the consuming 'opacity'
   declarations with 'revert !important'), so they can be keyed on the phase
   attribute alone. The trigger/item radius pair is inline on <html> (per
   morph, deduplicated); the pseudo inherits from the root element, so the
   var() references resolve. */
:root[${vt}]::view-transition {
  ${vars.morphOldOpacity}: 1;
}

:root[${vt}="opening"]::view-transition {
  ${vars.morphNewOpacity}: 1;
  ${vars.morphBorderRadiusFrom}: var(${vars.morphRadiusTrigger}, 0px);
  ${vars.morphBorderRadiusTo}: var(${vars.morphRadiusItem}, 0px);
}

:root[${vt}="closing"]::view-transition {
  ${vars.morphNewOpacity}: 0;
  ${vars.morphBorderRadiusFrom}: var(${vars.morphRadiusItem}, 0px);
  ${vars.morphBorderRadiusTo}: var(${vars.morphRadiusTrigger}, 0px);
}

/* The morph-target hide rule (opacity zero plus its during-VT transition
   kill) is NOT in this sheet: it must exist before any morph runs — a page
   that server-renders an open lightbox has a morph target but no transition
   yet — so Lightbox.Trigger delivers it eagerly. See morph-target-hide.ts. */

@media (prefers-reduced-motion: no-preference) {
  /* Root snapshot cross-fade — the page-behind transition. Kept as a SINGLE
     root group: WebKit rasterizes each named group on the CPU. Lightbox
     chrome (thumbnails, zoom controls) fades with this snapshot — never as
     its own fullscreen named group. */
  :root[${vt}]::view-transition-old(root),
  :root[${vt}]::view-transition-new(root) {
    animation-duration: ${duration};
    animation-timing-function: ${rootEasing};
  }

  /* Shape morph is CSS-only: JS writes the from/to radius vars; the group
     owns clipping for the whole transition. The 'from' radius is the cascade
     base (not only a keyframe) so frame 0 can't flash the 0px fallback. */
  @keyframes ramka-morph-border-radius {
    to {
      border-radius: var(${vars.morphBorderRadiusTo}, 0px);
    }
  }

  ${groupPseudo} {
    overflow: hidden;
    border-radius: var(${vars.morphBorderRadiusFrom}, 0px);
    animation-name: -ua-view-transition-group-anim-${VIEW_TRANSITION_NAME}, ramka-morph-border-radius;
    animation-duration: ${duration};
    animation-timing-function: ${easing};
    animation-fill-mode: both;
    z-index: 2;
  }

  /* Hard-cut default (Trigger omits crossfade). Cover keeps same-image crops
     coherent; kill the UA dissolve and drive opacity from library vars. */
  ${oldPseudo},
  ${newPseudo} {
    object-fit: cover;
    width: 100%;
    height: 100%;
    animation: none !important;
    mix-blend-mode: normal;
  }

  ${oldPseudo} {
    opacity: var(${vars.morphOldOpacity}, 1);
  }

  ${newPseudo} {
    opacity: var(${vars.morphNewOpacity}, 0);
  }

  /* Dissolve path (Trigger crossfade): restore the UA fade, plus-lighter
     blend, fill so circular triggers don't balloon under cover. Re-timed to
     the preset vars so the dissolve runs on the morph's clock (the UA
     default would end at 250ms, mid-morph). Open uses the morph ease-out so
     the destination appears promptly while the group grows; close uses a
     modest ease-out (not the morph curve — that flashes a stretched trigger
     in the first frames, and a strong ease-in holds the item too long).
     Both phases share one complementary 1→0 / 0→1 pair on a shorter window
     so the outgoing snapshot is gone before the size settle (a face or +N
     overlay must not ghost until t=1). Do not delay one snapshot relative
     to the other — that leaves a window where opacities no longer sum to 1.

     Fill-mode both: the UA fades run with fill none, so a finished fade
     snaps the old snapshot back to its base opacity of 1 — and the
     composited group replacement can outlive the fades by a frame (its
     animations attach one style flush later), which painted a fully-opaque
     trigger snapshot blended over the item for that frame. Holding the end
     state closes the gap. */
  :root[${crossfade}]${oldPseudo},
  :root[${crossfade}]${newPseudo} {
    object-fit: fill;
    mix-blend-mode: plus-lighter;
    animation: revert !important;
    animation-duration: ${dissolveDuration} !important;
    animation-timing-function: ${easing} !important;
    animation-fill-mode: both !important;
    opacity: revert;
  }

  :root[${vt}="closing"][${crossfade}]${oldPseudo},
  :root[${vt}="closing"][${crossfade}]${newPseudo} {
    animation-timing-function: ${closeEasing} !important;
  }
}

/* Thumb-jump slides crossfade — the element-scoped view transition started by
   ThumbnailStrip's selectViewTransition. Tunable via the select-vt vars. */
[${slides}]::view-transition-group(root) {
  animation-duration: var(${LightboxThumbnailStripCssVars.selectVtDuration}, 0.4s);
  animation-timing-function: var(${LightboxThumbnailStripCssVars.selectVtEasing}, cubic-bezier(0.22, 1, 0.36, 1));
}

[${slides}]::view-transition-old(root),
[${slides}]::view-transition-new(root) {
  mix-blend-mode: normal;
  height: 100%;
  overflow: clip;
}
`
}

/**
 * Add the structural view-transition stylesheet once per document.
 *
 * Called when the morph engine starts a transition (client only — safe under
 * SSR). Delivered as a constructed stylesheet so it survives a strict CSP; see
 * vt-style-sheets.ts for what that costs in cascade order.
 *
 * All selectors are gated behind transition-time attributes or lightbox part
 * markers, so timing can never flash unstyled content.
 */
function ensureVtStructuralStyles(styles: MorphStyles) {
  styles.ensureLibrarySheet(STYLE_MARKER, buildCss, true)
}

export { ensureVtStructuralStyles }
