import type { Foundation } from './tailwind-policy.ts'

export const exampleFoundations: readonly Foundation[] = [
  {
    file: 'tests/parity/accordion/src/style.css',
    selectors: ['html'],
    properties: ['font-family'],
  },
  {
    file: 'tests/parity/accordion/src/style.css',
    selectors: ['body'],
    properties: ['margin', 'background', 'color'],
  },
  {
    file: 'tests/parity/accordion/src/style.css',
    selectors: ['h1, h2, h3'],
    properties: ['text-wrap'],
  },
  {
    file: 'tests/parity/accordion/src/style.css',
    selectors: ['p'],
    properties: ['text-wrap'],
  },
  {
    file: 'registry/charts/examples/src/style.css',
    selectors: [':root'],
    properties: ['font-family', 'color', 'background', 'font-synthesis', 'color-scheme'],
  },
  {
    file: 'registry/charts/examples/src/style.css',
    selectors: [':root.dark'],
    properties: ['color', 'background', 'color-scheme'],
  },
  {
    file: 'registry/charts/examples/src/style.css',
    selectors: ['*'],
    properties: ['box-sizing'],
  },
  {
    file: 'registry/charts/examples/src/style.css',
    selectors: ['body'],
    properties: ['margin', 'padding'],
  },
  {
    file: 'registry/fluid/examples/color-scroll-private/style.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/accordion.css',
    selectors: ['html'],
    properties: ['font-family'],
  },
  {
    file: 'registry/fluid/examples/src/accordion.css',
    selectors: ['body'],
    properties: ['margin', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/accordion.css',
    selectors: ['h1, h2, h3'],
    properties: ['text-wrap'],
  },
  {
    file: 'registry/fluid/examples/src/accordion.css',
    selectors: ['p'],
    properties: ['text-wrap'],
  },
  {
    file: 'registry/fluid/examples/src/ask-user-questions-example.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/banner.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/calendar-example.css',
    selectors: [':root'],
    properties: ['font', 'color', 'background'],
  },
  {
    file: 'registry/fluid/examples/src/calendar-example.css',
    selectors: ['*'],
    properties: ['box-sizing'],
  },
  {
    file: 'registry/fluid/examples/src/calendar-example.css',
    selectors: ['body'],
    properties: ['margin'],
  },
  {
    file: 'registry/fluid/examples/src/checkbox-group-forms.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/command-menu-example.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/date-picker-demo.css',
    selectors: [':root'],
    properties: ['font', 'color', 'background'],
  },
  {
    file: 'registry/fluid/examples/src/date-picker-demo.css',
    selectors: ['body'],
    properties: ['margin'],
  },
  {
    file: 'registry/fluid/examples/src/date-picker-demo.css',
    selectors: ['*'],
    properties: ['box-sizing'],
  },
  {
    file: 'registry/fluid/examples/src/dropdown-example.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/input-group-example.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/input-queue-layout.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/mobile-drawer.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/presentation.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/primitives.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/reveal.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/sidebar-example.css',
    selectors: ['body'],
    properties: ['margin', 'font', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/sidebar-recipes.css',
    selectors: ['body'],
    properties: ['margin', 'font', 'color', 'background'],
  },
  {
    file: 'registry/fluid/examples/src/slider-ask-forms.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/style.css',
    selectors: ['*'],
    properties: ['box-sizing'],
  },
  {
    file: 'registry/fluid/examples/src/style.css',
    selectors: ['body'],
    properties: ['margin', 'font', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/switch-forms.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
  {
    file: 'registry/fluid/examples/src/tabs-forms.css',
    selectors: ['body'],
    properties: ['margin', 'font-family', 'background', 'color'],
  },
].map((entry) => ({
  ...entry,
  owner: 'Examples',
  reason: 'Standalone document reset, fonts and inherited theme defaults',
}))
