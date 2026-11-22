/* @license Adapted from Ramka (MIT), Copyright (c) 2026 Artur Bień. */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import type { Product } from './models-data'
import {
  normalizeModel,
  fitCameraToUnitObject,
  getViewStore,
  type SpinState,
  TARGET_SPIN_RAD_PER_SEC,
  readViewPose,
  applyViewPose,
  captureFlickIntoSpin,
  applySpinStep,
} from './models-orbit'

type CachedScene = { model: Promise<THREE.Group>; references: number }
const cache = new Map<string, CachedScene>()
function disposeModel(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value)
      }
    }
  })
  for (const value of geometries) value.dispose()
  for (const value of materials) value.dispose()
  for (const value of textures) value.dispose()
}
function acquireGltf(url: string) {
  let entry = cache.get(url)
  if (!entry) {
    entry = { model: new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene), references: 0 }
    cache.set(url, entry)
  }
  entry.references += 1
  const retained = entry
  return {
    model: retained.model.then((scene) => scene.clone(true)),
    release() {
      retained.references -= 1
      if (retained.references !== 0) return
      if (cache.get(url) === retained) cache.delete(url)
      void retained.model.then(disposeModel, () => undefined)
    },
  }
}

export function mountModel(host: HTMLElement, product: Product, role: 'trigger' | 'lightbox') {
  const canvas = document.createElement('canvas')
  canvas.className = 'absolute inset-0 block size-full bg-transparent'
  canvas.style.touchAction = 'none'
  host.appendChild(canvas)

  const sourceId = Symbol(product.id)
  const store = getViewStore(product.id)
  let paintSignaled = false
  delete host.dataset.modelReady

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = new RoomEnvironment()
  const env = pmrem.fromScene(environment, 0.04).texture
  environment.dispose()
  scene.environment = env
  pmrem.dispose()

  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2.5, 4, 3)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-3, 1.5, -2)
  scene.add(fill)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)

  const controls = new TrackballControls(camera, canvas)
  controls.noPan = true
  controls.noZoom = true
  controls.rotateSpeed = 1.4
  controls.dynamicDampingFactor = 0.15
  controls.enabled = role === 'lightbox' && host.dataset.interactive === 'true'

  const spin: SpinState = {
    axis: store.pose?.spinAxis
      ? new THREE.Vector3().fromArray(store.pose.spinAxis).normalize()
      : new THREE.Vector3(0, 1, 0),
    speed: store.pose?.spinSpeed ?? TARGET_SPIN_RAD_PER_SEC,
  }

  let frame = 0
  let disposed = false
  let visible = false
  let applyingShared = false
  let userDragging = false
  let lastFrameTime: number | null = null
  let lastDt = 1 / 60

  let ready = false

  const publishPose = () => {
    if (!ready || applyingShared || disposed) return
    store.set(readViewPose(camera, controls, spin), sourceId)
  }

  const onControlsChange = () => {
    publishPose()
  }
  controls.addEventListener('change', onControlsChange)

  const onOrbitStart = () => {
    userDragging = true
  }
  const onOrbitEnd = () => {
    userDragging = false
    captureFlickIntoSpin(controls, spin, lastDt)
    publishPose()
  }
  controls.addEventListener('start', onOrbitStart)
  controls.addEventListener('end', onOrbitEnd)

  const unsub = store.subscribe((pose, source) => {
    if (!ready || source === sourceId || disposed) return
    applyingShared = true
    applyViewPose(camera, controls, pose, spin)
    applyingShared = false
  })

  const setSize = () => {
    const width = host.clientWidth
    const height = host.clientHeight
    if (width < 1 || height < 1) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    controls.handleResize()
  }

  const signalPaintedIfNeeded = () => {
    if (!ready || disposed || paintSignaled) return
    if (host.clientWidth < 1 || host.clientHeight < 1) return

    paintSignaled = true

    if (store.pose) {
      applyingShared = true
      applyViewPose(camera, controls, store.pose, spin)
      applyingShared = false
    }
    setSize()
    controls.update()
    renderer.render(scene, camera)

    requestAnimationFrame(() => {
      if (disposed) return
      requestAnimationFrame(() => {
        if (disposed) return
        host.dataset.modelReady = 'true'
      })
    })
  }

  const render = (now: number) => {
    if (disposed || !visible) return
    const dt = lastFrameTime === null ? 1 / 60 : Math.min((now - lastFrameTime) / 1000, 0.1)
    lastFrameTime = now
    lastDt = dt

    if (host.dataset.spinning === 'true' && !userDragging && ready) {
      applySpinStep(camera, controls, spin, dt)
      publishPose()
    }

    signalPaintedIfNeeded()
    controls.enabled = role === 'lightbox' && host.dataset.interactive === 'true'
    controls.update()
    renderer.render(scene, camera)
    frame = requestAnimationFrame(render)
  }

  setSize()
  const visibility = new IntersectionObserver((entries) => {
    const next = entries.some((entry) => entry.isIntersecting)
    if (next === visible) return
    visible = next
    if (visible) {
      lastFrameTime = null
      frame = requestAnimationFrame(render)
    } else cancelAnimationFrame(frame)
  })
  visibility.observe(host)

  const ro = new ResizeObserver(setSize)
  ro.observe(host)

  const lease = acquireGltf(product.src)
  void lease.model
    .then((model) => {
      if (disposed) return
      const framed = normalizeModel(model)
      scene.add(framed)

      const savedPose = store.pose

      applyingShared = true
      fitCameraToUnitObject(camera, controls)
      controls.handleResize()
      controls.update()
      if (savedPose) {
        applyViewPose(camera, controls, savedPose, spin)
      } else {
        store.set(readViewPose(camera, controls, spin), sourceId)
      }
      applyingShared = false
      ready = true
      signalPaintedIfNeeded()
    })
    .catch((err) => {
      if (disposed) return
      host.dataset.modelError = String(err)
      host.append('Unable to load model.')
    })

  return () => {
    disposed = true
    delete host.dataset.modelReady
    cancelAnimationFrame(frame)
    ro.disconnect()
    visibility.disconnect()
    unsub()
    controls.removeEventListener('change', onControlsChange)
    controls.removeEventListener('start', onOrbitStart)
    controls.removeEventListener('end', onOrbitEnd)

    if (ready && !applyingShared) {
      captureFlickIntoSpin(controls, spin, lastDt)
      store.set(readViewPose(camera, controls, spin), sourceId)
    }

    controls.dispose()
    env.dispose()

    scene.clear()
    lease.release()

    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }
}
