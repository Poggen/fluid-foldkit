import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Story } from 'foldkit'
import { componentPresentation, defaults } from '../settings'
import { SkillPageBlock, layer } from './skill'

it.effect('starts the skill comparisons without copying or starting a scripted loop', () =>
  Story.story(
    { block: SkillPageBlock, layer },
    Story.init(componentPresentation(defaults)),
    Story.message(SkillPageBlock.Message.SelectedGenericTab({ index: 2 })),
    Story.message(SkillPageBlock.Message.SelectedGenericFolder({ index: 3 })),
    Story.model((model) => {
      expect(model.genericTab).toBe(2)
      expect(model.genericFolder).toBe(3)
      expect(model.genericCopy).toBe('idle')
      expect(model.copy.status).toBe('idle')
      expect(model.copy.copyCount).toBe(0)
    }),
    Story.Command.expectNone(),
  ),
)
