import { latestComponentCatalogue } from './showcase-latest.js'
import type { CatalogueFamily } from './showcase-catalogue-types.js'

export const componentCatalogue: ReadonlyArray<CatalogueFamily> = [
  ...latestComponentCatalogue,
  {
    slug: 'accordion',
    name: 'Accordion',
    entryPoints: ['accordion'],
    examples: [
      {
        file: 'accordion-authored.html',
        label: 'Authored examples and playground',
      },
      {
        file: 'accordion.html',
        label: 'Secondary: historical contract diagnostics',
      },
    ],
    exampleKind: 'focused',
    states:
      'All authored sections, expand modes, row highlighting, shuffle and keyboard navigation.',
    testOwners: ['accordion-root.test.ts', 'accordion-ssr.test.ts'],
    note: '',
  },
  {
    slug: 'ask-user-questions',
    name: 'AskUserQuestions',
    entryPoints: ['ask-user-questions'],
    examples: [{ file: 'ask-user-questions.html', label: 'Open example' }],
    exampleKind: 'focused',
    states:
      'Authored role, tools, team and experience questions, Back, Skip, completion and replay.',
    testOwners: ['ask-user-questions.test.ts', 'slider-ask-ssr.test.ts'],
    note: 'Authored Back, keyboard selection, Skip, completion and Replay match in bounded Chromium checks; initial 720×674 pixels match exactly. Complete motion acceptance remains pending.',
  },
  {
    slug: 'badge',
    name: 'Badge',
    entryPoints: ['badge'],
    examples: [
      {
        file: 'primitives.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Color, dot, size and shape variants.',
    testOwners: ['presentation.test.ts'],
    note: '',
  },
  {
    slug: 'banner',
    name: 'Banner',
    entryPoints: ['banner'],
    examples: [
      {
        file: 'banner.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Statuses, actions, close, remount and compact mode.',
    testOwners: ['banner-replay.test.ts', 'banner-ssr.test.ts'],
    note: '',
  },
  {
    slug: 'button',
    name: 'Button',
    entryPoints: ['button'],
    examples: [
      {
        file: 'primitives.html',
        label: 'Variants',
      },
      {
        file: 'button-options.html',
        label: 'Options',
      },
    ],
    exampleKind: 'focused',
    states: 'Appearance, sizing, loading, icons and native form behavior.',
    testOwners: ['button-mount.test.ts'],
    note: '',
  },
  {
    slug: 'calendar',
    name: 'Calendar',
    entryPoints: ['calendar'],
    examples: [
      {
        file: 'calendar-authored.html',
        label: 'Open authored examples',
      },
      {
        file: 'calendar.html',
        label: 'Open diagnostics',
      },
    ],
    exampleKind: 'focused',
    states:
      'Single and range selection, controlled proposals, month layouts, availability, locale and daily details.',
    testOwners: ['calendar-occurrence.test.ts', 'calendar-synchronization.test.ts'],
    note: 'Authored live examples and playground. Source browser comparison remains pending.',
  },
  {
    slug: 'card',
    name: 'Card',
    entryPoints: ['card'],
    examples: [
      {
        file: 'card.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states:
      'Inline, grid, images, separated frames, selection, actions, dismiss and disabled states.',
    testOwners: ['companion-state.test.ts', 'companion-hover.test.ts'],
    note: 'Dedicated consumer added. Its browser and motion checks are pending.',
  },
  {
    slug: 'carousel-dots',
    name: 'CarouselDots',
    entryPoints: ['carousel-dots'],
    examples: [{ file: 'carousel-dots.html', label: 'Open CarouselDots' }],
    exampleKind: 'focused',
    states: 'Static, autoplay, pause, loop, duration, progress, controlled refusal and remount.',
    testOwners: ['companion-state.test.ts', 'companion-hover.test.ts'],
    note: 'Standalone controls are available; full behavior and exact Source motion acceptance remain unfinished.',
  },
  {
    slug: 'chat-message',
    name: 'ChatMessage',
    entryPoints: ['chat-message'],
    examples: [
      {
        file: 'chat-message.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Conversation, both roles, attachments, streaming, compact size and remount.',
    testOwners: ['input-queue-public.test.ts', 'companion-ssr.test.ts'],
    note: 'Dedicated transcript available; full pixel and motion acceptance remains unfinished. Attachment compositions are client-only.',
  },
  {
    slug: 'checkbox-group',
    name: 'CheckboxGroup',
    entryPoints: ['checkbox-group'],
    examples: [
      {
        file: 'checkbox-group-forms.html',
        label: 'Groups and forms',
      },
      {
        file: 'checkbox-group-checks-forms.html',
        label: 'Check indicators',
      },
    ],
    exampleKind: 'focused',
    states: 'Controlled values, disabled choices and native form submission.',
    testOwners: ['checkbox-group.test.ts'],
    note: '',
  },
  {
    slug: 'color-picker',
    name: 'ColorPicker',
    entryPoints: ['color-picker', 'color-picker-popover'],
    examples: [
      {
        file: 'color-scroll.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Formats, color channels, swatches, scrub input and popovers.',
    testOwners: ['color-picker.test.ts', 'color-picker-observer.test.ts'],
    note: 'Pointer-lock success and sandbox-policy denial have bounded browser evidence. Full family verification is unfinished.',
  },
  {
    slug: 'combobox',
    name: 'Combobox',
    entryPoints: ['combobox'],
    examples: [
      {
        file: 'selection-family.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Filtering, multiple values, creation and controlled acknowledgement.',
    testOwners: ['combobox.test.ts'],
    note: '',
  },
  {
    slug: 'command-menu',
    name: 'CommandMenu',
    entryPoints: ['command-menu', 'command-menu/dialog', 'command-menu/tabs'],
    examples: [
      {
        file: 'command-menu.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Global shortcut, grouped commands, filters, dialogs and tabs.',
    testOwners: ['command-menu-compositions.test.ts'],
    note: '',
  },
  {
    slug: 'date-picker',
    name: 'DatePicker',
    entryPoints: ['date-picker'],
    examples: [
      {
        file: 'date-picker.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Single dates, ranges, custom formatting, presets and time fields.',
    testOwners: ['date-picker-time-format.test.ts', 'calendar-exits.test.ts'],
    note: '',
  },
  {
    slug: 'dialog',
    name: 'Dialog',
    entryPoints: ['dialog', 'dialog/environment'],
    examples: [
      {
        file: 'dialog.html',
        label: 'Standalone dialogs',
      },
      {
        file: 'sidebar-recipes.html',
        label: 'Settings dialog',
      },
      {
        file: 'command-menu.html',
        label: 'Command dialogs',
      },
    ],
    exampleKind: 'focused',
    states:
      'Widths, density, controlled admission, nested lifecycle, scoped portals and initial open state.',
    testOwners: ['dialog.test.ts', 'dialog-lifecycle.test.ts'],
    note: 'Earlier Base captures verified bounded exit/refusal/nested behavior and found paragraph wrapping and host-color gaps. Canonical source fixes require fresh browser acceptance; see receipts/fluid-dialog-complete.',
  },
  {
    slug: 'dropdown',
    name: 'Dropdown',
    entryPoints: ['dropdown', 'dropdown-sub', 'dropdown/environment'],
    examples: [{ file: 'dropdown.html', label: 'Open example' }],
    exampleKind: 'focused',
    states: 'Nested menus, checked and disabled choices, search, empty results and creation.',
    testOwners: ['dropdown-native-menu.test.ts', 'dropdown-scroll-content.test.ts'],
    note: 'Matched filtering, empty results, query creation, nested selection and retained-exit hit testing have bounded Chromium evidence. Complete pixel and motion acceptance remains pending.',
  },
  {
    slug: 'input-copy',
    name: 'InputCopy',
    entryPoints: ['input-copy'],
    examples: [
      {
        file: 'input-family.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Copy result feedback, button/icon variants and tooltip integration.',
    testOwners: ['input-copy.test.ts'],
    note: '',
  },
  {
    slug: 'input-group',
    name: 'InputGroup',
    entryPoints: ['input-group', 'input-field'],
    examples: [
      {
        file: 'input-group.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states:
      'Search, grouped Name and Email fields, controlled values, shared hover and inline validation.',
    testOwners: ['input-group.test.ts'],
    note: 'Matched editing and four fully visible regions have exact Chromium pixel evidence. Complete motion and responsive acceptance remains pending.',
  },
  {
    slug: 'input-message',
    name: 'InputMessage',
    entryPoints: ['input-message', 'input-message-queue', 'queued-stack'],
    examples: [
      {
        file: 'input-family.html',
        label: 'Composer',
      },
      {
        file: 'input-queue.html',
        label: 'Queues',
      },
    ],
    exampleKind: 'focused',
    states: 'Controlled drafts, suggestions, attachments, queue admission and dispatch.',
    testOwners: ['input-message-retained-render.test.ts', 'input-message-file-lifetime.test.ts'],
    note: 'Thumbnail-bearing compositions are client-only.',
  },
  {
    slug: 'radio-group',
    name: 'RadioGroup',
    entryPoints: ['radio-group'],
    examples: [
      {
        file: 'checkbox-group-forms.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Controlled selection, focus and native form submission.',
    testOwners: ['radio-group.test.ts'],
    note: '',
  },
  {
    slug: 'select',
    name: 'Select',
    entryPoints: ['select'],
    examples: [
      {
        file: 'selection-family.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Search, disabled options, keyboard navigation and controlled selection.',
    testOwners: ['select.test.ts'],
    note: '',
  },
  {
    slug: 'sidebar',
    name: 'Sidebar',
    entryPoints: ['sidebar', 'nav-menu', 'mobile-drawer', 'sidebar/app', 'sidebar/settings-dialog'],
    examples: [
      {
        file: 'sidebar.html',
        label: 'Navigation',
      },
      {
        file: 'sidebar-recipes.html',
        label: 'Recipes',
      },
      {
        file: 'mobile-drawer.html',
        label: 'Drawer',
      },
    ],
    exampleKind: 'focused',
    states: 'Nested groups, shared navigation, trailing actions, resize and responsive drawers.',
    testOwners: [
      'nav-menu-authored.test.ts',
      'sidebar-group-motion.test.ts',
      'sidebar-recipes.test.ts',
    ],
    note: 'The approved hidden-link Tab exception was verified before canonical consolidation. Rebuilt canonical sidebar checks remain pending.',
  },
  {
    slug: 'slider',
    name: 'Slider',
    entryPoints: ['slider', 'slider-comfortable'],
    examples: [
      {
        file: 'slider-ask-forms.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Range values, default and compact sizing, keyboard and form behavior.',
    testOwners: ['slider.test.ts'],
    note: '',
  },
  {
    slug: 'switch',
    name: 'Switch',
    entryPoints: ['switch'],
    examples: [
      {
        file: 'switch-forms.html',
        label: 'Forms and lifecycle',
      },
    ],
    exampleKind: 'focused',
    states:
      'Controlled state, sizes, disabled state, remount, submit/reset and keyboard navigation.',
    testOwners: ['switch.test.ts'],
    note: '',
  },
  {
    slug: 'table',
    name: 'Table',
    entryPoints: ['table', 'table-parts'],
    examples: [
      {
        file: 'table.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Header exclusion, row hover and default/compact table layouts.',
    testOwners: ['hover-replay.test.ts'],
    note: '',
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    entryPoints: ['tabs'],
    examples: [
      {
        file: 'tabs-forms.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Controlled tabs, keyboard activation, panels and selected-pill motion.',
    testOwners: ['tabs-interaction.test.ts', 'tabs-render.test.ts'],
    note: 'The Source-owned Tabs policy is an approved public-API gap exception. Full motion acceptance is pending.',
  },
  {
    slug: 'thinking-indicator',
    name: 'ThinkingIndicator',
    entryPoints: ['thinking-indicator'],
    examples: [
      {
        file: 'thinking.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Activity, icon and size changes, remount and reduced motion.',
    testOwners: ['thinking-steps.test.ts'],
    note: '',
  },
  {
    slug: 'thinking-steps',
    name: 'ThinkingSteps',
    entryPoints: ['thinking-steps', 'thinking-step'],
    examples: [
      {
        file: 'thinking.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states:
      'Six authored compositions, streaming text, pause/resume, replay, details, sources and images.',
    testOwners: ['thinking-steps.test.ts'],
    note: '',
  },
  {
    slug: 'tooltip',
    name: 'Tooltip',
    entryPoints: ['tooltip'],
    examples: [
      {
        file: 'tooltip.html',
        label: 'Open example',
      },
    ],
    exampleKind: 'focused',
    states: 'Placement, rich content, cursor following, grouping and lifecycle.',
    testOwners: ['tooltip-public.test.ts', 'tooltip-grace.test.ts'],
    note: 'Canonical Tooltip and its ColorPicker composition are source-migrated. Current types, lifecycle and full browser acceptance remain pending.',
  },
]
