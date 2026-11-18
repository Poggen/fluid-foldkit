import { Effect, Stream } from 'effect'
import { createColorNumberEnvironment } from '../src/color-number-locale'
import { observeColorPicker } from '../src/color-picker-observer'

const root = document.createElement('main')
const field = document.createElement('div')
field.dataset.colorChannel = 'r'
field.style.cssText = 'width:240px;height:60px;padding:20px;'
const input = document.createElement('input')
input.value = '107'
input.setAttribute('aria-label', 'Red channel')
field.append(input)
root.append(field)
document.body.append(root)
const output = document.createElement('output')
output.id = 'scrub-observations'
document.body.append(output)
const messages: Array<object> = []
const state = {
  ready: false,
  pointerErrors: 0,
  blurs: 0,
  focusedAtReturn: false,
  selectionAtReturn: false,
  locked: false,
  messages,
}
const publish = () => {
  state.locked = document.pointerLockElement !== null
  output.textContent = JSON.stringify(state)
}
input.addEventListener('blur', () => {
  state.blurs += 1
  publish()
})
document.addEventListener('pointerlockerror', () => {
  state.pointerErrors += 1
  publish()
})
Effect.runFork(
  observeColorPicker(root, Stream.make('Live'), createColorNumberEnvironment()).pipe(
    Stream.runForEach((message) =>
      Effect.sync(() => {
        messages.push(message)
        if (message._tag === 'Mounted') {
          state.ready = true
          root.addEventListener('pointerdown', () => {
            state.focusedAtReturn = document.activeElement === input
            state.selectionAtReturn = input.selectionStart === 3 && input.selectionEnd === 3
            publish()
          })
        }
        if (message._tag === 'ScrubDown') root.dataset.colorScrubbing = ''
        if (message._tag === 'ScrubUp') delete root.dataset.colorScrubbing
        publish()
      }),
    ),
  ),
)
