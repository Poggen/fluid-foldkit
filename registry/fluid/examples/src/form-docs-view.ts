import { DocTabs } from './form-docs-definition.js'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs.js'
import { docSection } from './doc-section.js'
import source from './form-docs-view.ts?raw'
import { formPreviewClass } from './form-docs-layout.js'
import { Button } from '@foldkit-visuals/fluid/button'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldError,
} from '@foldkit-visuals/fluid/field'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import {
  email,
  username,
  invalidEmail,
  workspace,
  password,
  seats,
  attachment,
  subscribe,
  message,
  feedback,
  bio,
  comment,
  reply,
  terms,
  updates,
  consent,
  locked,
  usernameField,
  invalidEmailField,
  feedbackField,
  bioField,
  updatesField,
  consentField,
  lockedField,
  FormDocsComposition,
  motion,
} from './form-docs-definition.js'

export const view = FormDocsComposition.makeView((model, h) => {
  const presentation = { shape: model.shape, size: model.size }

  const section = (title: string, children: ReadonlyArray<Html>) =>
    model.isEmbedded
      ? docSection(h, {
          title,
          children,
          source,
          presentation,
          pane:
            model.docTabs[`${model.family}:${title}`]?.tabs.selectedIndex === 1
              ? 'code'
              : 'preview',
          tabsId: previewCodeTabId('forms', `${model.family}:${title}`),
          tabs: (() => {
            const key = `${model.family}:${title}`
            const child = model.docTabs[key]
            return child === undefined
              ? h.empty
              : h.block(
                  DocTabs.embedView({
                    key,
                    slotId: child.tabs.id,
                    model: child,
                    viewInputs: previewCodeTabsViewInputs(h, {
                      ...presentation,
                      animate: motion.node,
                      ariaLabel: `${title} example`,
                    }),
                  }),
                )
          })(),
          className: formPreviewClass(model.family, title),
        })
      : h.section(
          [h.Class('flex flex-col gap-4')],
          [
            h.h2([h.Class('text-lg')], [title]),
            h.div(
              [
                h.Class(
                  `relative flex items-center justify-center min-h-[120px] border border-border/60 bg-background px-4 py-12 sm:px-8 ${resolvePresentation(presentation).shape.container}`,
                ),
              ],
              [h.div([h.Class(formPreviewClass(model.family, title))], children)],
            ),
          ],
        )

  const textInputs = () => [
    section('Basic', [
      h.block(
        email.embedView({
          slotId: 'docs-email',
          model: model.email,
          viewInputs: {
            ...presentation,
            type: 'email',
            placeholder: 'you@company.com',
            attributes: childAttributes([h.AriaLabel('Email')]),
          },
        }),
      ),
    ]),
    section('With Field', [
      h.block(
        usernameField.embedView({
          slotId: 'docs-username-field',
          model: model.usernameField,
          viewInputs: {
            ...presentation,
            content: () => [
              FieldLabel({ ...presentation, htmlFor: 'docs-username', children: ['Username'] }, h),
              h.block(
                username.embedView({
                  slotId: 'docs-username',
                  model: model.username,
                  viewInputs: { ...presentation, placeholder: 'ada' },
                }),
              ),
              FieldDescription(
                { ...presentation, children: ['Choose a unique username for your account.'] },
                h,
              ),
            ],
          },
        }),
      ),
    ]),
    section('Invalid', [
      h.block(
        invalidEmailField.embedView({
          slotId: 'docs-invalidEmail-field',
          model: model.invalidEmailField,
          viewInputs: {
            ...presentation,
            invalid: true,
            content: () => [
              FieldLabel(
                { ...presentation, htmlFor: 'docs-invalidEmail', children: ['Work email address'] },
                h,
              ),
              h.block(
                invalidEmail.embedView({
                  slotId: 'docs-invalidEmail',
                  model: model.invalidEmail,
                  viewInputs: { ...presentation, type: 'email', invalid: true },
                }),
              ),
              FieldError({ ...presentation, children: ['Enter a valid email address'] }, h),
            ],
          },
        }),
      ),
    ]),
    section('Disabled', [
      h.block(
        workspace.embedView({
          slotId: 'docs-workspace',
          model: model.workspace,
          viewInputs: {
            ...presentation,
            placeholder: 'Read-only workspace',
            attributes: childAttributes([h.AriaLabel('Workspace')]),
          },
        }),
      ),
    ]),
    section('Types', [
      h.block(
        password.embedView({
          slotId: 'docs-password',
          model: model.password,
          viewInputs: {
            ...presentation,
            type: 'password',
            placeholder: 'Password',
            attributes: childAttributes([h.AriaLabel('Password')]),
          },
        }),
      ),
      h.block(
        seats.embedView({
          slotId: 'docs-seats',
          model: model.seats,
          viewInputs: {
            ...presentation,
            type: 'number',
            placeholder: 'Seats',
            attributes: childAttributes([h.Min('1'), h.AriaLabel('Seats')]),
          },
        }),
      ),
      h.block(
        attachment.embedView({
          slotId: 'docs-attachment',
          model: model.attachment,
          viewInputs: {
            ...presentation,
            type: 'file',
            attributes: childAttributes([h.AriaLabel('Attachment')]),
          },
        }),
      ),
    ]),
    section('With a button', [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.block(
            subscribe.embedView({
              slotId: 'docs-subscribe',
              model: model.subscribe,
              viewInputs: {
                ...presentation,
                type: 'email',
                placeholder: 'you@company.com',
                attributes: childAttributes([h.AriaLabel('Email')]),
              },
            }),
          ),
          Button({ ...presentation, children: ['Subscribe'] }, h),
        ],
      ),
    ]),
  ]

  const textareas = () => [
    section('Basic', [
      h.block(
        message.embedView({
          slotId: 'docs-message',
          model: model.message,
          viewInputs: {
            ...presentation,
            placeholder: 'Type your message here.',
            attributes: childAttributes([h.AriaLabel('Message')]),
          },
        }),
      ),
    ]),
    section('With Field', [
      h.block(
        feedbackField.embedView({
          slotId: 'docs-feedback-field',
          model: model.feedbackField,
          viewInputs: {
            ...presentation,
            content: () => [
              FieldLabel({ ...presentation, htmlFor: 'docs-feedback', children: ['Feedback'] }, h),
              h.block(
                feedback.embedView({
                  slotId: 'docs-feedback',
                  model: model.feedback,
                  viewInputs: { ...presentation, placeholder: "What worked, what didn't?" },
                }),
              ),
              FieldDescription({ ...presentation, children: ['It grows with your text.'] }, h),
            ],
          },
        }),
      ),
    ]),
    section('Invalid', [
      h.block(
        bioField.embedView({
          slotId: 'docs-bio-field',
          model: model.bioField,
          viewInputs: {
            ...presentation,
            invalid: true,
            content: () => [
              FieldLabel({ ...presentation, htmlFor: 'docs-bio', children: ['Bio'] }, h),
              h.block(
                bio.embedView({
                  slotId: 'docs-bio',
                  model: model.bio,
                  viewInputs: { ...presentation, invalid: true },
                }),
              ),
              FieldError({ ...presentation, children: ['Write at least 20 characters'] }, h),
            ],
          },
        }),
      ),
    ]),
    section('Disabled', [
      h.block(
        comment.embedView({
          slotId: 'docs-comment',
          model: model.comment,
          viewInputs: {
            ...presentation,
            placeholder: 'Comments are closed.',
            attributes: childAttributes([h.AriaLabel('Comment')]),
          },
        }),
      ),
    ]),
    section('With a button', [
      h.block(
        reply.embedView({
          slotId: 'docs-reply',
          model: model.reply,
          viewInputs: {
            ...presentation,
            placeholder: 'Type your message here.',
            attributes: childAttributes([h.AriaLabel('Message')]),
          },
        }),
      ),
      Button({ ...presentation, children: ['Send message'] }, h),
    ]),
  ]

  const checkboxes = () => [
    section('Basic', [
      Field(
        {
          ...presentation,
          orientation: 'horizontal',
          className: 'w-auto',
          children: [
            h.block(
              terms.embedView({
                slotId: 'docs-terms',
                model: model.terms,
                viewInputs: { ...presentation, animate: motion.node },
              }),
            ),
            FieldLabel(
              { ...presentation, htmlFor: 'docs-terms', children: ['Accept terms and conditions'] },
              h,
            ),
          ],
        },
        h,
      ),
    ]),
    section('With a description', [
      h.block(
        updatesField.embedView({
          slotId: 'docs-updates-field',
          model: model.updatesField,
          viewInputs: {
            ...presentation,
            orientation: 'horizontal',
            content: () => [
              h.block(
                updates.embedView({
                  slotId: 'docs-updates',
                  model: model.updates,
                  viewInputs: { ...presentation, animate: motion.node },
                }),
              ),
              FieldContent(
                {
                  children: [
                    FieldLabel(
                      { ...presentation, htmlFor: 'docs-updates', children: ['Product updates'] },
                      h,
                    ),
                    FieldDescription(
                      {
                        ...presentation,
                        children: ['One email a month, never more.'],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
        }),
      ),
    ]),
    section('Invalid and disabled', [
      h.block(
        consentField.embedView({
          slotId: 'docs-consent-field',
          model: model.consentField,
          viewInputs: {
            ...presentation,
            orientation: 'horizontal',
            invalid: true,
            content: () => [
              h.block(
                consent.embedView({
                  slotId: 'docs-consent',
                  model: model.consent,
                  viewInputs: { ...presentation, animate: motion.node, invalid: true },
                }),
              ),
              FieldContent(
                {
                  children: [
                    FieldLabel(
                      {
                        ...presentation,
                        htmlFor: 'docs-consent',
                        children: ['I agree to the code of conduct'],
                      },
                      h,
                    ),
                    FieldError({ ...presentation, children: ['Required to join the event'] }, h),
                  ],
                },
                h,
              ),
            ],
          },
        }),
      ),
      h.block(
        lockedField.embedView({
          slotId: 'docs-locked-field',
          model: model.lockedField,
          viewInputs: {
            ...presentation,
            orientation: 'horizontal',
            content: () => [
              h.block(
                locked.embedView({
                  slotId: 'docs-locked',
                  model: model.locked,
                  viewInputs: { ...presentation, animate: motion.node },
                }),
              ),
              FieldLabel(
                { ...presentation, htmlFor: 'docs-locked', children: ['Managed by your admin'] },
                h,
              ),
            ],
          },
        }),
      ),
    ]),
  ]

  const doc = {
    input: {
      title: 'Input',
      description:
        "A single-line text field in the Select trigger's hairline, with a neutral focus border.",
      sections: textInputs,
    },
    textarea: {
      title: 'Textarea',
      description: "A multi-line text field with the Input's hairline that grows with its content.",
      sections: textareas,
    },
    checkbox: {
      title: 'Checkbox',
      description:
        'A single checkbox: a hairline square that darkens on hover and a check that draws itself.',
      sections: checkboxes,
    },
  }[model.family]
  const sections = doc.sections()

  if (model.isEmbedded) return h.div([], sections)

  return h.main(
    [h.Class('mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10')],
    [
      h.h1([h.Class('text-2xl')], [doc.title]),
      h.p([h.Class('text-muted-foreground')], [doc.description]),
      ...sections,
    ],
  )
})
