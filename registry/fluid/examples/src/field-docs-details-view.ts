import type { FieldDocsHtml, FieldDocsBlock } from './field-docs-definition.js'
import {
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from '@foldkit-visuals/fluid/field'
import {
  username,
  feedback,
  street,
  city,
  zip,
  workEmail,
  sso,
  department,
  language,
  usernameField,
  feedbackField,
  streetField,
  cityField,
  zipField,
  workEmailField,
  ssoField,
  departmentField,
  languageField,
  motion,
} from './field-docs-definition.js'

export const detailsViews = (model: typeof FieldDocsBlock.Model.Type, h: FieldDocsHtml) => {
  const p = { shape: model.shape, size: model.size }

  const usernameView = h.block(
    usernameField.embedView({
      slotId: 'field-username-group',
      model: model.usernameField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-username', children: ['Username'] }, h),
          h.block(
            username.embedView({
              slotId: 'field-username',
              model: model.username,
              viewInputs: { ...p, placeholder: 'ada' },
            }),
          ),
          FieldDescription({ ...p, children: ['Choose a unique username for your account.'] }, h),
        ],
      },
    }),
  )

  const feedbackView = h.block(
    feedbackField.embedView({
      slotId: 'field-feedback-group',
      model: model.feedbackField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-feedback', children: ['Feedback'] }, h),
          h.block(
            feedback.embedView({
              slotId: 'field-feedback',
              model: model.feedback,
              viewInputs: {
                ...p,
                placeholder: "What worked, what didn't?",
              },
            }),
          ),
          FieldDescription({ ...p, children: ['It grows with your text.'] }, h),
        ],
      },
    }),
  )

  const streetView = h.block(
    streetField.embedView({
      slotId: 'field-street-group',
      model: model.streetField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-street', children: ['Street address'] }, h),
          h.block(
            street.embedView({
              slotId: 'field-street',
              model: model.street,
              viewInputs: { ...p, placeholder: '123 Main St' },
            }),
          ),
        ],
      },
    }),
  )

  const cityView = h.block(
    cityField.embedView({
      slotId: 'field-city-group',
      model: model.cityField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-city', children: ['City'] }, h),
          h.block(
            city.embedView({
              slotId: 'field-city',
              model: model.city,
              viewInputs: { ...p, placeholder: 'Paris' },
            }),
          ),
        ],
      },
    }),
  )

  const zipView = h.block(
    zipField.embedView({
      slotId: 'field-zip-group',
      model: model.zipField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-zip', children: ['Postal code'] }, h),
          h.block(
            zip.embedView({
              slotId: 'field-zip',
              model: model.zip,
              viewInputs: { ...p, placeholder: '75001' },
            }),
          ),
        ],
      },
    }),
  )

  const workEmailError = 'Enter a valid email address'

  const workEmailView = h.block(
    workEmailField.embedView({
      slotId: 'field-workEmail-group',
      model: model.workEmailField,
      viewInputs: {
        ...p,
        invalid: workEmailError !== undefined,
        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-workEmail', children: ['Work email address'] }, h),
          h.block(
            workEmail.embedView({
              slotId: 'field-workEmail',
              model: model.workEmail,
              viewInputs: { ...p, type: 'email', invalid: workEmailError !== undefined },
            }),
          ),
          workEmailError ? FieldError({ ...p, errors: [{ message: workEmailError }] }, h) : null,
        ],
      },
    }),
  )

  const ssoView = h.block(
    ssoField.embedView({
      slotId: 'field-sso-group',
      model: model.ssoField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-sso', children: ['Work email'] }, h),
          h.block(
            sso.embedView({
              slotId: 'field-sso',
              model: model.sso,
              viewInputs: {
                ...p,
                placeholder: 'you@company.com',
                type: 'email',
              },
            }),
          ),
        ],
      },
    }),
  )

  const departmentView = h.block(
    departmentField.embedView({
      slotId: 'field-department-group',
      model: model.departmentField,
      viewInputs: {
        ...p,
        content: () => [
          FieldLabel(
            {
              ...p,
              htmlFor: `${model.department.menu.controller.id}-trigger`,
              children: ['Department'],
            },
            h,
          ),
          h.block(
            department.embedView({
              slotId: 'field-department',
              model: model.department,
              viewInputs: {
                ...p,
                animate: motion.node,
                placeholder: 'Choose a department',
                ariaLabel: 'Department',
                className: 'w-full',
              },
            }),
          ),
          FieldDescription({ ...p, children: ['Where you spend most of your week.'] }, h),
        ],
      },
    }),
  )

  const languageView = h.block(
    languageField.embedView({
      slotId: 'field-language-group',
      model: model.languageField,
      viewInputs: {
        ...p,
        orientation: 'horizontal',
        content: () => [
          FieldContent(
            {
              children: [
                FieldLabel(
                  {
                    ...p,
                    htmlFor: `${model.language.menu.controller.id}-trigger`,
                    children: ['Language'],
                  },
                  h,
                ),
                FieldDescription({ ...p, children: ['Used across the app and in emails.'] }, h),
              ],
            },
            h,
          ),
          h.block(
            language.embedView({
              slotId: 'field-language',
              model: model.language,
              viewInputs: {
                ...p,
                animate: motion.node,
                placeholder: 'Pick one',
                ariaLabel: 'Language',
              },
            }),
          ),
        ],
      },
    }),
  )

  return {
    usernameView,
    feedbackView,
    streetView,
    cityView,
    zipView,
    workEmailView,
    ssoView,
    departmentView,
    languageView,
  }
}
