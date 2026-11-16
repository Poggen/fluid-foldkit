import { expect, type Page } from '@playwright/test'

type CardGeometry = {
  x: number
  y: number
  documentY: number
  width: number
  height: number
  scrollY: number
  fullyVisible: boolean
}

type ReturnFrame = {
  time: number
  geometry: CardGeometry | null
  usable: boolean
  value: string | null
  appearance: { opacity: number; rendered: boolean }
  settlementReady: boolean
}

declare global {
  interface Window {
    galleryReturnTrace?: {
      frames: ReturnFrame[]
      phaseLength: number
      settled: boolean
      stop: () => void
    }
  }
}

export const observeGalleryReturn = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    window.galleryReturnTrace?.stop()
    const frames: ReturnFrame[] = []
    let frameId = 0
    let usableFrames = 0
    let previous: ReturnFrame | null = null
    const sample = (time: number) => {
      const card = document.querySelector(selector)
      const rect = card?.getBoundingClientRect()
      const input = card?.querySelector('input, textarea')
      const inputStyle = input instanceof HTMLElement ? getComputedStyle(input) : null
      const inputRect = input?.getBoundingClientRect()
      const usable =
        (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) &&
        !input.disabled &&
        !input.readOnly &&
        inputStyle?.visibility === 'visible' &&
        inputStyle.display !== 'none' &&
        inputRect !== undefined &&
        inputRect.width > 0 &&
        inputRect.height > 0
      const ancestry: Element[] = []
      for (let element = input; element != null; element = element.parentElement)
        ancestry.push(element)
      let opacity = 1
      let rendered = inputStyle?.visibility === 'visible' && inputRect !== undefined
      let left = inputRect?.left ?? 0
      let right = inputRect?.right ?? 0
      let top = inputRect?.top ?? 0
      let bottom = inputRect?.bottom ?? 0
      for (const element of ancestry) {
        const style = getComputedStyle(element)
        opacity *= Number(style.opacity)
        rendered = rendered && style.display !== 'none' && style.contentVisibility !== 'hidden'
        if (element !== input) {
          const bounds = element.getBoundingClientRect()
          const scaleX =
            element instanceof HTMLElement && element.offsetWidth > 0
              ? bounds.width / element.offsetWidth
              : 1
          const scaleY =
            element instanceof HTMLElement && element.offsetHeight > 0
              ? bounds.height / element.offsetHeight
              : 1
          if (style.overflowX !== 'visible') {
            left = Math.max(left, bounds.left + element.clientLeft * scaleX)
            right = Math.min(
              right,
              bounds.left + (element.clientLeft + element.clientWidth) * scaleX,
            )
          }
          if (style.overflowY !== 'visible') {
            top = Math.max(top, bounds.top + element.clientTop * scaleY)
            bottom = Math.min(
              bottom,
              bounds.top + (element.clientTop + element.clientHeight) * scaleY,
            )
          }
        }
      }
      rendered = rendered && opacity > 0 && right > left && bottom > top
      const transformsIdle = ancestry.every((element) => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' || new DOMMatrixReadOnly(transform).isIdentity
      })
      const pendingAnimation = document.getAnimations().some((animation) => {
        const endTime = animation.effect?.getComputedTiming().endTime
        return (
          animation.timeline instanceof DocumentTimeline &&
          typeof endTime === 'number' &&
          Number.isFinite(endTime) &&
          (animation.pending || animation.playState === 'running')
        )
      })
      const frame: ReturnFrame = {
        time,
        geometry:
          rect === undefined
            ? null
            : {
                x: rect.x,
                y: rect.y,
                documentY: rect.y + scrollY,
                width: rect.width,
                height: rect.height,
                scrollY,
                fullyVisible:
                  rect.width > 0 &&
                  rect.height > 0 &&
                  rect.left >= 0 &&
                  rect.top >= 0 &&
                  rect.right <= innerWidth &&
                  rect.bottom <= innerHeight,
              },
        usable,
        value:
          input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
            ? input.value
            : null,
        appearance: { opacity, rendered },
        settlementReady: document.fonts.status === 'loaded' && !pendingAnimation && transformsIdle,
      }
      frames.push(frame)
      if (usableFrames > 0 || usable) usableFrames++
      if (usableFrames === 13) trace.phaseLength = frames.length
      const geometry = frame.geometry
      const previousGeometry = previous?.geometry
      if (
        usableFrames > 14 &&
        frame.settlementReady &&
        previous?.settlementReady &&
        geometry !== null &&
        previousGeometry != null &&
        Math.abs(geometry.x - previousGeometry.x) <= 1 &&
        Math.abs(geometry.y - previousGeometry.y) <= 1 &&
        Math.abs(geometry.width - previousGeometry.width) <= 1 &&
        Math.abs(geometry.height - previousGeometry.height) <= 1 &&
        Math.abs(geometry.scrollY - previousGeometry.scrollY) <= 1
      ) {
        trace.settled = true
        return
      }
      previous = frame
      frameId = requestAnimationFrame(sample)
    }
    const start = () => {
      frameId = requestAnimationFrame(sample)
    }
    const trace = {
      frames,
      phaseLength: 0,
      settled: false,
      stop: () => {
        removeEventListener('popstate', start)
        cancelAnimationFrame(frameId)
      },
    }
    window.galleryReturnTrace = trace
    addEventListener('popstate', start, { once: true })
  }, selector)

export const readGalleryReturn = async (page: Page) => {
  await expect
    .poll(() => page.evaluate(() => (window.galleryReturnTrace?.phaseLength ?? 0) > 0))
    .toBe(true)
  return page.evaluate(() => {
    const trace = window.galleryReturnTrace
    return trace?.frames.slice(0, trace.phaseLength) ?? []
  })
}

export const readSettledGalleryReturn = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect
    .poll(() => page.evaluate(() => window.galleryReturnTrace?.settled === true))
    .toBe(true)
  return page.evaluate(() => window.galleryReturnTrace?.frames ?? [])
}

export const stopGalleryReturn = (page: Page) =>
  page.evaluate(() => {
    const frames = window.galleryReturnTrace?.frames ?? []
    window.galleryReturnTrace?.stop()
    delete window.galleryReturnTrace
    return frames
  })
