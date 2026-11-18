import type { LiveRow } from './definition'
import { FRAME_MS } from './head-ease'

import { niceDomain, pickStep, rollEase } from './live-frame'
import type { Frame, FrameState, LiveSample, RollClock, RollY, StepPick } from './live-frame'
import { detectMomentum } from './momentum'

const sampleValue: (sample: LiveSample & Record<string, unknown>, key: string) => number =
  function sampleValue(sample: LiveSample & Record<string, unknown>, key: string) {
    const raw = sample[key]

    return typeof raw === 'number' ? raw : sample.value
  }

const targetRange: (values: ReadonlyArray<number>, exaggerate: boolean) => Domain =
  function targetRange(values: ReadonlyArray<number>, exaggerate: boolean) {
    if (values.length === 0) {
      return [0, 100]
    }

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (const v of values) {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }

    const raw = max - min
    const pad = raw * (exaggerate ? 0.03 : 0.15) || (exaggerate ? 0.04 : 10)

    return [min - pad, max + pad]
  }

const buildRows: (
  real: ReadonlyArray<LiveSample>,
  key: string,
  slots: number,
  interval: number,
) => Array<LiveRow> = function buildRows(
  real: ReadonlyArray<LiveSample>,
  key: string,
  slots: number,
  interval: number,
) {
  const rows: Array<LiveRow> = []
  const head = real.at(0)
  const first = head?.time ?? 0
  const firstCandidate = head === undefined ? 0 : sampleValue(head, key)
  const firstValue = Number.isFinite(firstCandidate) ? firstCandidate : 0

  for (let k = slots - real.length; k > 0; k -= 1) {
    rows.push({ key: `p${k}`, t: (first - k * interval) * 1000, v: firstValue, pad: true })
  }

  let carried = firstValue

  for (const p of real) {
    const v = sampleValue(p, key)
    carried = Number.isFinite(v) ? v : carried
    rows.push({ key: `t${Math.round(p.time * 1000)}`, t: p.time * 1000, v: carried, pad: false })
  }

  return rows
}

const stampTip: (
  st: FrameState,
  seed: boolean,
  newestKey: string,
  rollMs: number,
  wallNow: number,
) => number = function stampTip(
  st: FrameState,
  seed: boolean,
  newestKey: string,
  rollMs: number,
  wallNow: number,
) {
  if (seed || st.tipAt === null || newestKey !== st.newest) {
    st.tipAt = wallNow + (seed ? 0 : rollMs)
  }

  return st.tipAt
}

const advanceDisplay: (
  st: FrameState,
  newestKey: string,
  value: number,
  lerpSpeed: number,
  now: number,
) => void = function advanceDisplay(
  st: FrameState,
  newestKey: string,
  value: number,
  lerpSpeed: number,
  now: number,
) {
  const first = st.newest === null

  if (first) {
    st.disp = value
    st.arrival = value
  }

  if (!first && (newestKey !== st.newest || value !== st.target)) {
    st.disp =
      st.target +
      (st.disp - st.target) * (1 - lerpSpeed) ** (Math.min(now - st.dispStamp, 4000) / FRAME_MS)

    if (newestKey !== st.newest) {
      st.arrival = st.disp
      st.parity = st.parity === 0 ? 1 : 0
    }
  }

  st.newest = newestKey
  st.target = value
  st.dispStamp = now
}

const easedDomain: (seeding: boolean, prev: Domain | null, target: Domain, f: number) => Domain =
  function easedDomain(seeding: boolean, prev: Domain | null, target: Domain, f: number) {
    const [tLo, tHi] = target

    if (seeding) {
      return [Math.min(0, tLo), Math.max(100, tHi)]
    }

    if (!prev) {
      return [tLo, tHi]
    }

    return [
      tLo < prev[0] ? tLo : prev[0] + (tLo - prev[0]) * f,
      tHi > prev[1] ? tHi : prev[1] + (tHi - prev[1]) * f,
    ]
  }

const easeY: (
  st: FrameState,
  seeding: boolean,
  target: Domain,
  lerpSpeed: number,
  now: number,
  displayFrameMs: number,
) => YStep = function easeY(
  st: FrameState,
  seeding: boolean,
  target: Domain,
  lerpSpeed: number,
  now: number,
  displayFrameMs: number,
) {
  const f = 1 - (1 - lerpSpeed) ** (Math.min(now - st.stamp, 2000) / displayFrameMs)
  const prev = st.y
  const eased = easedDomain(seeding, prev, target, f)
  st.stamp = now

  if (!seeding) {
    st.y = eased
  }

  return { prev, eased, y: niceDomain(eased) }
}

const drawnJumped: (st: FrameState, step: YStep, target: Domain, ppu: number) => boolean =
  function drawnJumped(st: FrameState, step: YStep, target: Domain, ppu: number) {
    const { prev, eased, y } = step
    const { drawn } = st

    if (prev === null || drawn === null) {
      return false
    }

    return ([0, 1] satisfies readonly [0, 1]).some((i) => {
      const edge = i === 0 ? target[0] < prev[0] : target[1] > prev[1]
      const moved = y[i] - drawn[i]

      return moved !== 0 && Math.abs(edge ? moved : moved - (eased[i] - prev[i])) * ppu > JUMP_PX
    })
  }

const rollingRy: (
  st: FrameState,
  y: Domain,
  intro: boolean,
  top: number,
  innerHeight: number,
) => RollY = function rollingRy(
  st: FrameState,
  y: Domain,
  intro: boolean,
  top: number,
  innerHeight: number,
) {
  const a = st.drawn

  if (!a || st.jump || intro) {
    return { s: 1, t: 0 }
  }

  const span = a[1] - a[0] || 1
  const s = (y[1] - y[0]) / span

  return { s, t: top * (1 - s) + (innerHeight * (a[1] - y[1])) / span }
}

const settleFloor: (st: FrameState, floorRef: Domain) => number = function settleFloor(
  st: FrameState,
  floorRef: Domain,
) {
  const floorSpan = floorRef[1] - floorRef[0]

  if (st.floor === null || floorRef[0] < st.floor || floorRef[0] - st.floor > 2 * floorSpan) {
    st.floor = floorRef[0] - 0.3 * floorSpan
  }

  return st.floor
}

const tailRatio: (
  dyPx: number,
  value: number,
  floor: number,
  y: Domain,
  innerHeight: number,
) => number = function tailRatio(
  dyPx: number,
  value: number,
  floor: number,
  y: Domain,
  innerHeight: number,
) {
  const rest = ((value - floor) * innerHeight) / (y[1] - y[0] || 1)

  return dyPx > 0 && rest - dyPx > 1 ? rest / (rest - dyPx) : 1
}

const introStart: (st: FrameState, y: Domain, top: number, innerHeight: number) => RollY =
  function introStart(st: FrameState, y: Domain, top: number, innerHeight: number) {
    const seedY = st.seedY ?? y
    const s = (y[1] - y[0]) / (seedY[1] - seedY[0] || 1)

    return { s, t: top * (1 - s) + (innerHeight * (seedY[1] - y[1])) / (seedY[1] - seedY[0] || 1) }
  }

const nextRoll: (st: FrameState, p: RollPlan) => RollClock = function nextRoll(
  st: FrameState,
  p: RollPlan,
) {
  const shift = st.x0 === null ? 0 : (p.xDomain[0] - st.x0) * p.pxPerMs
  const at = p.timelineNow
  const r = st.roll
  const e = rollEase(r, at)

  const left =
    r && !st.jump
      ? { x: r.x * (1 - e), s: 1 + (r.s - 1) * (1 - e), t: r.t * (1 - e) }
      : { x: 0, s: 1, t: 0 }

  let plan = p.intro ? p.introY : st.ry

  if (st.jump) {
    plan = { s: 1, t: 0 }
  }

  return {
    x: left.x + shift,
    s: left.s * plan.s,
    t: left.s * plan.t + left.t,
    dur: p.rollMs,
    ease: p.intro ? { kind: 'intro', lerp: p.lerpSpeed, durationMs: p.rollMs } : { kind: 'linear' },
    at: null,
  }
}

const tailSplit: (
  newestT: number,
  prevT: number,
  tipT: number,
  pxPerMs: number,
  rollX: number,
) => TailSplit = function tailSplit(
  newestT: number,
  prevT: number,
  tipT: number,
  pxPerMs: number,
  rollX: number,
) {
  const aw = (newestT - prevT) * pxPerMs
  const bw = (tipT - newestT) * pxPerMs
  const b0 = bw > 0.5 ? Math.min(1, Math.max(0, (bw - rollX) / bw)) : 0
  const ak = aw > 0.5 ? Math.max(0, ((tipT - prevT) * pxPerMs - b0 * bw - rollX) / aw) : 1

  return { ak, b0 }
}

const buildFrame: (a: TickArgs, st: FrameState, yPick: StepPick) => Frame = function buildFrame(
  a: TickArgs,
  st: FrameState,
  yPick: StepPick,
) {
  const {
    data,
    value,
    dataKey: key,
    top,
    innerHeight,
    pxPerMs,
    plotRight,
    rollEdge,
    lerpSpeed,
    introRun,
  } = a

  if (st.slots === 0 || st.windowSecs !== a.windowSecs) {
    st.interval = a.stepSecs
    st.slots = Math.ceil(a.windowSecs / st.interval) + OVERSCAN_ROWS
    st.windowSecs = a.windowSecs
  }

  const { interval } = st

  const seed = !introRun && st.y === null
  const real = (seed ? data.slice(0, -1) : data).slice(-st.slots)
  const rows = buildRows(real, key, st.slots, interval)

  const newestT = (real.at(-1)?.time ?? 0) * 1000
  const rollMs = Math.min(MAX_ROLL_MS, Math.max(MIN_ROLL_MS, interval * 1000))
  const newestKey = rows.at(-1)?.key ?? ''
  const tipT = stampTip(st, seed, newestKey, rollMs, a.wallNow)
  const xEnd = tipT - 2 * interval * 1000
  const xDomain: Domain = [xEnd - a.plotWidth / pxPerMs, xEnd - (plotRight - rollEdge) / pxPerMs]

  const prevT = (real.at(-2)?.time ?? real.at(-1)?.time ?? 0) * 1000
  const xa = plotRight - (xEnd - prevT) * pxPerMs

  const target = targetRange(
    [...data.map((p) => sampleValue(p, key)), value].filter(Number.isFinite),
    a.exaggerate,
  )

  const now = a.now
  const fresh = newestKey !== st.newest
  advanceDisplay(st, newestKey, value, lerpSpeed, now)

  if (introRun && st.introIdentity === null) {
    st.introIdentity = a.dataIdentity
  }

  const intro = introRun && st.introIdentity === a.dataIdentity
  const step = easeY(st, seed, target, lerpSpeed, now, a.displayFrameMs)
  const { y } = step

  if (fresh && !seed) {
    st.jump =
      xa < rollEdge - 0.05 || drawnJumped(st, step, target, innerHeight / (y[1] - y[0] || 1))
    st.ry = rollingRy(st, y, intro, top, innerHeight)
  }

  if (seed) {
    st.seedY = y
  } else {
    st.drawn = y
  }

  const floor = settleFloor(st, seed ? target : y)
  const dyPx = ((value - st.arrival) * innerHeight) / (y[1] - y[0] || 1)
  const kRatio = tailRatio(dyPx, value, floor, y, innerHeight)

  if (fresh && !seed) {
    st.roll = nextRoll(st, {
      xDomain,
      pxPerMs,
      now,
      timelineNow: a.timelineNow,
      intro,
      introY: introStart(st, y, top, innerHeight),
      lerpSpeed,
      rollMs,
    })
  }

  st.x0 = xDomain[0]
  const c = !seed && st.roll ? st.roll : { x: 0, s: 1, t: 0 }
  const tipY = top + ((y[1] - value) * innerHeight) / (y[1] - y[0] || 1)
  const { ak, b0 } = tailSplit(newestT, prevT, tipT, pxPerMs, c.x)

  const out: Frame = {
    rows,
    xDomain,
    yDomain: y,
    areaFloor: floor,
    tip: { t: tipT, v: value },

    momentum: detectMomentum([...real, { [key]: value }, { [key]: value }], key),
    rollMs,
    seed,
    intro,
    disp0: st.arrival,
    parity: st.parity,
    roll: { x: c.x, s: c.s, t: c.t, d: (c.s - 1) * tipY + c.t, ak, xa, b0 },
    jump: st.jump,
    dy: dyPx,
    k: kRatio,
    yTarget: target,

    interval:
      yPick.raw === null ? pickStep(yPick, [0, 100], innerHeight, a.minGap) : yPick.interval,
  }

  st.last = out

  return out
}

export const initialLiveState: () => FrameState = function initialLiveState() {
  return {
    slots: 0,
    interval: 1,
    windowSecs: 0,
    y: null,
    floor: null,
    stamp: 0,
    introIdentity: null,
    last: null,
    drawn: null,
    jump: false,
    ry: { s: 1, t: 0 },
    x0: null,
    roll: null,
    seedY: null,
    newest: null,
    disp: 0,
    target: 0,
    dispStamp: 0,
    arrival: 0,
    parity: 0,
    tipAt: null,
  }
}

const OVERSCAN_ROWS = 4

const JUMP_PX = 2

const MIN_ROLL_MS = 120

const MAX_ROLL_MS = 2000

type Domain = [number, number]

export interface LiveFrameArgs {
  readonly dataIdentity: string
  readonly width: number
  readonly data: ReadonlyArray<LiveSample & Readonly<Record<string, unknown>>>
  readonly value: number
  readonly dataKey: string
  readonly top: number
  readonly windowSecs: number
  readonly exaggerate: boolean
  readonly lerpSpeed: number
  readonly paused: boolean
  readonly pxPerMs: number
  readonly plotWidth: number
  readonly stepSecs: number
  readonly innerHeight: number
  readonly minGap: number
  readonly plotRight: number
  readonly rollEdge: number
}

interface TickArgs extends LiveFrameArgs {
  readonly now: number
  readonly wallNow: number
  readonly timelineNow: number
  readonly displayFrameMs: number
  readonly introRun: boolean
}

interface YStep {
  readonly prev: Domain | null
  readonly eased: Domain
  readonly y: Domain
}

interface RollPlan {
  readonly xDomain: Domain
  readonly pxPerMs: number
  readonly now: number
  readonly timelineNow: number
  readonly intro: boolean
  readonly introY: RollY
  readonly lerpSpeed: number
  readonly rollMs: number
}

interface TailSplit {
  readonly ak: number
  readonly b0: number
}

export function planLiveFrame(args: TickArgs, previous: FrameState, previousPick: StepPick) {
  const state = {
    ...previous,
    ry: { ...previous.ry },
    roll: previous.roll === null ? null : { ...previous.roll },
    y: previous.y === null ? null : ([previous.y[0], previous.y[1]] satisfies [number, number]),
  }

  const pick = {
    ...previousPick,
    raw:
      previousPick.raw === null
        ? null
        : ([previousPick.raw[0], previousPick.raw[1]] satisfies [number, number]),
  }

  const frame =
    args.width === 0 || args.data.length === 0
      ? null
      : args.paused && state.last !== null
        ? state.last
        : buildFrame(args, state, pick)

  return { frame, state, pick }
}
