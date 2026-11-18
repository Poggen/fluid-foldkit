;(async () => {
  const frame = () => new Promise(requestAnimationFrame)
  const guard = () => document.documentElement.classList.contains('transitioning')
  document.getElementById('shape').click()
  for (let index = 0; index < 3; index++) await frame()
  const beforeUnmount = guard()
  document.getElementById('mount').click()
  for (let index = 0; index < 3; index++) await frame()
  const afterUnmount = guard()
  let frames = 0
  while (guard() && frames < 60) {
    await frame()
    frames++
  }
  const afterExpiry = guard()
  document.getElementById('mount').click()
  for (let index = 0; index < 4; index++) await frame()
  return {
    beforeUnmount,
    afterUnmount,
    afterExpiry,
    property: document.documentElement.style.getPropertyValue('--shape-input-radius'),
    frames,
  }
})()
