import { DateTime } from 'effect'

export const homepageCdnHeaders: (
  request: Request,
  startedAt: number,
  finishedAt: number,
) => Readonly<Record<string, string>> = (
  request: Request,
  startedAt: number,
  finishedAt: number,
) => {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.pathname !== '/' || url.search || url.hash) return {}
  const utc = DateTime.makeUnsafe(startedAt)
  const local = DateTime.setZone(utc, DateTime.zoneMakeLocal())

  const expiresAt = Math.min(
    startedAt + 60_000,
    DateTime.toEpochMillis(DateTime.endOf(utc, 'day')) + 1,
    DateTime.toEpochMillis(DateTime.endOf(local, 'day')) + 1,
  )
  const seconds = Math.floor((expiresAt - finishedAt) / 1000)
  return seconds > 0 ? { 'vercel-cdn-cache-control': `public, s-maxage=${seconds}` } : {}
}
