import { systemClasses } from './classes'
/* @license Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { shapeMap } from '@foldkit-visuals/fluid/tokens'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Button } from '@foldkit-visuals/fluid/button'
import {
  TabsBlock,
  TabsItem,
  layer as TabsLayer,
  type TabsConfig,
} from '@foldkit-visuals/fluid/tabs'
import {
  DropdownBlock,
  layer as MenuLayer,
  type DropdownConfig,
} from '@foldkit-visuals/fluid/dropdown'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import {
  InputCopyBlock,
  type InputCopyConfig,
  InputCopyResources,
  layer as InputCopyLayer,
} from '@foldkit-visuals/fluid/input-copy'
import { ComponentPresentation, presentation } from '../settings'
import { target } from '../motion'
import { copy, example, page, section, type PageInputs } from './view'

const command = 'npx skills add mickadesign/fluid-functionalism'
const labels = ['Overview', 'Activity', 'Settings']
const folders = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash']
const counts = [12, 3, 48, 210, 7]
const key = Symbol('SkillSystemPage')
const SkillSystemPageBlock = Block.make('SkillSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    tabs: TabsBlock.Model,
    menu: DropdownBlock.Model,
    copy: InputCopyBlock.Model,
    genericTab: Schema.Int,
    genericPressed: Schema.NullOr(Schema.Int),
    genericFolder: Schema.Int,
    genericCopy: Schema.Literals(['idle', 'copied', 'error']),
  }),
  Message: defineMessageUnion({
    SelectedGenericTab: { index: Schema.Int },
    PressedGenericButton: { index: Schema.Int },
    ReleasedGenericButton: {},
    SelectedGenericFolder: { index: Schema.Int },
    RequestedGenericCopy: {},
    CompletedGenericCopy: { ok: Schema.Boolean },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<never, DropdownResources | InputCopyResources>(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { SkillSystemPageBlock as SkillPageBlock }
const RawTabs = SkillSystemPageBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: (settings: ComponentPresentation) =>
      [{ id: 'system-skill-tabs', selectedIndex: 0, hoverMode: settings.hover }] satisfies [
        TabsConfig,
      ],
  },
})
const Tabs = RawTabs.withOutMessagePolicy({
  fold: SkillSystemPageBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) => RawTabs.requestSelected({ selectedIndex: index }),
  }),
})
const RawMenu = SkillSystemPageBlock.makeRequiredFieldBinding(DropdownBlock, {
  field: 'menu',
  init: {
    contextToArgs: (settings: ComponentPresentation) =>
      [{ id: 'system-skill-menu', checkedIndex: 0, hoverMode: settings.hover }] satisfies [
        DropdownConfig,
      ],
  },
})
const Menu = RawMenu.withOutMessagePolicy({
  fold: SkillSystemPageBlock.makeOutMessageFold(DropdownBlock, {
    Events: ({ events }) =>
      Update.combineSteps(
        events.flatMap((event) =>
          event._tag === 'Selected'
            ? [
                RawMenu.requestSelection({
                  selection: {
                    checkedIndex: Option.some(Number(event.index)),
                    checkedIndices: Option.none(),
                  },
                }),
              ]
            : [],
        ),
      ),
  }),
})
const Copy = SkillSystemPageBlock.makeRequiredFieldBinding(InputCopyBlock, {
  field: 'copy',
  init: {
    contextToArgs: () =>
      [{ id: 'system-skill-copy', value: command, variant: 'button', align: 'left' }] satisfies [
        InputCopyConfig,
      ],
  },
}).withOutMessagePolicy({
  fold: SkillSystemPageBlock.makeOutMessageFold(InputCopyBlock, {
    Events: SkillSystemPageBlock.makeNoopStep,
  }),
})
const CopyGeneric = SkillSystemPageBlock.makeCommand('CopyGeneric', {
  messages: [SkillSystemPageBlock.Message.CompletedGenericCopy],
  *handler() {
    const resources = yield* InputCopyResources
    return () =>
      resources
        .copy(command)
        .pipe(Effect.map((ok) => SkillSystemPageBlock.Message.CompletedGenericCopy({ ok })))
  },
})
const SkillSystemPageComposition = SkillSystemPageBlock.makeComposition({
  bindings: [Tabs, Menu, Copy],
})
const implementation = {
  init: SkillSystemPageComposition.makeInit((settings) => ({
    model: { genericTab: 0, genericFolder: 0, genericCopy: 'idle', genericPressed: null },
    childInitContext: settings,
  })),
  update: SkillSystemPageComposition.makeUpdate({
    PressedGenericButton: SkillSystemPageBlock.makeFieldsStep.fromMessage(({ index }) => ({
      genericPressed: () => index,
    })),
    ReleasedGenericButton: SkillSystemPageBlock.makeFieldsStep(() => ({
      genericPressed: () => null,
    })),
    SelectedGenericTab: SkillSystemPageBlock.makeFieldsStep.fromMessage(({ index }) => ({
      genericTab: () => index,
    })),
    SelectedGenericFolder: SkillSystemPageBlock.makeFieldsStep.fromMessage(({ index }) => ({
      genericFolder: () => index,
    })),
    RequestedGenericCopy: SkillSystemPageBlock.makeStep((model) => ({
      model,
      commands: [CopyGeneric()],
    })),
    CompletedGenericCopy: SkillSystemPageBlock.makeFieldsStep.fromMessage(({ ok }) => ({
      genericCopy: () => (ok ? 'copied' : 'error'),
    })),
  }),
  inMessageUpdate: SkillSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: SkillSystemPageBlock.makeStep((_model, { presentation: next }) =>
      Update.combineSteps([
        Tabs.requestHoverMode({ mode: next.hover }),
        Menu.requestHoverMode({ mode: next.hover }),
      ]),
    ),
  }),
  EffectsLayer: CopyGeneric.layer,
  view: SkillSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings)
    const compare = (
      label: string,
      generic: ReturnType<typeof h.div>,
      crafted: ReturnType<typeof h.div>,
    ) =>
      example(
        h,
        label,
        [
          h.div(
            [h.Class('relative grid w-full max-w-xl gap-5 sm:grid-cols-2')],
            [
              h.div([h.Class(systemClasses.comparisonSide)], [h.p([], ['Generic']), generic]),
              h.div(
                [h.Class(systemClasses.comparisonSide)],
                [h.p([], ['With the craft']), crafted],
              ),
            ],
          ),
        ],
        settings,
      )
    return page(h, 'skill', settings, [
      section(h, 'What it does', [
        h.ol(
          [],
          [
            h.li([], [h.strong([], ['Read your stack. ']), 'To understand your project.']),
            h.li(
              [],
              [
                h.strong([], ['Suggests 2 to 5 upgrades. ']),
                'Ranked by what your users will notice.',
              ],
            ),
            h.li([], [h.strong([], ['Aligns your UI. ']), 'Installs what fits, matches the rest.']),
          ],
        ),
        h.p(
          [],
          [
            'The original Fluid Functionalism skill teaches the React registry and its design rules. This native showcase translates those interactions to Foldkit; installing the upstream skill does not install a Foldkit-specific skill.',
          ],
        ),
        h.a(
          [
            h.Href(
              'https://github.com/mickadesign/fluid-functionalism/tree/main/skills/fluid-functionalism',
            ),
          ],
          ['Original Fluid Functionalism skill and installation instructions'],
        ),
        h.p(
          [],
          [
            'Its bundled script reads the stack fresh on each run, selects the matching registry flavor, and leaves no audit file in the project. The skill also carries the component catalog, interaction design decisions, and rules for custom motion.',
          ],
        ),
        h.blockquote(
          [],
          [
            h.p(
              [],
              [
                'Original agent prompt: Install the fluid-functionalism skill with `npx skills add mickadesign/fluid-functionalism -g -y` (skip this if you already have it). Then read its SKILL.md and use it to audit this project.',
              ],
            ),
          ],
        ),
        h.pre([], [h.code([], ['npx skills add mickadesign/fluid-functionalism -g -y'])]),
        h.p(
          [],
          [
            'Run the original installer in the project where you want that skill. These examples only copy the command after a real click.',
          ],
        ),
      ]),
      section(h, 'What it knows', copy(h, 'skill', 'What it knows')),
      section(h, 'Examples', [
        h.p(
          [],
          [
            'What an agent writes on its own, next to the details the original skill teaches. Try both sides with your pointer and keyboard.',
          ],
        ),
        h.h3([h.Class(systemClasses.heading)], ['Tabs']),
        h.p(
          [],
          [
            'Active labels get heavier without shifting neighboring tabs. The native Tabs owns focus, keyboard navigation, selection, and the sliding pill.',
          ],
        ),
        compare(
          'Compare tabs',
          h.div(
            [h.Class('inline-flex'), h.Role('group'), h.AriaLabel('Generic tabs')],
            labels.map((label, index) =>
              h.button(
                [
                  h.Type('button'),
                  h.Class(
                    [
                      systemClasses.genericControl,
                      model.genericTab === index
                        ? 'bg-muted font-semibold text-foreground [&:is(:hover,[data-script-hover])]:bg-muted'
                        : '',
                      shapeMap[settings.shape].bg,
                    ].join(' '),
                  ),
                  h.AriaPressed(String(model.genericTab === index)),
                  h.OnClick(SkillSystemPageBlock.Message.SelectedGenericTab({ index })),
                ],
                [label],
              ),
            ),
          ),
          h.div(
            [],
            [
              h.block(
                Tabs.embedView({
                  slotId: model.tabs.id,
                  model: model.tabs,
                  viewInputs: {
                    context,
                    animate: target.node,
                    items: labels.map((value) => ({ value })),
                    content: (tab) =>
                      labels.map((label, index) => TabsItem({ index, label }, tab, h)),
                  },
                }),
              ),
            ],
          ),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Menu']),
        h.p(
          [],
          [
            'One highlight follows your pointer smoothly between menu items. The selected row keeps a stable label width and a reserved check slot.',
          ],
        ),
        compare(
          'Compare menus',
          h.div(
            [h.Class(systemClasses.genericMenu)],
            folders.map((label, index) =>
              h.button(
                [
                  h.Type('button'),
                  h.Class(
                    [
                      systemClasses.genericMenuRow,
                      '[&:is(:hover,[data-script-hover])]:bg-selected dark:[&:is(:hover,[data-script-hover])]:bg-selected',
                      model.genericFolder === index
                        ? 'bg-selected/50 font-bold dark:bg-accent/40'
                        : '',
                      shapeMap[settings.shape].item,
                    ].join(' '),
                  ),
                  h.AriaPressed(String(model.genericFolder === index)),
                  h.OnClick(SkillSystemPageBlock.Message.SelectedGenericFolder({ index })),
                ],
                [
                  label,
                  h.span(
                    [h.Class('text-site-caption tabular-nums text-muted-foreground')],
                    [String(counts[index])],
                  ),
                  ...(model.genericFolder === index
                    ? [
                        defaultIcons.check(
                          { size: 16, strokeWidth: 2, className: 'ml-auto size-4 shrink-0' },
                          h,
                        ),
                      ]
                    : []),
                ],
              ),
            ),
          ),
          h.div(
            [],
            [
              h.block(
                Menu.embedView({
                  slotId: 'system-skill-menu-view',
                  model: model.menu,
                  viewInputs: {
                    context,
                    animate: target.node,
                    content: (menu) =>
                      folders.map((label, index) =>
                        DropdownItem(
                          {
                            index,
                            label,
                            checked: menu.checkedIndex === index,
                            closeOnClick: false,
                            animate: target.node,
                            children: [
                              h.span([h.Class(systemClasses.folderCount)], [String(counts[index])]),
                            ],
                          },
                          menu,
                          h,
                        ),
                      ),
                  },
                }),
              ),
            ],
          ),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Copy field']),
        h.p(
          [],
          [
            'Hover and click anywhere on the text to copy. The native InputCopy reserves its feedback width and owns the success, error, and expiry lifecycle.',
          ],
        ),
        compare(
          'Compare copy fields',
          h.div(
            [h.Class(systemClasses.genericCopy)],
            [
              h.code([], [command]),
              h.button(
                [
                  h.Type('button'),
                  h.Class(systemClasses.genericCopyAction),
                  h.OnClick(SkillSystemPageBlock.Message.RequestedGenericCopy()),
                ],
                [
                  model.genericCopy === 'idle'
                    ? 'Copy'
                    : model.genericCopy === 'copied'
                      ? 'Copied!'
                      : 'Failed',
                ],
              ),
            ],
          ),
          h.div(
            [],
            [
              h.block(
                Copy.embedView({
                  slotId: model.copy.id,
                  model: model.copy,
                  viewInputs: {
                    context,
                    animate: target.node,
                    label: 'Original skill installer',
                    tooltip: () => h.empty,
                  },
                }),
              ),
            ],
          ),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Button press']),
        h.p(
          [],
          [
            'Buttons press by one pixel per side, regardless of width. A percentage scale squashes the wider button much more. Press and hold to compare.',
          ],
        ),
        compare(
          'Compare button presses',
          h.div(
            [h.Class(systemClasses.skillButtons)],
            ['Skip', 'Continue'].map((label, index) =>
              h.button(
                [
                  h.Type('button'),
                  h.DataAttribute('pressed', String(model.genericPressed === index)),
                  h.OnPointerDown(() =>
                    Option.some(SkillSystemPageBlock.Message.PressedGenericButton({ index })),
                  ),
                  h.OnPointerUp(() =>
                    Option.some(SkillSystemPageBlock.Message.ReleasedGenericButton()),
                  ),
                  h.OnPointerLeave(() =>
                    Option.some(SkillSystemPageBlock.Message.ReleasedGenericButton()),
                  ),
                  h.Class(
                    [
                      'relative inline-flex items-center justify-center text-background outline-none',
                      label === 'Skip'
                        ? 'h-7 px-3 text-site-caption'
                        : 'h-9 w-full max-w-64 text-site-body',
                      'bg-foreground transition-[scale,background-color] duration-150 ease-out',
                      '[&:is(:hover,[data-script-hover]):not([data-pressed=true])]:bg-foreground/90',
                      model.genericPressed === index
                        ? 'scale-90 bg-[color-mix(in_oklab,var(--foreground)_80%,var(--background))]'
                        : '',
                      shapeMap[settings.shape].bg,
                    ].join(' '),
                  ),
                ],
                [label],
              ),
            ),
          ),
          h.div(
            [h.Class(systemClasses.skillButtons)],
            ['Skip', 'Continue'].map((label) =>
              Button(
                {
                  context,
                  children: [label],
                  buttonSize: label === 'Skip' ? 'compact' : 'default',
                  className:
                    label === 'Skip'
                      ? // oxlint-disable-next-line foldkit-design/no-restyle -- Original app/docs/skill/examples.tsx:223 at cc276ca0 demonstrates this exact compact size.
                        'h-7 px-3 text-site-caption'
                      : // oxlint-disable-next-line foldkit-design/no-restyle -- Original app/docs/skill/examples.tsx:224 at cc276ca0 demonstrates this exact wide size.
                        'h-9 w-full max-w-64 text-site-body',
                },
                h,
              ),
            ),
          ),
        ),
      ]),
    ])
  }),
}
export const layer = SkillSystemPageBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.mergeAll(TabsLayer, MenuLayer, InputCopyLayer)),
)
