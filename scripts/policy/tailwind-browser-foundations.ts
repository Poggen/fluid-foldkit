import type { Foundation } from './tailwind-policy.ts'

export const browserFoundations: readonly Foundation[] = [
  {
    file: 'app/src/styles/native-presentation.css',
    owner: 'Showcase',
    reason: 'Existing native settings live on .site rather than the source document element',
    rules: [
      {
        selectors: [
          ".site[data-size='compact']",
          ".site[data-font='serif']",
          ".site[data-font='serif'][data-size='compact']",
        ],
        properties: [],
      },
      {
        selectors: [
          '.site :is(h1, h2, h3):is(.text-site-display, .text-site-title, .text-site-subtitle)',
          '.site :is(h1, h2, h3).text-site-display',
        ],
        properties: [
          'font-family',
          'font-variation-settings',
          'font-weight',
          'font-synthesis-weight',
        ],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/transitions-reduced-motion.css',
    owner: 'Fluid',
    reason:
      'Retained native reduced-motion policy suppresses the original document shape transition',
    rules: [
      {
        selectors: [
          'html.transitioning *, html.transitioning *::before, html.transitioning *::after',
        ],
        properties: ['transition'],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/surfaces.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root, .light'],
        properties: [],
      },
      {
        selectors: ['.dark'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/theme.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root'],
        properties: ['color-scheme'],
      },
      {
        selectors: [':root, .light, .dark'],
        properties: [],
      },
      {
        selectors: ['.light'],
        properties: ['color-scheme'],
      },
      {
        selectors: ['.dark'],
        properties: ['color-scheme'],
      },
      {
        selectors: [':root:not(.light)'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/tokens.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root, .light'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/type-scale.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root, .light'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/banner.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root, .light'],
        properties: [],
      },
      {
        selectors: ['.dark'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/color-picker.css',
    owner: 'Fluid',
    reason: 'Inherited palette, type and stacking tokens resolve in explicit theme scopes',
    rules: [
      {
        selectors: [':root, .light'],
        properties: [],
      },
      {
        selectors: ['.dark'],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/theme.css',
    owner: 'Fluid',
    reason: 'Browser document defaults and scroll-lock compensation apply outside component roots',
    rules: [
      {
        selectors: ['html'],
        properties: ['scrollbar-gutter'],
      },
      {
        selectors: ['html, body'],
        properties: [
          'margin',
          'min-height',
          'overscroll-behavior-y',
          'background-color',
          'color',
          'font-family',
          '-webkit-font-smoothing',
          '-moz-osx-font-smoothing',
        ],
      },
      {
        selectors: ['body[data-scroll-locked][data-scroll-locked]'],
        properties: ['margin-right'],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/tokens.css',
    owner: 'Fluid',
    reason: 'Global selection and keyboard focus defaults cover caller-authored native elements',
    rules: [
      {
        selectors: ['::selection'],
        properties: ['background-color'],
      },
      {
        selectors: [':focus-visible'],
        properties: ['outline', 'outline-offset', 'border-radius'],
      },
      {
        selectors: [':is(input, textarea):focus-visible'],
        properties: ['border-radius'],
      },
      {
        selectors: ['a:focus-visible'],
        properties: ['border-radius'],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/typography.css',
    owner: 'Fluid',
    reason: 'Public prose composition and browser text wrapping defaults',
    rules: [
      {
        selectors: ['h1, h2, h3'],
        properties: ['text-wrap'],
      },
      {
        selectors: ['p'],
        properties: ['text-wrap'],
      },
    ],
  },
  {
    file: 'registry/fluid/src/styles/scroll-area.css',
    owner: 'Fluid',
    reason: 'Public scroll edge helpers and platform scrollbar defaults cover external content',
    rules: [
      {
        selectors: ['*'],
        properties: ['scrollbar-width', 'scrollbar-color'],
      },
      {
        selectors: ['::-webkit-scrollbar'],
        properties: ['width', 'height'],
      },
      {
        selectors: ['::-webkit-scrollbar-track, ::-webkit-scrollbar-corner'],
        properties: ['background'],
      },
      {
        selectors: ['::-webkit-scrollbar-thumb'],
        properties: ['background-color', 'border', 'background-clip', 'border-radius'],
      },
      {
        selectors: ['::-webkit-scrollbar-thumb:vertical'],
        properties: ['border-left-width', 'border-right-width'],
      },
      {
        selectors: ['::-webkit-scrollbar-thumb:horizontal'],
        properties: ['border-top-width', 'border-bottom-width'],
      },
      {
        selectors: ['::-webkit-scrollbar-thumb:hover'],
        properties: ['background-color'],
      },
      {
        selectors: ['::-webkit-scrollbar-thumb:active'],
        properties: ['background-color'],
      },
    ],
  },
  {
    file: 'app/src/styles.css',
    owner: 'Showcase',
    reason: 'Document reset and inherited global type scale, including compact preference',
    rules: [
      {
        selectors: ['*'],
        properties: ['box-sizing'],
      },
      {
        selectors: ['html'],
        properties: ['background', 'scrollbar-gutter'],
      },
      {
        selectors: ['body'],
        properties: [
          'margin',
          'font-family',
          'font-size',
          'line-height',
          'color',
          'background',
          '-webkit-font-smoothing',
        ],
      },
      {
        selectors: ['a'],
        properties: ['color', 'text-decoration'],
      },
      {
        selectors: ['button, a, input, textarea'],
        properties: ['-webkit-tap-highlight-color'],
      },
      {
        selectors: ['button, a'],
        properties: ['touch-action'],
      },
      {
        selectors: ['button'],
        properties: ['cursor'],
      },
      {
        selectors: [':root'],
        properties: [],
      },
      {
        selectors: ["body:has(.site[data-app='visuals'][data-size='compact'])"],
        properties: [],
      },
    ],
  },
  {
    file: 'registry/charts/src/styles/part-1.css',
    owner: 'Charts',
    reason: 'Inherited chart palette and explicit light/dark theme aliases',
    rules: [
      {
        selectors: [":where(:root, .light, [data-theme='light'])"],
        properties: [],
      },
      {
        selectors: [":where(.dark, [data-theme='dark'])"],
        properties: [],
      },
    ],
  },
].flatMap(({ rules, ...foundation }) => rules.map((rule) => ({ ...foundation, ...rule })))
