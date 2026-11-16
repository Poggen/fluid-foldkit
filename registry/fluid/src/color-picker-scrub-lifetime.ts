import { Schema } from 'effect'
import { Channel } from './color-picker-state.js'

const isChannel = Schema.is(Channel)

export const colorField = (event: Event) =>
  event.target instanceof Element ? event.target.closest<HTMLElement>('[data-color-channel]') : null

export const colorFieldChannel = (event: Event) => {
  const raw = colorField(event)?.dataset.colorChannel

  return isChannel(raw) ? raw : undefined
}

interface ScrubOccurrence {
  readonly pointer: number
  readonly target: EventTarget | null
  readonly input: HTMLInputElement | null
  movement: number
  moved: boolean
  clicked: boolean
}

/** Own only the browser release/click occurrence; checked color values remain in Model. */
export function colorScrubLifetime(
  document: Document,
  win: Window & typeof globalThis,
  released: (event: PointerEvent, cancelled: boolean) => void,
) {
  let current: ScrubOccurrence | undefined
  let pendingClick: ScrubOccurrence | undefined
  let releaseTimer: number | undefined
  let clickTimer: number | undefined

  const clearTimers = () => {
    win.clearTimeout(releaseTimer)
    win.clearTimeout(clickTimer)
    releaseTimer = undefined
    clickTimer = undefined
  }

  const unlock = () => {
    try {
      document.exitPointerLock()

      return true
    } catch {
      return false
    }
  }

  return {
    start(event: PointerEvent, input: HTMLInputElement | null) {
      clearTimers()
      pendingClick = undefined
      current = {
        pointer: event.pointerId,
        target: event.target,
        input,
        movement: 0,
        moved: false,
        clicked: false,
      }
    },
    move(event: PointerEvent) {
      if (current?.pointer !== event.pointerId) {
        return
      }

      current.movement += event.movementX

      if (Math.abs(current.movement) >= 1) {
        current.movement = 0
        current.moved = true
      }
    },
    click(event: MouseEvent): Exclude<Channel, 'hex'> | null {
      const ch = colorFieldChannel(event)
      const input = colorField(event)?.querySelector('input')

      if (ch === undefined || ch === 'hex' || input === null || input === undefined) {
        return null
      }

      if (current !== undefined) {
        current.clicked = true
      }

      if (pendingClick !== undefined) {
        pendingClick.clicked = true
      }

      input.focus()
      input.select()

      return ch
    },
    release(event: PointerEvent, cancelled: boolean) {
      const occurrence = current

      if (occurrence?.pointer !== event.pointerId) {
        return
      }

      const finish = () => {
        if (current !== occurrence) {
          return
        }

        unlock()
        current = undefined
        released(event, cancelled)
        occurrence.input?.blur()
        pendingClick = undefined

        if (
          !cancelled &&
          !occurrence.moved &&
          occurrence.target !== null &&
          occurrence.input !== null
        ) {
          pendingClick = occurrence
          clickTimer = win.setTimeout(() => {
            if (pendingClick === occurrence && !occurrence.clicked) {
              occurrence.target?.dispatchEvent(
                new win.MouseEvent('click', { bubbles: true, cancelable: true }),
              )
            }

            if (pendingClick === occurrence) {
              pendingClick = undefined
            }
          }, 0)
        }
      }

      // Pinned Base UI delays the entire release handler only for Gecko.
      if (win.navigator.userAgent.includes('Firefox')) {
        releaseTimer = win.setTimeout(finish, 20)
      } else {
        finish()
      }
    },
    dispose() {
      clearTimers()

      if (current !== undefined) {
        unlock()
      }

      current = undefined
      pendingClick = undefined
    },
  }
}
