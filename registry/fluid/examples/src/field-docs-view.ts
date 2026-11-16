import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs.js'
import { docSection } from './doc-section.js'
import source from './field-docs-view.ts?raw'
import { fieldPreviewClass } from './form-docs-layout.js'
import type { Html } from 'foldkit/html'
import { Button } from '@foldkit-visuals/fluid/button'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldSeparator,
  FieldDescription,
  FieldError,
} from '@foldkit-visuals/fluid/field'
import { FieldDocsComposition, Message, DocTabs, motion } from './field-docs-definition.js'
import { profileViews } from './field-docs-profile-view.js'
import { choicesViews } from './field-docs-choices-view.js'
import { detailsViews } from './field-docs-details-view.js'

export const view = FieldDocsComposition.makeView((model, h) => {
  const p = { shape: model.shape, size: model.size }

  const section = (title: string, children: ReadonlyArray<Html>) =>
    model.isEmbedded
      ? docSection(h, {
          title,
          children,
          source,
          presentation: p,
          pane: model.docTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId('field', title),
          tabs: (() => {
            const child = model.docTabs[title]
            return child === undefined
              ? h.empty
              : h.block(
                  DocTabs.embedView({
                    key: title,
                    slotId: child.tabs.id,
                    model: child,
                    viewInputs: previewCodeTabsViewInputs(h, {
                      ...p,
                      animate: motion.node,
                      ariaLabel: `${title} view`,
                    }),
                  }),
                )
          })(),
          className: fieldPreviewClass(title),
        })
      : h.section(
          [h.Class('flex flex-col gap-4')],
          [
            h.h2([h.Class('text-lg')], [title]),
            h.div(
              [
                h.Class(
                  `relative flex items-center justify-center min-h-[120px] border border-border/60 bg-background px-4 py-12 sm:px-8 ${resolvePresentation(p).shape.container}`,
                ),
              ],
              [h.div([h.Class(fieldPreviewClass(title))], children)],
            ),
          ],
        )

  const { companyView, contactView, conductView, notesView, stageView } = profileViews(model, h)
  const { repliesView, mentionsView, kubeView, vmView } = choicesViews(model, h)

  const {
    usernameView,
    feedbackView,
    streetView,
    cityView,
    zipView,
    workEmailView,
    ssoView,
    departmentView,
    languageView,
  } = detailsViews(model, h)

  return h.div(
    [h.Class(model.isEmbedded ? '' : 'mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10')],
    [
      model.isEmbedded ? null : h.h1([h.Class('text-2xl')], ['Field']),
      model.isEmbedded
        ? null
        : h.p(
            [h.Class('text-muted-foreground')],
            ['Labels, controls, help text, and errors composed into accessible form fields.'],
          ),
      section('Form', [
        h.form(
          [
            h.OnSubmit(Message.Submitted()),
            h.Attribute('novalidate', ''),
            h.Class('flex w-full max-w-sm flex-col gap-6'),
          ],
          [
            FieldSet(
              {
                children: [
                  FieldLegend({ ...p, children: ['Request to join'] }, h),
                  FieldDescription(
                    { ...p, children: ['We read every request before the event.'] },
                    h,
                  ),
                  FieldGroup(
                    { children: [companyView, contactView, stageView, conductView, notesView] },
                    h,
                  ),
                ],
              },
              h,
            ),
            h.div(
              [h.Class('flex flex-col gap-2')],
              [
                Button(
                  {
                    ...p,
                    attributes: [h.Type('submit')],
                    className: 'w-full',
                    children: ['Request to Join'],
                  },
                  h,
                ),
                model.isSent
                  ? FieldDescription(
                      {
                        ...p,
                        attributes: [h.Role('status')],
                        className: 'text-center',
                        children: ['Request sent.'],
                      },
                      h,
                    )
                  : null,
              ],
            ),
          ],
        ),
      ]),
      section('Input', [usernameView]),
      section('Textarea', [feedbackView]),
      section('Select', [departmentView]),
      section('Checkbox', [
        FieldSet(
          {
            children: [
              FieldLegend({ ...p, variant: 'label', children: ['Notify me about'] }, h),
              FieldGroup({ children: [repliesView, mentionsView] }, h),
            ],
          },
          h,
        ),
      ]),
      section('Choice card', [FieldGroup({ children: [kubeView, vmView] }, h)]),
      section('Fieldset', [
        FieldSet(
          {
            children: [
              FieldLegend({ ...p, children: ['Address'] }, h),
              FieldDescription(
                { ...p, children: ['We need your address to deliver your order.'] },
                h,
              ),
              FieldGroup(
                {
                  children: [
                    streetView,
                    h.div([h.Class('grid grid-cols-2 gap-4')], [cityView, zipView]),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ]),
      section('Validation and errors', [
        workEmailView,
        FieldError(
          { ...p, errors: [{ message: 'At least 8 characters' }, { message: 'One number' }] },
          h,
        ),
      ]),
      section('Horizontal', [FieldGroup({ children: [languageView] }, h)]),
      section('Separator', [
        FieldGroup(
          {
            children: [
              ssoView,
              FieldSeparator({ ...p, children: ['Or continue with'] }, h),
              Button(
                {
                  ...p,
                  variant: 'secondary',
                  className: 'w-full',
                  children: ['Continue with SSO'],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ]),
    ],
  )
})
