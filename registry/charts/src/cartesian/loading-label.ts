export function loadingLabel(text: string) {
  const output = document.createElement('output')
  output.className =
    'ts-bkm-loading-label-wrap [transition:transform_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_opacity_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_filter_0.45s_cubic-bezier(0.85,_0,_0.15,_1)] data-[hidden]:hidden data-[exiting]:[transform:translateY(30px)] data-[exiting]:opacity-0 data-[exiting]:[filter:blur(2px)]'
  output.setAttribute('data-slot', 'loading-label')
  output.setAttribute('aria-live', 'polite')
  const length = text.length
  const cycle = 1 + length * 0.05
  const end = 100 / cycle
  const style = document.createElement('style')
  style.textContent = `@keyframes bkm-label-char-${length}{0%{color:var(--bkm-label-color);animation-timing-function:ease-in-out}${end / 2}%{color:var(--bkm-shimmer-color);animation-timing-function:ease-in-out}${end}%,100%{color:var(--bkm-label-color)}}`
  const content = document.createElement('span')
  content.className = 'ts-bkm-loading-label-text select-none'

  for (const [index, char] of text.split('').entries()) {
    const span = document.createElement('span')
    span.className =
      'ts-bkm-loading-label-char [animation:var(--bkm-label-animation)] [animation-delay:var(--bkm-label-delay)]'
    span.setAttribute('aria-hidden', 'true')
    span.textContent = char
    span.style.setProperty('--bkm-label-animation', `bkm-label-char-${length} ${cycle}s infinite`)
    span.style.setProperty('--bkm-label-delay', `${index / length}s`)
    content.append(span)
  }

  const accessible = document.createElement('span')
  accessible.textContent = text
  accessible.className =
    'absolute [width:1px] [height:1px] [margin:-1px] p-0 overflow-hidden [clip-path:inset(50%)] whitespace-nowrap border-0'
  content.append(accessible)
  output.append(style, content)

  return {
    element: output,
    update: (shown: boolean, exiting: boolean) => {
      output.toggleAttribute('data-hidden', !shown || text.trim() === '')
      output.toggleAttribute('data-exiting', exiting)
    },
  }
}
