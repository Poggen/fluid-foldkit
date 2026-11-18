import { DataComponents } from './authored-composition'
import {
  referenceSection,
  referenceMuted,
  referenceHeading,
  previewToolbar,
  authoredPreview,
} from './classes'
import { codeBlock } from '../../../components/docs/code-block'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import type { AuthoredExamplesBlock } from './authored-block'
import type { AuthoredViewRenderer } from './authored-view'
import {
  Calendar,
  Banner,
  Chat,
  Questions,
  Dialogs,
  Dates,
  Sidebars,
  Messages,
  Commands,
  Standalone,
  Single,
  Multiple,
  Highlight,
  PreviewTabs,
  Forms,
  Controls,
  Charts,
  Menus,
  Thinking,
  Surfaces,
  Copy,
  Colors,
  Choices,
  Tooltip,
} from './authored-composition'

import { authoredFeature } from './authored-routes'

/* @license Derived from Fluid Functionalism cc276ca0 docs. MIT, copyright 2026 Micka Touillaud. */
import { AccordionItem, AccordionTrigger, AccordionContent } from '@foldkit-visuals/fluid/accordion'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Option } from 'effect'

import type { AccordionViewInputs } from '@foldkit-visuals/fluid/accordion'
import type { Html } from 'foldkit/html'
import { highlight, motion, target } from '../motion'
import { presentation } from '../settings'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { standaloneRows, singleRows, multipleRows, highlightRows } from './accordion-data'

export const renderAuthoredView = (
  AuthoredMessage: typeof AuthoredExamplesBlock.Message,
  ...[model, inputs, h]: Parameters<AuthoredViewRenderer>
) => {
  if (!inputs.ready) return h.empty
  if (
    authoredFeature(inputs.slug) === 'data-components' &&
    Option.isSome(model.maybeDataComponents)
  )
    return h.block(
      DataComponents.embedView({
        slotId: `authored-${inputs.slug}`,
        model: model.maybeDataComponents.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'sidebars' && Option.isSome(model.maybeSidebars))
    return h.block(
      Sidebars.embedView({
        slotId: 'authored-sidebars',
        model: model.maybeSidebars.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'messages' && Option.isSome(model.maybeMessages))
    return h.block(
      Messages.embedView({
        slotId: 'authored-messages',
        model: model.maybeMessages.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'commands' && Option.isSome(model.maybeCommands))
    return h.block(
      Commands.embedView({
        slotId: 'authored-commands',
        model: model.maybeCommands.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'forms' && Option.isSome(model.maybeForms))
    return h.block(
      Forms.embedView({
        slotId: 'authored-forms',
        model: model.maybeForms.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'controls' && Option.isSome(model.maybeControls))
    return h.block(
      Controls.embedView({
        slotId: 'authored-controls',
        model: model.maybeControls.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'charts' && Option.isSome(model.maybeCharts))
    return h.block(
      Charts.embedView({
        slotId: 'authored-charts',
        model: model.maybeCharts.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'menus' && Option.isSome(model.maybeMenus))
    return h.block(
      Menus.embedView({
        slotId: 'authored-menus',
        model: model.maybeMenus.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'thinking' && Option.isSome(model.maybeThinking))
    return h.block(
      Thinking.embedView({
        slotId: 'authored-thinking',
        model: model.maybeThinking.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'surfaces' && Option.isSome(model.maybeSurfaces))
    return h.block(
      Surfaces.embedView({
        slotId: 'authored-surfaces',
        model: model.maybeSurfaces.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'copy' && Option.isSome(model.maybeCopy))
    return h.block(
      Copy.embedView({
        slotId: 'authored-copy',
        model: model.maybeCopy.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'colors' && Option.isSome(model.maybeColors))
    return h.block(
      Colors.embedView({
        slotId: 'authored-colors',
        model: model.maybeColors.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'choices' && Option.isSome(model.maybeChoices))
    return h.block(
      Choices.embedView({
        slotId: 'authored-choices',
        model: model.maybeChoices.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'tooltip' && Option.isSome(model.maybeTooltip))
    return h.block(
      Tooltip.embedView({ slotId: 'authored-tooltip', model: model.maybeTooltip.value }),
    )
  if (authoredFeature(inputs.slug) === 'calendar' && Option.isSome(model.maybeCalendar))
    return h.block(
      Calendar.embedView({ slotId: 'authored-calendar', model: model.maybeCalendar.value }),
    )
  if (authoredFeature(inputs.slug) === 'banner' && Option.isSome(model.maybeBanner))
    return h.block(
      Banner.embedView({
        slotId: 'authored-banner',
        model: model.maybeBanner.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'chat' && Option.isSome(model.maybeChat))
    return h.block(Chat.embedView({ slotId: 'authored-chat', model: model.maybeChat.value }))
  if (authoredFeature(inputs.slug) === 'questions' && Option.isSome(model.maybeQuestions))
    return h.block(
      Questions.embedView({
        slotId: 'authored-questions',
        model: model.maybeQuestions.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'dialogs' && Option.isSome(model.maybeDialogs))
    return h.block(
      Dialogs.embedView({
        slotId: 'authored-dialogs',
        model: model.maybeDialogs.value,
        viewInputs: inputs,
      }),
    )
  if (authoredFeature(inputs.slug) === 'dates' && Option.isSome(model.maybeDates))
    return h.block(
      Dates.embedView({
        slotId: 'authored-dates',
        model: model.maybeDates.value,
        viewInputs: inputs,
      }),
    )
  const context = presentation(inputs.settings)
  const section = (
    title: string,
    description: string,
    content: ReadonlyArray<Html>,
    code: string,
  ) => {
    const tabs = model.previewTabs[title]
    const tabsId = previewCodeTabId('authored', title)
    const pane = tabs?.tabs.selectedIndex === 1 ? 'code' : 'preview'
    return h.section(
      [h.Class(referenceSection), h.AriaLabel(title)],
      [
        h.h2([h.Class(referenceHeading)], [title]),
        ...(description ? [h.p([h.Class(referenceMuted)], [description])] : []),
        h.div(
          [
            h.Class(
              `relative isolate flex flex-col gap-0 w-full border border-border/60 transition-[border-color] duration-150 ease-out focus-within:border-foreground/40 ${resolvePresentation({ context }).shape.container} authored-frame`,
            ),
          ],
          [
            h.div(
              [h.Class(previewToolbar)],
              tabs === undefined
                ? []
                : [
                    h.block(
                      PreviewTabs.embedView({
                        key: title,
                        slotId: tabs.tabs.id,
                        model: tabs,
                        viewInputs: previewCodeTabsViewInputs(h, {
                          context,
                          animate: target.node,
                          ariaLabel: `${title} view`,
                        }),
                      }),
                    ),
                  ],
            ),
            h.div(
              [
                h.Id(`${tabsId}-panel-0`),
                h.Role('tabpanel'),
                h.AriaLabelledBy(`${tabsId}-tab-0`),
                h.Class(
                  pane === 'preview'
                    ? `${authoredPreview} ${['Standalone', 'Single Expand', 'Multi Expand', 'Row highlight'].includes(title) ? 'items-start' : 'items-center'}`
                    : 'hidden',
                ),
              ],
              content,
            ),
            h.div(
              [
                h.Id(`${tabsId}-panel-1`),
                h.Role('tabpanel'),
                h.AriaLabelledBy(`${tabsId}-tab-1`),
                h.Class(pane === 'code' ? '' : 'hidden'),
              ],
              pane === 'code' ? [codeBlock({ code, label: `${title} code`, context }, h)] : [],
            ),
          ],
        ),
      ],
    )
  }
  if (inputs.slug === 'button') {
    const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] as const
    const labels = ['Primary', 'Secondary', 'Tertiary', 'Ghost', 'Delete']
    return h.div(
      [],
      [
        section(
          'Variants',
          '5 variants, inline or full width: add className="w-full" to stretch one to its container.',
          [
            h.div(
              [h.Class('authored-button-variants flex w-fit max-w-full flex-col gap-8')],
              [
                h.div(
                  [h.Class('flex flex-wrap items-center gap-2')],
                  variants.map((variant, index) =>
                    Button({ context, variant, children: [labels[index] ?? variant] }, h),
                  ),
                ),
                h.div(
                  [h.Class('flex flex-col gap-2')],
                  variants.map((variant, index) =>
                    Button(
                      {
                        context,
                        variant,
                        className: 'w-full',
                        children: [labels[index] ?? variant],
                      },
                      h,
                    ),
                  ),
                ),
              ],
            ),
          ],
          variants
            .map(
              (variant, index) =>
                `Button({ context, variant: '${variant}', children: ['${labels[index] ?? variant}'] }, h)`,
            )
            .join('\n'),
        ),
        section(
          'With Icons',
          '',
          [
            h.div(
              [h.Class('flex flex-wrap items-center gap-2')],
              [
                Button({ context, leadingIcon: defaultIcons.plus, children: ['Create'] }, h),
                Button(
                  {
                    context,
                    variant: 'secondary',
                    trailingIcon: defaultIcons['arrow-right'],
                    children: ['Next'],
                  },
                  h,
                ),
                Button(
                  {
                    context,
                    variant: 'tertiary',
                    leadingIcon: defaultIcons.search,
                    trailingIcon: defaultIcons['arrow-right'],
                    children: ['Search'],
                  },
                  h,
                ),
              ],
            ),
          ],
          "Button({ context, leadingIcon: defaultIcons.plus, children: ['Create'] }, h)",
        ),
        section(
          'Loading & Disabled',
          '',
          [
            h.div(
              [h.Class('flex flex-wrap items-center gap-2')],
              [
                Button(
                  {
                    context,
                    loading: model.isLoading,
                    attributes: [h.OnClick(AuthoredMessage.ClickedLoad())],
                    children: ['Click me'],
                  },
                  h,
                ),
                Button(
                  {
                    context,
                    variant: 'secondary',
                    loading: true,
                    leadingIcon: defaultIcons.loader,
                    children: ['Saving'],
                  },
                  h,
                ),
                Button({ context, disabled: true, children: ['Disabled'] }, h),
              ],
            ),
          ],
          "Button({ context, loading, children: ['Click me'] }, h)\nButton({ context, variant: 'secondary', loading: true, children: ['Saving'] }, h)\nButton({ context, disabled: true, children: ['Disabled'] }, h)",
        ),
      ],
    )
  }
  if (inputs.slug !== 'accordion') return h.empty
  const accordionInputs: (rows: typeof standaloneRows) => AccordionViewInputs = (
    rows: typeof standaloneRows,
  ) => ({
    context,
    animate: motion.node,
    animateHighlight: highlight,
    content: (accordion) =>
      rows.map(({ value, title, content }, index) =>
        AccordionItem(
          {
            value,
            index,
            children: (item) => [
              AccordionTrigger({ value, children: [title] }, item, h),
              AccordionContent({ value, children: [content] }, item, h),
            ],
          },
          accordion,
          h,
        ),
      ),
  })
  return h.div(
    [],
    [
      section(
        'Standalone',
        'A single collapsible item with its own hover state.',
        [
          h.block(
            Standalone.embedView({
              slotId: 'standalone',
              model: model.standalone,
              viewInputs: accordionInputs(standaloneRows),
            }),
          ),
        ],
        "Standalone.embedView({ slotId: 'standalone', model: model.standalone, viewInputs })",
      ),
      section(
        'Single Expand',
        'Multiple items with fluid hover — only one can be expanded at a time.',
        [
          h.block(
            Single.embedView({
              slotId: 'single',
              model: model.single,
              viewInputs: accordionInputs(singleRows),
            }),
          ),
        ],
        "Single.embedView({ slotId: 'single', model: model.single, viewInputs })",
      ),
      section(
        'Multi Expand',
        'Multiple items with fluid hover — several can be expanded at once.',
        [
          h.block(
            Multiple.embedView({
              slotId: 'multiple',
              model: model.multiple,
              viewInputs: accordionInputs(multipleRows),
            }),
          ),
        ],
        "Multiple.embedView({ slotId: 'multiple', model: model.multiple, viewInputs })",
      ),
      section(
        'Row highlight',
        'With highlight="trigger" an expanded item holds no tint — the fill scopes to the row and waits for hover. Suits dense panels, where a block per open item reads as a second layer.',
        [
          h.block(
            Highlight.embedView({
              slotId: 'highlight',
              model: model.highlight,
              viewInputs: accordionInputs(highlightRows),
            }),
          ),
        ],
        "Highlight.embedView({ slotId: 'highlight', model: model.highlight, viewInputs })",
      ),
    ],
  )
}
