import { DateTime } from 'effect'
import { expect, it } from 'vitest'
import { homepageCdnHeaders } from './homepage-cache-policy'

const request = (path: string, method = 'GET') =>
  new Request(new URL(path, 'https://example.com'), { method })
const noon = DateTime.makeUnsafe('2026-11-18T12:00:00Z')
const start = DateTime.toEpochMillis(noon)

it('only lets Vercel cache the successful default homepage render', () => {
  expect(homepageCdnHeaders(request('/'), start, start + 100)).toEqual({
    'vercel-cdn-cache-control': 'public, s-maxage=59',
  })
  for (const other of [
    request('/?accent=blue'),
    request('/?embed=1'),
    request('/components/card'),
    request('/missing'),
    request('/', 'POST'),
    request('/', 'HEAD'),
  ]) {
    expect(homepageCdnHeaders(other, start, start)).toEqual({})
  }
})

it('expires before either calendar day changes, including during SSR', () => {
  for (const date of [noon, DateTime.setZone(noon, DateTime.zoneMakeLocal())]) {
    const midnight = DateTime.toEpochMillis(DateTime.endOf(date, 'day')) + 1
    expect(homepageCdnHeaders(request('/'), midnight - 2500, midnight - 2000)).toEqual({
      'vercel-cdn-cache-control': 'public, s-maxage=2',
    })
    expect(homepageCdnHeaders(request('/'), midnight - 2500, midnight)).toEqual({})
  }
})
