// @vitest-environment node
import { expect } from 'vitest'
import { Window, type HTMLElement as HappyHTMLElement } from 'happy-dom'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { DialogResourcesServerLayer } from '@foldkit-visuals/fluid/dialog'
import { DropdownResourcesServerLayer } from '@foldkit-visuals/fluid/dropdown/environment'
import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { createColorPickerLayer } from '@foldkit-visuals/fluid/color-picker'
import { TooltipStoryLayer } from '../../../registry/fluid/test/tooltip-story-services'
import { motion, target } from '../motion'
import {
  componentPresentation,
  defaults,
  resolveSettings,
  type ResolvedSettings,
} from '../settings'
import { InputCopyResources } from '@foldkit-visuals/fluid/input-copy'
import { SkillPageBlock, layer as SkillLayer } from './skill'
import { SurfacesPageBlock, layer as SurfacesLayer } from './surfaces'
import { TypographyPageBlock, layer as TypographyLayer } from './typography'

const settings: ResolvedSettings = { ...resolveSettings(defaults), shape: 'rounded' }
const Page = Schema.Literals(['surfaces', 'typography', 'skill'])
const key = Symbol('SystemServerDocument')
const SystemServerDocumentBlock = Block.make('SystemServerDocument', {
  key,
  InitArgs: Schema.Tuple([Page]),
  Model: Schema.Struct({
    page: Page,
    surfaces: SurfacesPageBlock.Model,
    typography: TypographyPageBlock.Model,
    skill: SkillPageBlock.Model,
  }),
  Message: Schema.Never,
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SurfacesPageBlock>['programRequirements']
    | Block.FactsOf<typeof SkillPageBlock>['programRequirements']
  >(),
  view: { kind: 'Document' },
})
const Surfaces = SystemServerDocumentBlock.makeRequiredFieldBinding(SurfacesPageBlock, {
  field: 'surfaces',
  init: { contextToArgs: () => [componentPresentation(settings)] },
}).withOutMessagePolicy({
  fold: SystemServerDocumentBlock.makeOutMessageFold(SurfacesPageBlock, {
    RequestedSetting: SystemServerDocumentBlock.makeNoopStep,
  }),
})
const Typography = SystemServerDocumentBlock.makeRequiredFieldBinding(TypographyPageBlock, {
  field: 'typography',
  init: { contextToArgs: () => [componentPresentation(settings)] },
})
const Skill = SystemServerDocumentBlock.makeRequiredFieldBinding(SkillPageBlock, {
  field: 'skill',
  init: { contextToArgs: () => [componentPresentation(settings)] },
})
const SystemServerDocumentComposition = SystemServerDocumentBlock.makeComposition({
  bindings: [Surfaces, Typography, Skill],
})
const layer = SystemServerDocumentBlock.makeLayer({
  init: SystemServerDocumentComposition.makeInit((page) => ({ model: { page } })),
  update: SystemServerDocumentComposition.makeUpdate({}),
  view: SystemServerDocumentComposition.makeView((model, h) => ({
    title: 'System page',
    body: h.main(
      [],
      [
        model.page === 'surfaces'
          ? h.block(
              Surfaces.embedView({
                slotId: 'surfaces',
                model: model.surfaces,
                viewInputs: { settings },
              }),
            )
          : model.page === 'skill'
            ? h.block(
                Skill.embedView({
                  slotId: 'skill',
                  model: model.skill,
                  viewInputs: { settings },
                }),
              )
            : h.block(
                Typography.embedView({
                  slotId: 'typography',
                  model: model.typography,
                  viewInputs: { settings },
                }),
              ),
      ],
    ),
  })),
}).pipe(Layer.provide(Layer.mergeAll(SurfacesLayer, TypographyLayer, SkillLayer)))
const services = Layer.mergeAll(
  DialogResourcesServerLayer,
  DropdownResourcesServerLayer,
  inputFileResourcesLayer,
  createColorPickerLayer(),
  TooltipStoryLayer,
  Layer.succeed(
    InputCopyResources,
    InputCopyResources.of({
      copy: () => Effect.die(new Error('SSR cannot copy')),
      waitForResultWindow: () => Effect.die(new Error('SSR cannot wait for copy')),
      mountResultWindow: () => Effect.die(new Error('SSR cannot mount copy')),
    }),
  ),
)
const render = (page: typeof Page.Type) =>
  Server.renderToString(
    { block: SystemServerDocumentBlock, layer },
    { Flags: Page },
    { flags: page, isHydratable: true, buildId: 'system-page' },
  )

it.effect('server-renders the default editable Markdown table with stable document structure', () =>
  render('typography').pipe(
    Effect.provide(services),
    Effect.map((rendered) => {
      const window = new Window()
      const document = new window.DOMParser().parseFromString(rendered.html, 'text/html')
      const table = document.querySelector('.system-markdown-preview table')
      expect(table?.querySelector('thead th')?.textContent).toBe('Role')
      expect(table?.querySelectorAll('tbody tr')).toHaveLength(2)
      window.close()
    }),
  ),
)
it.effect('server-renders the surface slider and color picker with their owning motion scope', () =>
  Effect.all([render('surfaces'), render('surfaces')], { concurrency: 2 }).pipe(
    Effect.provide(Layer.mergeAll(services, motion.layer, target.layer)),
    Effect.map((renders) => {
      for (const rendered of renders) {
        const window = new Window()
        const document = new window.DOMParser().parseFromString(rendered.html, 'text/html')
        expect(document.querySelector('[data-system-page="surfaces"]')).not.toBeNull()
        const style = document.querySelector<HappyHTMLElement>(
          '[data-system-page="surfaces"]',
        )?.style
        expect(style?.getPropertyValue('--system-frame-radius')).toBe('12px')
        expect(style?.getPropertyValue('--system-panel-radius')).toBe('16px')
        expect(document.querySelector('[role="slider"]')).not.toBeNull()
        expect(document.querySelector('[aria-label="Hex value"]')).not.toBeNull()
        window.close()
      }
    }),
  ),
)

it.effect('server-renders the Skill comparison menu with selectable rows', () =>
  render('skill').pipe(
    Effect.provide(services),
    Effect.map((rendered) => {
      const window = new Window()
      const document = new window.DOMParser().parseFromString(rendered.html, 'text/html')
      const menu = document.querySelector('#system-skill-menu')
      expect(menu?.querySelectorAll('[role="menuitemradio"]')).toHaveLength(5)
      expect(menu?.querySelector('[aria-checked="true"]')?.getAttribute('aria-label')).toBe('Inbox')
      window.close()
    }),
  ),
)
