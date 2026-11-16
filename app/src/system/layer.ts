import { Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { SystemPagesBlock as Root } from './block'
import { systemAt } from '../../../lib/system'
import { ComponentPresentation } from '../settings'
import { HoverPageBlock, layer as HoverLayer } from './hover'
import { MotionPageBlock, layer as MotionLayer } from './motion'
import { RevealPageBlock, layer as RevealLayer } from './reveal'
import { ScrollbarsPageBlock, layer as ScrollbarsLayer } from './scrollbars'
import { SizesPageBlock, layer as SizesLayer } from './sizes'
import { SurfacesPageBlock, layer as SurfacesLayer } from './surfaces'
import { TypographyPageBlock, layer as TypographyLayer } from './typography'
import { SkillPageBlock, layer as SkillLayer } from './skill'

const Hover = Root.makeOptionalFieldBinding(HoverPageBlock, {
  field: 'hover',
  init: { contextToArgs: () => Option.none() },
})
const Motion = Root.makeOptionalFieldBinding(MotionPageBlock, {
  field: 'motion',
  init: { contextToArgs: () => Option.none() },
})
const Reveal = Root.makeOptionalFieldBinding(RevealPageBlock, {
  field: 'reveal',
  init: { contextToArgs: () => Option.none() },
})
const Scrollbars = Root.makeOptionalFieldBinding(ScrollbarsPageBlock, {
  field: 'scrollbars',
  init: { contextToArgs: () => Option.none() },
})
const Sizes = Root.makeOptionalFieldBinding(SizesPageBlock, {
  field: 'sizes',
  init: { contextToArgs: () => Option.none() },
})
const Surfaces = Root.makeOptionalFieldBinding(SurfacesPageBlock, {
  field: 'surfaces',
  init: { contextToArgs: () => Option.none() },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SurfacesPageBlock, {
    RequestedSetting: ({ selection }) =>
      Root.makeOutMessageStep(() => Root.OutMessage.RequestedSetting({ selection })),
  }),
})
const Typography = Root.makeOptionalFieldBinding(TypographyPageBlock, {
  field: 'typography',
  init: { contextToArgs: () => Option.none() },
})
const Skill = Root.makeOptionalFieldBinding(SkillPageBlock, {
  field: 'skill',
  init: { contextToArgs: () => Option.none() },
})
const SystemPagesComposition = Root.makeComposition({
  bindings: [Hover, Motion, Reveal, Scrollbars, Sizes, Surfaces, Typography, Skill],
})
const reconcile = (presentation: ComponentPresentation) =>
  Update.combineSteps([
    Hover.informOfPresentation({ presentation }),
    Motion.informOfPresentation({ presentation }),
    Reveal.informOfPresentation({ presentation }),
    Scrollbars.informOfPresentation({ presentation }),
    Sizes.informOfPresentation({ presentation }),
    Surfaces.informOfPresentation({ presentation }),
    Typography.informOfPresentation({ presentation }),
    Skill.informOfPresentation({ presentation }),
  ])
const visit = (path: string, presentation: ComponentPresentation) =>
  Root.makeStep(() => {
    const page = systemAt(path)
    return Update.combineSteps([
      Root.makeFieldsStep(() => ({ path: () => path })),
      Root.makeStep((current) =>
        page?.slug === 'fluid-hover' && Option.isNone(current.hover)
          ? Hover.init({
              args: [presentation],
              toParentModel: (child) => modifyFields(current, { hover: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'motion' && Option.isNone(current.motion)
          ? Motion.init({
              args: [presentation],
              toParentModel: (child) => modifyFields(current, { motion: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'reveal' && Option.isNone(current.reveal)
          ? Reveal.init({
              args: [presentation],
              toParentModel: (child) => modifyFields(current, { reveal: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'scrollbars' && Option.isNone(current.scrollbars)
          ? Scrollbars.init({
              args: [presentation],
              toParentModel: (child) =>
                modifyFields(current, { scrollbars: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'sizes' && Option.isNone(current.sizes)
          ? Sizes.init({
              args: [presentation],
              toParentModel: (child) => modifyFields(current, { sizes: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'surfaces' && Option.isNone(current.surfaces)
          ? Surfaces.init({
              args: [presentation],
              toParentModel: (child) =>
                modifyFields(current, { surfaces: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'typography' && Option.isNone(current.typography)
          ? Typography.init({
              args: [presentation],
              toParentModel: (child) =>
                modifyFields(current, { typography: () => Option.some(child) }),
            })
          : { model: current },
      ),
      Root.makeStep((current) =>
        page?.slug === 'skill' && Option.isNone(current.skill)
          ? Skill.init({
              args: [presentation],
              toParentModel: (child) => modifyFields(current, { skill: () => Option.some(child) }),
            })
          : { model: current },
      ),
      reconcile(presentation),
    ])
  })
export const layer = Root.makeLayer({
  init: SystemPagesComposition.makeInit((path, presentation) => ({
    model: { path },
    steps: [visit(path, presentation)],
  })),
  update: SystemPagesComposition.makeUpdate({}),
  inMessageUpdate: SystemPagesComposition.makeInMessageUpdate({
    InformedOfPage: Root.makeStep.fromMessage(({ path, presentation }) =>
      visit(path, presentation),
    ),
    InformedOfPresentation: Root.makeStep.fromMessage(({ presentation }) =>
      reconcile(presentation),
    ),
  }),
  view: SystemPagesComposition.makeView.withInputs((model, inputs, h) => {
    const slug = systemAt(model.path)?.slug
    if (slug === 'fluid-hover' && Option.isSome(model.hover))
      return h.block(
        Hover.embedView({ slotId: 'system-hover', model: model.hover.value, viewInputs: inputs }),
      )
    if (slug === 'motion' && Option.isSome(model.motion))
      return h.block(
        Motion.embedView({
          slotId: 'system-motion',
          model: model.motion.value,
          viewInputs: inputs,
        }),
      )
    if (slug === 'reveal' && Option.isSome(model.reveal))
      return h.block(
        Reveal.embedView({
          slotId: 'system-reveal',
          model: model.reveal.value,
          viewInputs: inputs,
        }),
      )
    if (slug === 'scrollbars' && Option.isSome(model.scrollbars))
      return h.block(
        Scrollbars.embedView({
          slotId: 'system-scrollbars',
          model: model.scrollbars.value,
          viewInputs: inputs,
        }),
      )
    if (slug === 'sizes' && Option.isSome(model.sizes))
      return h.block(
        Sizes.embedView({ slotId: 'system-sizes', model: model.sizes.value, viewInputs: inputs }),
      )
    if (slug === 'surfaces' && Option.isSome(model.surfaces))
      return h.block(
        Surfaces.embedView({
          slotId: 'system-surfaces',
          model: model.surfaces.value,
          viewInputs: inputs,
        }),
      )
    if (slug === 'typography' && Option.isSome(model.typography))
      return h.block(
        Typography.embedView({
          slotId: 'system-typography',
          model: model.typography.value,
          viewInputs: inputs,
        }),
      )
    if (slug === 'skill' && Option.isSome(model.skill))
      return h.block(
        Skill.embedView({ slotId: 'system-skill', model: model.skill.value, viewInputs: inputs }),
      )
    return h.empty
  }),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      HoverLayer,
      MotionLayer,
      RevealLayer,
      ScrollbarsLayer,
      SizesLayer,
      SurfacesLayer,
      TypographyLayer,
      SkillLayer,
    ),
  ),
)
