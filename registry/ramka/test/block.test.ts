import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { App, layer as appLayer } from './fixtures/parent.js'
import { LightboxBlock, layer } from '../src/index.js'

it.effect('parent operations update the registered child and preserve live parent updates', () =>
  Story.story(
    { block: App, layer: appLayer },
    Story.init(),
    Story.message(App.Message.ToggledLoop()),
    Story.model((model) => expect(model.gallery.options.loop).toBe(true)),
    Story.message(App.Message.ToggledLoop()),
    Story.model((model) => expect(model.gallery.options.loop).toBe(false)),
    Story.message(App.Message.OpenedThird()),
    Story.model((model) => {
      expect(model.gallery.open).toBe(false)
      expect(model.gallery.phase).toBe('Preparing')
      expect(model.gallery.index).toBe(2)
    }),
    Story.message(App.Message.Added()),
    Story.model((model) => expect(model.samples).toBe(1)),
  ),
)
it.effect(
  'controlled requests notify without mutating accepted state and acknowledgements commit',
  () =>
    Story.story(
      { block: LightboxBlock, layer },
      Story.init({
        id: 'controlled',
        items: [{ id: 'one' }, { id: 'two' }],
        open: false,
        value: 0,
      }),
      Story.inMessage(LightboxBlock.InMessage.RequestedOpen({ index: 1 })),
      Story.expectOutMessage(
        LightboxBlock.OutMessage.Changed({
          open: true,
          index: 1,
          openChanged: true,
          valueChanged: true,
          source: 'imperative',
        }),
      ),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.index).toBe(0)
      }),
      Story.inMessage(LightboxBlock.InMessage.InformedOfValue({ index: 1 })),
      Story.inMessage(LightboxBlock.InMessage.InformedOfOpen({ open: true })),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.phase).toBe('Preparing')
      }),
      Story.messageWith((model) =>
        LightboxBlock.Message.VisibilityCommitted({ generation: model.generation, open: true }),
      ),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.index).toBe(1)
      }),
      Story.message(LightboxBlock.Message.Settled({ generation: 0, open: true })),
      Story.expectNoOutMessage(),
      Story.messageWith((model) =>
        LightboxBlock.Message.Settled({ generation: model.generation, open: true }),
      ),
      Story.expectOutMessage(LightboxBlock.OutMessage.OpenChangeCompleted({ open: true })),
    ),
)
it.effect('loop, bounds, nonfinite zoom and empty item updates keep a usable state', () =>
  Story.story(
    { block: LightboxBlock, layer },
    Story.init({ id: 'loop', items: [{ id: 'one' }, { id: 'two' }], options: { loop: true } }),
    Story.inMessage(LightboxBlock.InMessage.RequestedPrevious()),
    Story.expectOutMessage(
      LightboxBlock.OutMessage.ValueChanged({ index: 1, source: 'imperative' }),
    ),
    Story.inMessage(LightboxBlock.InMessage.RequestedOpen({})),
    Story.expectOutMessage(
      LightboxBlock.OutMessage.Changed({
        open: true,
        index: 1,
        openChanged: true,
        valueChanged: false,
        source: 'imperative',
      }),
    ),
    Story.messageWith((model) =>
      LightboxBlock.Message.VisibilityCommitted({ generation: model.generation, open: true }),
    ),
    Story.message(LightboxBlock.Message.PoseRequested({ zoom: 999, x: 0, y: 0 })),
    Story.expectOutMessage(LightboxBlock.OutMessage.ZoomChanged({ zoom: 4 })),
    Story.inMessage(LightboxBlock.InMessage.InformedOfItems({ items: [] })),
    Story.messageWith((model) =>
      LightboxBlock.Message.VisibilityCommitted({ generation: model.generation, open: false }),
    ),
    Story.model((model) => {
      expect(model.open).toBe(false)
      expect(model.index).toBe(0)
      expect(model.zoom).toBe(1)
    }),
  ),
)

it.effect(
  'imperative opening reports its source while physical trigger opening keeps trigger metadata',
  () =>
    Story.story(
      { block: LightboxBlock, layer },
      Story.init({ id: 'source', items: [{ id: 'a' }, { id: 'b' }] }),
      Story.inMessage(LightboxBlock.InMessage.RequestedOpen({ index: 1 })),
      Story.expectOutMessage(
        LightboxBlock.OutMessage.Changed({
          open: true,
          index: 1,
          openChanged: true,
          valueChanged: true,
          source: 'imperative',
        }),
      ),
      Story.inMessage(LightboxBlock.InMessage.RequestedClose()),
      Story.message(LightboxBlock.Message.Opened({ index: 0, triggerId: 'source-trigger-0' })),
      Story.expectOutMessage(
        LightboxBlock.OutMessage.Changed({
          open: true,
          index: 0,
          openChanged: true,
          valueChanged: true,
          source: 'trigger',
        }),
      ),
    ),
)
it.effect(
  'native scroll admits imperative navigation while dropping discrete control requests, then close clears the lock',
  () =>
    Story.story(
      { block: LightboxBlock, layer },
      Story.init({
        id: 'scrolling',
        items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        defaultOpen: true,
      }),
      Story.message(LightboxBlock.Message.ScrollingChanged({ scrolling: true })),
      Story.inMessage(LightboxBlock.InMessage.RequestedNavigate({ index: 1, source: 'button' })),
      Story.expectNoOutMessage(),
      Story.model((model) => expect(model.index).toBe(0)),
      Story.inMessage(
        LightboxBlock.InMessage.RequestedNavigate({ index: 2, source: 'imperative' }),
      ),
      Story.model((model) => expect(model.index).toBe(2)),
      Story.inMessage(LightboxBlock.InMessage.RequestedClose()),
      Story.model((model) => expect(model.scrolling).toBe(false)),
    ),
)

it.effect(
  'preparation publishes no open state until the matching physical commit, and closing preserves the captured pose',
  () =>
    Story.story(
      { block: LightboxBlock, layer },
      Story.init({ id: 'physical', items: [{ id: 'one' }] }),
      Story.inMessage(LightboxBlock.InMessage.RequestedOpen({ index: 0 })),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.phase).toBe('Preparing')
      }),
      Story.message(LightboxBlock.Message.VisibilityCommitted({ generation: 0, open: true })),
      Story.model((model) => expect(model.open).toBe(false)),
      Story.messageWith((model) =>
        LightboxBlock.Message.VisibilityCommitted({ generation: model.generation, open: true }),
      ),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.phase).toBe('Opening')
      }),
      Story.messageWith((model) =>
        LightboxBlock.Message.Settled({ generation: model.generation, open: true }),
      ),
      Story.message(LightboxBlock.Message.PoseRequested({ zoom: 2, x: 30, y: 20 })),
      Story.inMessage(LightboxBlock.InMessage.RequestedClose()),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.phase).toBe('Closing')
        expect(model.zoom).toBe(2)
        expect(model.x).toBe(30)
      }),
      Story.messageWith((model) =>
        LightboxBlock.Message.VisibilityCommitted({ generation: model.generation, open: false }),
      ),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.zoom).toBe(2)
      }),
      Story.messageWith((model) =>
        LightboxBlock.Message.Settled({ generation: model.generation, open: false }),
      ),
      Story.model((model) => {
        expect(model.phase).toBe('Closed')
        expect(model.zoom).toBe(1)
      }),
    ),
)
it.effect(
  'zoom notifications announce commits while visual compositor samples remain observable in the Model',
  () =>
    Story.story(
      { block: LightboxBlock, layer },
      Story.init({ id: 'notify', items: [{ id: 'one' }], defaultOpen: true }),
      Story.message(
        LightboxBlock.Message.PoseRequested({
          zoom: 1,
          x: 0,
          y: 0,
          tracking: true,
          animationTarget: { zoom: 2, x: 20, y: 0, changesZoom: true },
          notify: true,
        }),
      ),
      Story.expectOutMessage(LightboxBlock.OutMessage.ZoomChanged({ zoom: 2 })),
      Story.message(
        LightboxBlock.Message.PoseRequested({
          zoom: 1.4,
          x: 5,
          y: 0,
          tracking: true,
          animationTarget: { zoom: 2, x: 20, y: 0, changesZoom: true },
          notify: false,
        }),
      ),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.zoom).toBe(1.4)
        expect(model.notifiedZoom).toBe(2)
      }),
      Story.message(
        LightboxBlock.Message.PoseRequested({
          zoom: 2,
          x: 20,
          y: 0,
          tracking: false,
          notify: true,
        }),
      ),
      Story.expectNoOutMessage(),
    ),
)
