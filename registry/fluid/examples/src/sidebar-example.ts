import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { sidebarLayer } from '@foldkit-visuals/fluid/sidebar'
import { navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { layer as ScrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import { layer as TooltipsLayer } from '@foldkit-visuals/fluid/tooltip'
import {
  FluidSidebarShowcaseBlock,
  init,
  update,
  services,
  motion,
} from './sidebar-example-state.js'
import { view } from './sidebar-example-view.js'
import './sidebar-example.css'

const layer = FluidSidebarShowcaseBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(sidebarLayer, navMenuLayer, ScrollLayer, TooltipsLayer)),
)

Runtime.run(
  Program.make({
    block: FluidSidebarShowcaseBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide({ services, runtime: motion.layer }),
)
