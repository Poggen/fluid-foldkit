/* @license Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import type { SystemPage } from '../../../lib/system'

interface PageNarrative {
  readonly title: string
  readonly lead: string
  readonly intro: string
  readonly sections: ReadonlyArray<{
    readonly title: string
    readonly paragraphs: ReadonlyArray<string>
    readonly headings: ReadonlyArray<string>
    readonly items: ReadonlyArray<string>
  }>
}

export const narrative: Readonly<Record<SystemPage, PageNarrative>> = {
  'fluid-hover': {
    title: 'Fluid Hover',
    lead: 'Hover that glides from item to item under your cursor instead of blinking between them.',
    intro: '',
    sections: [
      {
        title: 'Blink or glide',
        paragraphs: [
          'Move your pointer through both lists. On the left, each gap switches the highlight off and on and pulls your eye back to the list. On the right, the highlight glides between items, so your eye stays on the task.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Show the math',
        paragraphs: [
          'By default the item under the pointer lights, and empty space puts the highlight out. Pass nearest for 1 rule with no dead zones: the nearest dot wins. Flip the switch and that is the whole algorithm.',
        ],
        headings: [],
        items: [],
      },
      {
        title: '3 axes',
        paragraphs: [
          'Menus, tabs, and card grids all feel the same under the cursor. With nearest, pass y, x, or xy to say how near is measured: down the list, across the strip, or to the closest card.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'When to split a list',
        paragraphs: [
          'Split at the divider. Rows that are alternatives to each other share 1 list, children included, and the highlight never crosses into the next one.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'What it costs',
        paragraphs: [
          'The original implementation describes its cost as one highlight element, one transform, and one loop per move. The native example below shows 200 rows and reports the actual measured row count and active row.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Reduced motion',
        paragraphs: [
          'The highlight respects the OS setting on its own. Turn on reduced motion and the travel drops out: the highlight still fades in on the row under the pointer, it just stops sliding between rows. The native HoverHighlight observes the preference itself, so a copied component behaves the same in your app.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Reference',
        paragraphs: [
          'HoverBlock picks; HoverHighlightBlock draws. Focus, roles, and focus rings stay with your rows.',
          'The highlight moves on a transform. Width and height only animate between items of different sizes.',
        ],
        headings: ['Options', 'Returns', 'FluidHoverHighlight'],
        items: [],
      },
    ],
  },
  motion: {
    title: 'Motion',
    lead: 'Three spring speeds, exits a little faster than entrances, and one fluid hover shared by every list. Pick a speed, wire it in — every component follows the same pattern.',
    intro: '',
    sections: [
      {
        title: 'Three speeds',
        paragraphs: [
          "All animations come from one of three springs in the spring tokens. Hover states and small toggles use fast. Dropdowns and tabs use moderate. Dialogs and drawers use slow. No component invents its own timing, so things you've never thought about together will move at the same pace. moderate is critically damped — it lands exactly with no overshoot, so it also carries panels and sheets that must settle precisely (the mobile drawer, the merged selection backgrounds).",
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Slow in, faster out',
        paragraphs: [
          "Both modals open on spring.slow. The only difference is the close: the left exits on the same spring.slow, the right on spring.slow.exit — one tier faster. Toggle the left one first. That slight drag on the way out is exactly what you're trying to avoid.",
        ],
        headings: [],
        items: [],
      },
      {
        title: 'All tokens',
        paragraphs: [
          'Click a track to see it. The ball enters right on the spring, then returns left on the exit tween. Everything lives in the spring tokens — duration values belong there, not scattered through component code.',
          "All springs respect the OS setting. Use reducedMotion: 'user' on the native target animation. When reduced motion is enabled, position changes drop out and opacity fades remain.",
        ],
        headings: ['Reduced motion'],
        items: [],
      },
    ],
  },
  reveal: {
    title: 'Reveal',
    lead: '1 class reveals a whole page, on load and on scroll.',
    intro: '',
    sections: [
      {
        title: 'Landing',
        paragraphs: [
          '2 modes, default and subtle, for a page read once: each section arrives as the reader reaches it, so the page tells its story in order. Add reveal-landing or reveal-landing-subtle to its container.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Product',
        paragraphs: [
          '2 modes, default and subtle, for the app people come back to: the screen settles in once and nothing moves on scroll, so the 10th visit stays as calm as the first. Add reveal-product or reveal-product-subtle to its main column.',
          'Slow data shows RevealSkeleton. Wrap it and the real block in reveal-swap, and add reveal-items to both for rows one by one.',
        ],
        headings: [],
        items: [],
      },
      { title: 'Reference', paragraphs: [], headings: [], items: [] },
    ],
  },
  scrollbars: {
    title: 'Scrollbars',
    lead: 'A scrollbar that stays out of the way but never disappears.',
    intro: '',
    sections: [
      {
        title: 'The problem',
        paragraphs: [
          "macOS hides the scrollbar until you start scrolling, so a clipped list gives no sign it has more below. And the moment it does appear, it's the grey OS default sitting on top of your design. You either get no affordance or the wrong one.",
        ],
        headings: [],
        items: [],
      },
      {
        title: 'The scrollbar',
        paragraphs: [
          'The thumb rests narrow and low-contrast, then widens and darkens on hover so it stays quiet until you reach for it. Press R to see the radius follow the shape system. On touch-primary devices the whole thing steps aside for native overflow scrolling, where platform physics beat any custom scrollbar.',
          'The original ships in Radix and Base UI variants. This page uses the native Foldkit ScrollArea. Original scrollbar machinery adapted from Lina.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'The fade',
        paragraphs: [
          "The baseline edge treatment is shadcn's scroll-fade, vendored as a CSS utility in the shared stylesheet. A mask dissolves the content toward the edges that have more to scroll, and a scroll-driven animation keeps the true start and end crisp. Drop scroll-fade (or scroll-fade-x ) on the viewport and it rides under the scrollbar — no JavaScript.",
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Examples',
        paragraphs: [
          'A row wider than its container, faded with the x variant.',
          'A table taller and wider than its box. orientation="both" adds both scrollbars and the corner.',
        ],
        headings: ['Horizontal', 'Double overflow'],
        items: [],
      },
      { title: 'API reference', paragraphs: [], headings: ['ScrollArea'], items: [] },
    ],
  },
  sizes: {
    title: 'Sizes',
    lead: 'Two component sizes: a 36px default and a 28px compact. Press S to toggle on the website.',
    intro: '',
    sections: [
      {
        title: 'The principle',
        paragraphs: [
          'An interface reads as one product when its controls share a sizing rhythm. A button next to a select next to a tab should land on the same height.',
          'Each size scales text, icons, and padding together.',
          'Compact is for dense, data-heavy tools; default is the right call for everything else.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Typography scale',
        paragraphs: [
          'Type follows the ladder. Compact drops the type roles one notch, size and leading together, so a dense screen keeps the same hierarchy at a smaller size. The full scale lives on Typography.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Compact regions',
        paragraphs: [
          'Density is a region decision, not a per-control one. SizeProvider supplies one native presentation context to its region; pass that context to menus as well, including their portalled content.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Token reference',
        paragraphs: [
          'The table, measured live: hover a control below and every number in the readout is a token from this table. Flip the step and the element re-measures under your cursor.',
        ],
        headings: [],
        items: [],
      },
      { title: 'SizeProvider props', paragraphs: [], headings: [], items: [] },
      { title: 'Component size prop', paragraphs: [], headings: [], items: [] },
    ],
  },
  skill: {
    title: '/fluid-functionalism skill',
    lead: 'Gives your coding agent the components and the craft behind them, then puts both to work on your project.',
    intro: '',
    sections: [
      { title: 'What it does', paragraphs: [], headings: [], items: [] },
      {
        title: 'What it knows',
        paragraphs: [
          'The craft behind every component, distilled from its implementation and code comments: exact values, interaction rules, edge cases, and why each detail matters. Once the FF components are in place, your agent uses this knowledge to apply the final layer of craft to your interface, from spacing and alignment to motion and feedback.',
        ],
        headings: [],
        items: [],
      },
    ],
  },
  surfaces: {
    title: 'Surfaces',
    lead: 'Eight surface levels that nest. Components read their substrate from context and lift relative to it, so popovers, dropdowns, and dialogs stay visible at any depth — in both light and dark mode.',
    intro: '',
    sections: [
      {
        title: 'The problem',
        paragraphs: [
          'In light mode, we use shadow behind white surfaces to signify elevation. In dark mode, we use progressively lighter backgrounds instead.',
          'But traditional components have a fixed background — a dropdown often ends up the same color as the dialog it sits in. That makes your interface look like this:',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'The solution',
        paragraphs: [
          'Three pieces: tokens, substrate context, and the primitive.',
          'Eight bg/shadow pairs. Light mode flattens to white after step 2 (shadow alone carries elevation). Dark mode keeps adding white-opacity plus a layered shadow recipe.',
          'Each container knows its own level and tells whatever opens inside. A popover on the page and the same popover inside a dialog both end up at the right depth, by carrying the current native presentation context into nested content.',
          "Wrap a panel and the background settles at the level it belongs to. The shadow doesn't change, so a popover still reads as a popover three layers down.",
          'Drag both knobs to choose which slice of the ladder to nest. Each layer lifts a single step off the one it sits in — whether you span two levels or all eight.',
        ],
        headings: ['Tokens', 'Substrate', 'Elevated', 'Move through levels'],
        items: [],
      },
      {
        title: 'Examples',
        paragraphs: [
          'Dialog at surface 5, role picker at surface 7 — both derive their level from the current native presentation context.',
          'The format dropdown sits one level above the picker panel.',
        ],
        headings: ['Invite dialog', 'Color picker'],
        items: [],
      },
    ],
  },
  typography: {
    title: 'Typography',
    lead: 'Bold rules that create consistency across the whole component library.',
    intro:
      'Typography is hard. Every style you add makes it clunkier, so building this page was mostly cutting and refactoring until only the essential rules remained. Those rules power every component in the library, and each one is simple. Defining them and applying them on every surface is what makes it hard. Good rules hold every kind of component, and every component holds to them. Enjoy!',
    sections: [
      {
        title: '5 rules',
        paragraphs: [],
        headings: [],
        items: [
          '5 styles for the whole site, from page titles to captions.',
          '3 weights: regular for text, semibold for headings and selected items, bold for page titles.',
          '2 text colors: foreground and muted.',
          '1 font family: Inter Variable 4.0. Headings can switch to Geist Serif or any Google Fonts family.',
          '1 paragraph style.',
        ],
      },
      {
        title: '5 no-gos',
        paragraphs: [],
        headings: [],
        items: [
          'No uppercase: hierarchy comes from size and weight.',
          "No letter-spacing: handled with Inter's optical sizing.",
          'No eyebrows: a section starts with its title.',
          'No difference with markdown: it uses the same styles and colors as everything else.',
          "No opacity for text: it's foreground or muted, never a faded step of them.",
        ],
      },
      {
        title: 'The scale',
        paragraphs: ['5 styles, each a size and a line height. Press S for compact.'],
        headings: [],
        items: [],
      },
      {
        title: 'Heading font',
        paragraphs: [
          '3 choices for headings: Inter, Geist Serif, or any Google Fonts family. Geist Serif runs the display style 4px larger, in its one Regular cut. Press F to cycle.',
        ],
        headings: [],
        items: [],
      },
      {
        title: 'Markdown',
        paragraphs: ['Markdown gets the same 5 styles, to-dos and tables included.'],
        headings: [],
        items: [],
      },
      {
        title: 'Spacing',
        paragraphs: ['Space only goes above a block, so streaming text never shifts.'],
        headings: [],
        items: [],
      },
      {
        title: '5 tweaks',
        paragraphs: [
          'Small details that keep text still, snug in its box, and evenly wrapped.',
          'Each weight carries its own optical size, so semibold labels keep their width. Idea from @lochieaxon.',
          'Changing numbers use tabular-nums so every digit is the same width and the words after them hold still.',
          'Labels use text-box: trim-both cap alphabetic so the padding you set is the space you see. Idea from @jakubkrehel.',
          'Headings use text-wrap: balance so their lines come out even.',
          'Paragraphs use text-wrap: pretty so none ends on a lone word.',
        ],
        headings: [
          'Weight without reflow',
          'Steady numbers',
          'Trimmed labels',
          'Balanced headings',
          'Pretty paragraphs',
        ],
        items: [],
      },
    ],
  },
}
