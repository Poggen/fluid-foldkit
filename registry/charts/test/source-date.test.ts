import { Script } from 'node:vm'
import { Predicate } from 'effect'
import { expect, it } from 'vitest'
import { sourceDate } from '../src/cartesian/source-date'

const originalExpression = new Script('value instanceof Date ? value : new Date(value)')

const sourceOracle = (value: unknown): Date => {
  const result: unknown = originalExpression.runInNewContext({ value, Date: globalThis.Date })

  if (!Predicate.isDate(result)) {
    throw new TypeError('Source Date expression returned a non-Date')
  }

  return result
}

const cases: ReadonlyArray<{
  readonly label: string
  readonly input: unknown
  readonly time: number
}> = [
  { label: 'undefined supplied as one argument', input: undefined, time: Number.NaN },
  { label: 'null', input: null, time: 0 },
  { label: 'false', input: false, time: 0 },
  { label: 'true', input: true, time: 1 },
  { label: 'ISO string', input: '1970-01-01T00:00:01.234Z', time: 1234 },
  { label: 'invalid string', input: 'not-a-date', time: Number.NaN },
  { label: 'NaN', input: Number.NaN, time: Number.NaN },
  { label: 'positive infinity', input: Infinity, time: Number.NaN },
  { label: 'negative infinity', input: -Infinity, time: Number.NaN },
  { label: 'positive TimeClip overflow', input: 8_640_000_000_000_001, time: Number.NaN },
  { label: 'negative TimeClip overflow', input: -8_640_000_000_000_001, time: Number.NaN },
  { label: 'TimeClip maximum', input: 8_640_000_000_000_000, time: 8_640_000_000_000_000 },
  { label: 'positive fractional milliseconds', input: 1.9, time: 1 },
  { label: 'negative fractional milliseconds', input: -1.9, time: -1 },
  { label: 'empty array', input: [], time: Number.NaN },
  { label: 'single ISO array', input: ['1970-01-01T00:00:01.234Z'], time: 1234 },
  { label: 'invalid multiple array', input: ['not', 'a-date'], time: Number.NaN },
]

it.each(cases)('preserves Source native coercion: $label', ({ input, time }) => {
  expect(sourceOracle(input).getTime()).toBe(time)
  expect(sourceDate(input).getTime()).toBe(time)
})

it('uses the native default hint once, without String or Number preprocessing', () => {
  const hints: Array<string> = []

  const input = {
    [Symbol.toPrimitive](hint: string) {
      hints.push(hint)

      return hint === 'default' ? 1234 : 'not-the-default-conversion'
    },
  }

  expect(sourceOracle(input).getTime()).toBe(1234)
  expect(hints).toEqual(['default'])
  hints.length = 0
  expect(sourceDate(input).getTime()).toBe(1234)
  expect(hints).toEqual(['default'])
})

it('retains a same-realm Date and its overridden getTime without construction or eager reads', () => {
  const input = sourceDate(1234)
  let reads = 0
  input.getTime = () => {
    reads += 1

    return 9876
  }

  expect(sourceOracle(input)).toBe(input)
  expect(sourceDate(input)).toBe(input)
  expect(reads).toBe(0)
  expect(sourceDate(input).getTime()).toBe(9876)
  expect(reads).toBe(1)
})

it('copies the genuine cross-realm Date internal time without invoking its overridden hooks', () => {
  const foreign: unknown = new Script(`
    const value = new Date(1234);
    value.getTime = () => { throw new Error('must not call foreign getTime'); };
    Object.defineProperty(value, Symbol.toPrimitive, {
      value: () => { throw new Error('must not coerce foreign Date'); },
    });
    value;
  `).runInNewContext()

  expect(Predicate.isDate(foreign)).toBe(false)
  expect(sourceOracle(foreign).getTime()).toBe(1234)
  const result = sourceDate(foreign)
  expect(result === foreign).toBe(false)
  expect(result.getTime()).toBe(1234)
})

it('propagates the original conversion exception without fallback', () => {
  const failure = new Error('conversion failed')

  const input = {
    [Symbol.toPrimitive]() {
      throw failure
    },
  }

  expect(() => sourceOracle(input)).toThrow(failure)
  expect(() => sourceDate(input)).toThrow(failure)
})

it.each([1n, Symbol('date')])(
  'preserves native TypeError for unsupported primitive %s',
  (input) => {
    expect(() => sourceOracle(input)).toThrow(TypeError)
    expect(() => sourceDate(input)).toThrow(TypeError)
  },
)
