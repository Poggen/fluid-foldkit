import type { Block } from 'foldkit'
import type { dialogContract } from './dialog-definition.js'
import { Portal, Observe } from './dialog-definition.js'

export const dialogComposition = <const Key extends symbol>(
  block: ReturnType<typeof Block.make<'FluidDialog', Key, typeof dialogContract>>,
) => block.makeComposition({ mounts: [Portal, Observe] })
