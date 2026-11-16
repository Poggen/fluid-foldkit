import type { FieldDocsHtml, FieldDocsBlock } from './field-docs-definition.js'
import {
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldTitle,
} from '@foldkit-visuals/fluid/field'
import {
  replies,
  mentions,
  kube,
  vm,
  repliesField,
  mentionsField,
  kubeField,
  vmField,
  motion,
} from './field-docs-definition.js'

export const choicesViews = (model: typeof FieldDocsBlock.Model.Type, h: FieldDocsHtml) => {
  const p = { shape: model.shape, size: model.size }

  const repliesView = h.block(
    repliesField.embedView({
      slotId: 'field-replies-group',
      model: model.repliesField,
      viewInputs: {
        ...p,
        orientation: 'horizontal',
        content: () => [
          h.block(
            replies.embedView({
              slotId: 'field-replies',
              model: model.replies,
              viewInputs: { ...p, animate: motion.node },
            }),
          ),
          FieldLabel({ ...p, htmlFor: 'field-replies', children: ['Replies to my comments'] }, h),
        ],
      },
    }),
  )

  const mentionsView = h.block(
    mentionsField.embedView({
      slotId: 'field-mentions-group',
      model: model.mentionsField,
      viewInputs: {
        ...p,
        orientation: 'horizontal',
        content: () => [
          h.block(
            mentions.embedView({
              slotId: 'field-mentions',
              model: model.mentions,
              viewInputs: { ...p, animate: motion.node },
            }),
          ),
          FieldContent(
            {
              children: [
                FieldLabel({ ...p, htmlFor: 'field-mentions', children: ['Mentions'] }, h),
                FieldDescription({ ...p, children: ['Only from people in your workspace.'] }, h),
              ],
            },
            h,
          ),
        ],
      },
    }),
  )

  const kubeView = FieldLabel(
    {
      htmlFor: 'field-kube',
      ...p,
      children: [
        h.block(
          kubeField.embedView({
            slotId: 'field-kube-group',
            model: model.kubeField,
            viewInputs: {
              ...p,
              orientation: 'horizontal',
              content: () => [
                h.block(
                  kube.embedView({
                    slotId: 'field-kube',
                    model: model.kube,
                    viewInputs: { ...p, animate: motion.node },
                  }),
                ),
                FieldContent(
                  {
                    children: [
                      FieldTitle({ ...p, children: ['Kubernetes'] }, h),
                      FieldDescription(
                        { ...p, children: ['Run GPU workloads on a K8s cluster.'] },
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
      ],
    },
    h,
  )

  const vmView = FieldLabel(
    {
      htmlFor: 'field-vm',
      ...p,
      children: [
        h.block(
          vmField.embedView({
            slotId: 'field-vm-group',
            model: model.vmField,
            viewInputs: {
              ...p,
              orientation: 'horizontal',
              content: () => [
                h.block(
                  vm.embedView({
                    slotId: 'field-vm',
                    model: model.vm,
                    viewInputs: { ...p, animate: motion.node },
                  }),
                ),
                FieldContent(
                  {
                    children: [
                      FieldTitle({ ...p, children: ['Virtual machine'] }, h),
                      FieldDescription(
                        { ...p, children: ['Access a cluster to run GPU workloads.'] },
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
      ],
    },
    h,
  )

  return { repliesView, mentionsView, kubeView, vmView }
}
