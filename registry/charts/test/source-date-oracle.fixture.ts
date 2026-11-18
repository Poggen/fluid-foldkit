import { Script } from 'node:vm'
import { Predicate } from 'effect'

const originalExpression = new Script('value instanceof Date ? value : new Date(value)')

export const sourceDateOracle: (value: unknown) => Date = (value: unknown) => {
  const result: unknown = originalExpression.runInNewContext({ value, Date: globalThis.Date })
  if (!Predicate.isDate(result)) throw new TypeError('Source Date expression returned a non-Date')
  return result
}

export const foreignDate: () => unknown = () =>
  new Script(`
  const value = new Date(1234);
  value.getTime = () => { throw new Error('must not call foreign getTime'); };
  Object.defineProperty(value, Symbol.toPrimitive, {
    value: () => { throw new Error('must not coerce foreign Date'); },
  });
  value;
`).runInNewContext()
