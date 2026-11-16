;(async () => {
  const native = location.port === '4531'
  const fixture = await import(
    native ? '/src/presentation-root-check.ts' : '/presentation-root-check.tsx'
  )
  const frames = async () => {
    for (let index = 0; index < 5; index++) await new Promise(requestAnimationFrame)
  }
  const property = () => document.documentElement.style.getPropertyValue('--shape-input-radius')
  const a = document.createElement('div'),
    b = document.createElement('div')
  a.id = 'presentation-check-root-a'
  b.id = 'presentation-check-root-b'
  document.body.append(a, b)
  const first = fixture.mountA(a)
  await frames()
  const nested = property()
  const second = fixture.mountB(b)
  await frames()
  const twoRoots = property()
  await first.dispose()
  await frames()
  const disposedFirst = property()
  await second.dispose()
  await frames()
  const disposedSecond = property()
  a.remove()
  b.remove()
  return { nested, twoRoots, disposedFirst, disposedSecond }
})()
