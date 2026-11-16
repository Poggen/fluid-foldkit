// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import type { AskUserQuestion } from '@foldkit-visuals/fluid/ask-user-questions'
export const stackedQuestions: Array<AskUserQuestion> = [
  {
    id: 'template',
    title: 'Which starting template fits your project?',
    layout: 'stacked',
    options: [
      {
        id: 'marketing',
        title: 'Marketing site',
        description:
          'Polished landing page with hero, features grid, pricing table, and a footer. Best when you need to ship a story-driven page fast.',
      },
      {
        id: 'chat',
        title: 'AI chat app',
        description:
          'Full conversation UI with InputMessage, ThinkingSteps, and message bubbles wired up. Ideal for assistants and copilots.',
      },
      {
        id: 'admin',
        title: 'Admin dashboard',
        description:
          'Sidebar shell, sortable data tables, and form-heavy detail views. Built for back-office tools and operational apps.',
      },
      {
        id: 'onboarding',
        title: 'Onboarding flow',
        description:
          'Stepped intake using AskUserQuestions with a progress indicator and inline validation. Great for setup wizards.',
      },
    ],
  },
  {
    id: 'shape',
    title: 'Which shape language fits your brand?',
    layout: 'stacked',
    options: [
      {
        id: 'rounded',
        title: 'Rounded',
        description:
          'Soft 16–24px corners that feel approachable and read as software. Pairs well with editorial typography and dense layouts.',
      },
      {
        id: 'pill',
        title: 'Pill',
        description:
          'Fully rounded shapes that lean playful and consumer-friendly. Best when controls are sparse and breathing room is generous.',
      },
    ],
  },
  {
    id: 'components',
    title: 'Which components will you reach for first?',
    layout: 'stacked',
    multiSelect: true,
    nextLabel: 'Continue',
    options: [
      {
        id: 'input',
        title: 'InputMessage',
        description:
          'Chat-style composer with attachments, dropdowns, and submit affordances. The backbone of any AI surface.',
      },
      {
        id: 'thinking',
        title: 'ThinkingSteps',
        description:
          'Animated, streamable reasoning steps with collapse and expand. Great for showing AI work in progress.',
      },
      {
        id: 'ask',
        title: 'AskUserQuestions',
        description:
          'This component — stepped flows with single and multi-select, optional Other, and fluid hover throughout.',
      },
      {
        id: 'tabs',
        title: 'Tabs',
        description:
          'Quiet segmented tabs that morph between selections. Reach for these when section headers would be too loud.',
      },
      {
        id: 'nav',
        title: 'NavMenu',
        description:
          'Sidebar navigation with active-state morphing, grouped sections, and keyboard support out of the box.',
      },
    ],
  },
  {
    id: 'drew',
    title: 'What drew you to Fluid Functionalism?',
    layout: 'stacked',
    allowOther: true,
    otherPlaceholder: 'Something else? Tell us in a sentence…',
    options: [
      {
        id: 'motion',
        title: 'Motion that feels alive',
        description:
          'Spring tokens, fluid hover, and morphing backgrounds make every interaction feel intentional rather than scripted.',
      },
      {
        id: 'craft',
        title: 'Pixel-level craft',
        description:
          'Every component is tuned for typography, spacing, focus rings, and dark mode — no defaults left untouched.',
      },
      {
        id: 'tokens',
        title: 'A token system, not just components',
        description:
          'Shape, elevation, color, and font-weight tokens compose cleanly so the registry scales beyond what you see.',
      },
    ],
  },
  {
    id: 'frameworks',
    title: 'Where will you ship these components?',
    layout: 'stacked',
    multiSelect: true,
    options: [
      {
        id: 'next',
        title: 'Next.js (App Router)',
        description:
          'Server components, client islands, and route-level layouts. The primary target the registry is tuned for.',
      },
      {
        id: 'remix',
        title: 'Remix',
        description:
          'Full-stack data loading with nested routes. Most components transplant cleanly; framer-motion stays client-only.',
      },
      {
        id: 'vite',
        title: 'Vite + React',
        description:
          'Single-page apps and internal dashboards. The fastest dev loop for prototyping new flows against the registry.',
      },
      {
        id: 'astro',
        title: 'Astro',
        description:
          'Content-first sites with interactive islands. Good fit for marketing pages that need a handful of live components.',
      },
    ],
  },
  {
    id: 'theme',
    title: 'How will you handle theme mode?',
    layout: 'stacked',
    options: [
      {
        id: 'light',
        title: 'Light only',
        description:
          'Tune one palette deeply. Best when the product is consumer-facing and the brand voice is bright.',
      },
      {
        id: 'dark',
        title: 'Dark only',
        description:
          'Lean into the dark-mode aesthetic the registry was designed in. Cuts theme work in half.',
      },
      {
        id: 'system',
        title: 'System-aware',
        description:
          'Follow the OS preference automatically. No toggle UI, no user friction, and it matches what most apps do today.',
      },
      {
        id: 'toggle',
        title: 'User toggle',
        description:
          'Give users an explicit switch with persistence. The most flexible option, but it adds a small surface to design.',
      },
    ],
  },
  {
    id: 'missing',
    title: "What's missing from the registry today?",
    layout: 'stacked',
    multiSelect: true,
    allowOther: true,
    otherPlaceholder: 'Tell us what to build next…',
    nextLabel: 'Send feedback',
    options: [
      {
        id: 'data',
        title: 'Data table',
        description:
          'Sortable, filterable, virtualized rows with column resizing and density modes. The most-asked-for primitive.',
      },
      {
        id: 'calendar',
        title: 'Calendar / date picker',
        description:
          'Single date, range, and inline calendar — with keyboard support and locale-aware formatting baked in.',
      },
      {
        id: 'command',
        title: 'Command menu',
        description:
          'Keyboard-first launcher with recents, grouped actions, and fuzzy matching. The connective tissue for power users.',
      },
    ],
  },
  {
    id: 'recommend',
    title: 'Would you recommend Fluid Functionalism to a teammate?',
    layout: 'stacked',
    skippable: false,
    options: [
      {
        id: 'yes',
        title: 'Yes, already have',
        description:
          "It's clear from the first install where the bar is. You'd hand it to anyone shipping a polished React surface.",
      },
      {
        id: 'soon',
        title: 'Once it covers more ground',
        description:
          "Once the missing pieces (data table, calendar, command) land you'd recommend it without reservation.",
      },
      {
        id: 'unsure',
        title: 'Still evaluating',
        description:
          'You like the direction but want to ship one real flow against it before passing it on to others.',
      },
    ],
  },
]
