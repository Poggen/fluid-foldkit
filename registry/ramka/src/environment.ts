/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Context, Layer } from 'effect'
import type { MorphOptions } from './morph.js'

export interface HostOptions extends MorphOptions {
  readonly container?: Element | DocumentFragment | null | (() => Element | DocumentFragment | null)
  readonly scrollToZoom?: boolean
  readonly wheelSensitivity?: number
  readonly keyboardPanDistance?: number
  readonly doubleClickDelay?: number
  readonly onZoomChange?: (zoom: number) => void
  readonly wrapSelectCommit?: (
    commit: () => void,
    slides: HTMLElement | null,
    index: number,
  ) => void
}
export class Environment extends Context.Service<
  Environment,
  {
    readonly forInstance: (id: string) => HostOptions
  }
>()('RamkaEnvironment') {}

export const environmentLayer = (forInstance: (id: string) => HostOptions = () => ({})) =>
  Layer.succeed(Environment, Environment.of({ forInstance }))
export const defaultEnvironmentLayer = environmentLayer()
