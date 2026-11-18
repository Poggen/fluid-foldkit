import { Schema } from 'effect'
import type { ResolvedValues } from 'motion-dom'
import type { MotionTargetProperties } from './motion-contract.js'

export const initialValues: (options: MotionTargetProperties) => ResolvedValues =
  function initialValues(options: MotionTargetProperties) {
    const target = options.initial === false ? options.animate : options.initial
    const values: ResolvedValues = {}

    if (target === undefined) {
      return values
    }

    const entries: Array<[string, unknown]> = Object.entries(target)

    for (const [key, raw] of entries) {
      if (key === 'transition' || key === 'transitionEnd') {
        continue
      }

      const value: unknown = Array.isArray(raw)
        ? raw[options.initial === false ? raw.length - 1 : 0]
        : raw

      if (isInitialValue(value)) {
        values[key] = value
      }
    }

    return { ...values, ...target.transitionEnd }
  }

const isInitialValue = Schema.is(Schema.Union([Schema.String, Schema.Number]))
