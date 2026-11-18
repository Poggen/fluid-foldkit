import { exitFallbackMs, spring } from '../lib/springs.js'
import { Observation } from './state.js'

export function observeCalendarExits(
  element: HTMLElement,
  window: Window & typeof globalThis,
  emit: (observation: Observation) => void,
) {
  const completed = new WeakMap<HTMLElement, string>()
  const timers = new Map<'Ghost' | 'CommittedEnd', { generation: number; timer: number }>()
  let disposed = false

  const schedule = (
    kind: 'Ghost' | 'CommittedEnd',
    active: boolean,
    generation: string | undefined,
  ) => {
    const previous = timers.get(kind)
    const value = Number(generation)

    if (!active || !Number.isInteger(value) || value < 0) {
      if (previous !== undefined) {
        window.clearTimeout(previous.timer)
      }

      timers.delete(kind)

      return
    }

    if (previous?.generation === value) {
      return
    }

    if (previous !== undefined) {
      window.clearTimeout(previous.timer)
    }

    const timer = window.setTimeout(() => {
      if (!disposed && timers.get(kind)?.timer === timer) {
        emit(
          kind === 'Ghost'
            ? Observation.cases.GhostSettled.make({ generation: value })
            : Observation.cases.CommittedEndSettled.make({ generation: value }),
        )
      }
    }, exitFallbackMs(spring.moderate))

    timers.set(kind, { generation: value, timer })
  }

  const scan = () => {
    schedule(
      'Ghost',
      element.dataset.calendarGhost === 'true',
      element.dataset.calendarGhostGeneration,
    )
    schedule(
      'CommittedEnd',
      element.dataset.calendarCommittedEnd === 'true',
      element.dataset.calendarCommittedEndGeneration,
    )
  }

  const exited = (event: Event) => {
    const { target } = event

    if (disposed || !(target instanceof window.HTMLElement) || !element.contains(target)) {
      return
    }

    const overlayKey = target.dataset.calendarOverlay

    if (overlayKey !== undefined) {
      const generation = Number(target.dataset.calendarOverlayGeneration)

      if (
        target.dataset.calendarOverlayPresent !== 'false' ||
        !Number.isInteger(generation) ||
        generation < 0
      ) {
        return
      }

      const token = `${overlayKey}:${generation}`
      completed.set(target, token)

      const peers = [...element.querySelectorAll<HTMLElement>('[data-calendar-overlay]')].filter(
        (peer) => peer.dataset.calendarOverlay === overlayKey,
      )

      if (
        peers.every(
          (peer) =>
            peer.dataset.calendarOverlayPresent === 'false' &&
            peer.dataset.calendarOverlayGeneration === String(generation) &&
            completed.get(peer) === token,
        )
      ) {
        emit(Observation.cases.OverlayExited.make({ key: overlayKey, generation }))
      }

      return
    }

    const key = target.dataset.calendarPanel

    if (key === undefined || target.dataset.calendarPresent !== 'false') {
      return
    }

    completed.set(target, key)

    const peers = [...element.querySelectorAll<HTMLElement>('[data-calendar-panel]')].filter(
      (peer) => peer.dataset.calendarPanel === key,
    )

    if (
      peers.every((peer) => peer.dataset.calendarPresent === 'false' && completed.get(peer) === key)
    ) {
      emit(Observation.cases.PanelExited.make({ key }))
    }
  }

  const dispose = () => {
    disposed = true

    for (const { timer } of timers.values()) {
      window.clearTimeout(timer)
    }

    timers.clear()
  }

  return { scan, exited, dispose }
}
