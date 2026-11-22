/* @license Adapted from Ramka (MIT), Copyright (c) 2026 Artur Bień. */
import * as THREE from 'three'
import type { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'

export function normalizeModel(model: THREE.Object3D) {
  const wrapped = new THREE.Group()
  wrapped.add(model)
  model.updateWorldMatrix(true, true)

  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1

  model.position.sub(center)
  wrapped.scale.setScalar(1 / maxDim)
  wrapped.updateMatrixWorld(true)
  return wrapped
}

export function fitCameraToUnitObject(
  camera: THREE.PerspectiveCamera,
  controls: TrackballControls,
) {
  const maxSize = 1
  const fitHeightDistance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
  const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.001)
  const distance = 1.45 * Math.max(fitHeightDistance, fitWidthDistance)
  camera.near = distance / 100
  camera.far = distance * 100
  controls.target.set(0, 0, 0)
  camera.up.set(0, 1, 0)
  camera.position.set(distance * 0.35, distance * 0.2, distance)
  camera.lookAt(controls.target)
  camera.updateProjectionMatrix()
}

type ViewPose = {
  direction: [number, number, number]
  up: [number, number, number]
  spinAxis: [number, number, number]

  spinSpeed: number
}

export type SpinState = {
  axis: THREE.Vector3

  speed: number
}

function trackballInertia(controls: TrackballControls) {
  if (
    !('_eye' in controls) ||
    !(controls._eye instanceof THREE.Vector3) ||
    !('_lastPosition' in controls) ||
    !(controls._lastPosition instanceof THREE.Vector3) ||
    !('_lastAxis' in controls) ||
    !(controls._lastAxis instanceof THREE.Vector3) ||
    !('_lastAngle' in controls) ||
    typeof controls._lastAngle !== 'number'
  )
    throw new TypeError('Unsupported TrackballControls inertia fields')
  return {
    eye: controls._eye,
    lastPosition: controls._lastPosition,
    lastAxis: controls._lastAxis,
    lastAngle: controls._lastAngle,
    resetAngle() {
      controls._lastAngle = 0
    },
  }
}

type ViewStore = {
  pose: ViewPose | null
  listeners: Set<(pose: ViewPose, source: symbol) => void>
  set(pose: ViewPose, source: symbol): void
  subscribe(fn: (pose: ViewPose, source: symbol) => void): () => void
}

const viewStores = new Map<string, ViewStore>()

export function getViewStore(productId: string) {
  let store = viewStores.get(productId)
  if (!store) {
    store = {
      pose: null,
      listeners: new Set(),
      set(pose, source) {
        this.pose = pose
        for (const listener of this.listeners) listener(pose, source)
      },
      subscribe(fn) {
        this.listeners.add(fn)
        return () => {
          this.listeners.delete(fn)
        }
      },
    }
    viewStores.set(productId, store)
  }
  return store
}

const _offset = new THREE.Vector3()
const _direction = new THREE.Vector3()
const _up = new THREE.Vector3()

const TRIGGER_AUTO_ROTATE_SPEED = 1
export const TARGET_SPIN_RAD_PER_SEC = ((2 * Math.PI) / 60) * TRIGGER_AUTO_ROTATE_SPEED

const SPIN_SPEED_BLEND = 2.2

export function readViewPose(
  camera: THREE.PerspectiveCamera,
  controls: TrackballControls,
  spin: SpinState,
) {
  _direction.copy(camera.position).sub(controls.target).normalize()
  _up.copy(camera.up).normalize()
  return {
    direction: [_direction.x, _direction.y, _direction.z],
    up: [_up.x, _up.y, _up.z],
    spinAxis: [spin.axis.x, spin.axis.y, spin.axis.z],
    spinSpeed: spin.speed,
  } satisfies ViewPose
}

export function applyViewPose(
  camera: THREE.PerspectiveCamera,
  controls: TrackballControls,
  pose: ViewPose,
  spin: SpinState,
) {
  const tb = trackballInertia(controls)
  const radius = camera.position.distanceTo(controls.target) || 1
  _direction.fromArray(pose.direction).normalize()
  _up.fromArray(pose.up).normalize()
  camera.position.copy(controls.target).addScaledVector(_direction, radius)
  camera.up.copy(_up)
  camera.lookAt(controls.target)
  tb.eye.subVectors(camera.position, controls.target)
  tb.lastPosition.copy(camera.position)

  tb.resetAngle()
  if (pose.spinAxis[0] !== 0 || pose.spinAxis[1] !== 0 || pose.spinAxis[2] !== 0) {
    spin.axis.fromArray(pose.spinAxis).normalize()
  }
  if (Number.isFinite(pose.spinSpeed)) {
    spin.speed = Math.max(0, pose.spinSpeed)
  }
}

export function captureFlickIntoSpin(controls: TrackballControls, spin: SpinState, dt: number) {
  const tb = trackballInertia(controls)
  if (tb.lastAxis.lengthSq() > 1e-8) {
    spin.axis.copy(tb.lastAxis).normalize()
  }

  const frameDt = Math.max(dt, 1 / 120)
  if (Math.abs(tb.lastAngle) > 1e-6) {
    spin.speed = Math.abs(tb.lastAngle) / frameDt
  }
  tb.resetAngle()
}

export function applySpinStep(
  camera: THREE.PerspectiveCamera,
  controls: TrackballControls,
  spin: SpinState,
  dt: number,
) {
  const blend = 1 - Math.exp(-SPIN_SPEED_BLEND * dt)
  spin.speed += (TARGET_SPIN_RAD_PER_SEC - spin.speed) * blend

  const angle = spin.speed * dt
  if (Math.abs(angle) < 1e-8) return

  _offset.copy(camera.position).sub(controls.target)
  _offset.applyAxisAngle(spin.axis, angle)
  camera.position.copy(controls.target).add(_offset)
  camera.up.applyAxisAngle(spin.axis, angle)
  camera.lookAt(controls.target)

  const tb = trackballInertia(controls)
  tb.eye.subVectors(camera.position, controls.target)
  tb.lastPosition.copy(camera.position)
}
