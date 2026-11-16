import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ComponentPresentation, SettingSelection } from '../settings'
import { HoverPageBlock } from './hover'
import { MotionPageBlock } from './motion'
import { RevealPageBlock } from './reveal'
import { ScrollbarsPageBlock } from './scrollbars'
import { SizesPageBlock } from './sizes'
import { SurfacesPageBlock } from './surfaces'
import { TypographyPageBlock } from './typography'
import { SkillPageBlock } from './skill'
import type { PageInputs } from './view'

const key = Symbol('SystemPages')
export const SystemPagesBlock = Block.make('SystemPages', {
  key,
  InitArgs: Schema.Tuple([Schema.String, ComponentPresentation]),
  Model: Schema.Struct({
    path: Schema.String,
    hover: Schema.Option(HoverPageBlock.Model),
    motion: Schema.Option(MotionPageBlock.Model),
    reveal: Schema.Option(RevealPageBlock.Model),
    scrollbars: Schema.Option(ScrollbarsPageBlock.Model),
    sizes: Schema.Option(SizesPageBlock.Model),
    surfaces: Schema.Option(SurfacesPageBlock.Model),
    typography: Schema.Option(TypographyPageBlock.Model),
    skill: Schema.Option(SkillPageBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPage: { path: Schema.String, presentation: ComponentPresentation },
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  OutMessage: defineMessageUnion({ RequestedSetting: { selection: SettingSelection } }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SizesPageBlock>['programRequirements']
    | Block.FactsOf<typeof SurfacesPageBlock>['programRequirements']
    | Block.FactsOf<typeof SkillPageBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
