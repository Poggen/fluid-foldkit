import { it } from '@effect/vitest'
import { Scene } from 'foldkit'
import { ThinkingStepBlock, layer, test } from '../src/thinking-step.js'
import { ThinkingStepsBlock, ThinkingStepsLayer } from '../src/thinking-steps.js'
import { createPresentationContext } from '../src/presentation.js'

const animate = <A>(node: A) => node
for (const size of ['default', 'compact'] as const) {
  for (const status of ['complete', 'active', 'upcoming', 'error'] as const) {
    it.effect(
      `step ${status} renders its label, baseline metadata and inherited ${size} size`,
      () =>
        Scene.scene(
          {
            block: ThinkingStepBlock,
            layer,
            viewInputs: {
              animate,
              context: createPresentationContext({ size }),
              label: 'Read docs',
              meta: () => '0.4s',
            },
          },
          Scene.init({ id: 'step', status }),
          Scene.Mount.resolve(test.Observe, ThinkingStepBlock.Message.Measured({ height: 40 })),
          Scene.expect(Scene.selector('span.min-w-0')).toHaveClass(
            status === 'error'
              ? 'text-destructive'
              : status === 'upcoming'
                ? 'text-muted-foreground'
                : 'text-foreground',
          ),
          Scene.expect(Scene.selector('span.min-w-0')).toHaveText(
            status === 'active' ? 'Read docs…' : 'Read docs',
          ),
          Scene.expect(Scene.selector('.tabular-nums')).toHaveText('0.4s'),
          Scene.expect(Scene.selector('svg')).toHaveAttr('width', size === 'compact' ? '12' : '14'),
          Scene.expectAll(Scene.all.selector('.shimmer-text')).toHaveCount(
            status === 'active' ? 1 : 0,
          ),
        ),
    )
  }
}
for (const href of [
  'https://example.com',
  'http://example.com',
  'HTTPS://example.com',
  '/docs',
  '//example.com',
  'javascript:alert(1)',
  'data:text/html,hi',
  'mailto:test@example.com',
  'relative',
  ' https://example.com',
]) {
  const safe = /^(https?:\/\/|\/(?!\/))/i.test(href)
  it.effect(`source link policy preserves ${href}`, () =>
    Scene.scene(
      { block: ThinkingStepBlock, layer, viewInputs: { animate, label: 'Docs', href } },
      Scene.init({ id: 'step' }),
      Scene.Mount.resolve(test.Observe, ThinkingStepBlock.Message.Measured({ height: 40 })),
      Scene.expectAll(Scene.all.selector('a')).toHaveCount(safe ? 1 : 0),
      ...(safe
        ? [
            Scene.expect(Scene.selector('a')).toHaveAttr('href', href),
            Scene.expect(Scene.selector('a')).toHaveAttr('target', '_blank'),
            Scene.expect(Scene.selector('a')).toHaveAttr('rel', 'noreferrer'),
            Scene.expect(Scene.selector('.sr-only')).toHaveText(' (opens in a new tab)'),
          ]
        : []),
    ),
  )
}
it.effect('a manually closed running root keeps shimmer and metadata', () =>
  Scene.scene(
    {
      block: ThinkingStepsBlock,
      layer: ThinkingStepsLayer,
      viewInputs: { animate, meta: () => '12s', content: () => [] },
    },
    Scene.init({ id: 'root', running: true }),
    Scene.inMessage(ThinkingStepsBlock.InMessage.RequestedToggle()),
    Scene.expect(Scene.selector('button')).toHaveAttr('aria-expanded', 'false'),
    Scene.expectAll(Scene.all.selector('.shimmer-text')).toHaveCount(1),
    Scene.expect(Scene.selector('.tabular-nums')).toHaveText('12s'),
  ),
)
