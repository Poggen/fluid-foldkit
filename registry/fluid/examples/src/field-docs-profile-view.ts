import type { FieldDocsHtml, FieldDocsBlock } from './field-docs-definition.js'
import { FieldLabel, FieldContent, FieldError } from '@foldkit-visuals/fluid/field'
import {
  company,
  contact,
  notes,
  conduct,
  stage,
  companyField,
  contactField,
  notesField,
  conductField,
  stageField,
  motion,
} from './field-docs-definition.js'

export const profileViews = (model: typeof FieldDocsBlock.Model.Type, h: FieldDocsHtml) => {
  const p = { shape: model.shape, size: model.size }
  const companyError = model.errors.company

  const companyView = h.block(
    companyField.embedView({
      slotId: 'field-company-group',
      model: model.companyField,
      viewInputs: {
        ...p,
        invalid: companyError !== undefined,
        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-company', children: ['Company *'] }, h),
          h.block(
            company.embedView({
              slotId: 'field-company',
              model: model.company,
              viewInputs: {
                ...p,
                name: 'company',
                invalid: companyError !== undefined,
              },
            }),
          ),
          companyError === undefined
            ? null
            : FieldError({ ...p, errors: [{ message: companyError }] }, h),
        ],
      },
    }),
  )

  const contactError = model.errors.email

  const contactView = h.block(
    contactField.embedView({
      slotId: 'field-contact-group',
      model: model.contactField,
      viewInputs: {
        ...p,
        invalid: contactError !== undefined,
        content: () => [
          FieldLabel({ ...p, htmlFor: 'field-contact', children: ['Work email address *'] }, h),
          h.block(
            contact.embedView({
              slotId: 'field-contact',
              model: model.contact,
              viewInputs: {
                ...p,
                name: 'email',
                placeholder: 'you@company.com',
                type: 'email',
                invalid: contactError !== undefined,
              },
            }),
          ),
          contactError === undefined
            ? null
            : FieldError({ ...p, errors: [{ message: contactError }] }, h),
        ],
      },
    }),
  )

  const notesView = h.block(
    notesField.embedView({
      slotId: 'field-notes-group',
      model: model.notesField,
      viewInputs: {
        ...p,

        content: () => [
          FieldLabel(
            {
              ...p,
              htmlFor: 'field-notes',
              children: ["Is there anything else you'd like us to know?"],
            },
            h,
          ),
          h.block(
            notes.embedView({
              slotId: 'field-notes',
              model: model.notes,
              viewInputs: {
                ...p,
                name: 'notes',
              },
            }),
          ),
        ],
      },
    }),
  )

  const conductView = h.block(
    conductField.embedView({
      slotId: 'field-conduct-group',
      model: model.conductField,
      viewInputs: {
        ...p,
        orientation: 'horizontal',
        invalid: Boolean(model.errors.conduct),
        content: () => [
          h.block(
            conduct.embedView({
              slotId: 'field-conduct',
              model: model.conduct,
              viewInputs: {
                ...p,
                animate: motion.node,
                name: 'conduct',
                invalid: Boolean(model.errors.conduct),
              },
            }),
          ),
          FieldContent(
            {
              children: [
                FieldLabel(
                  {
                    ...p,
                    htmlFor: 'field-conduct',
                    children: ['I agree to the code of conduct *'],
                  },
                  h,
                ),
                model.errors.conduct === undefined
                  ? null
                  : FieldError({ ...p, children: [model.errors.conduct] }, h),
              ],
            },
            h,
          ),
        ],
      },
    }),
  )

  const stageView = h.block(
    stageField.embedView({
      slotId: 'field-stage-group',
      model: model.stageField,
      viewInputs: {
        ...p,
        content: () => [
          FieldLabel(
            {
              ...p,
              htmlFor: `${model.stage.menu.controller.id}-trigger`,
              children: ['What stage is your company at?'],
            },
            h,
          ),
          h.block(
            stage.embedView({
              slotId: 'field-stage',
              model: model.stage,
              viewInputs: {
                ...p,
                animate: motion.node,
                placeholder: 'Select an option',
                ariaLabel: 'What stage is your company at?',
                className: 'w-full',
              },
            }),
          ),
        ],
      },
    }),
  )

  return { companyView, contactView, conductView, notesView, stageView }
}
