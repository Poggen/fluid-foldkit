import { Effect, Queue, Stream } from 'effect'
import { SidebarSceneBlock as Root } from './sidebar-scene-definition'
export const ObserveScene = Root.makeMountStream('ObserveScene', {
  messages: [Root.Message.Observed],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.Observed.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    let visible = false
                    const measure = () => {
                      const frame = element.getBoundingClientRect(),
                        xs: Array<number> = []
                      element
                        .querySelectorAll(
                          '[data-guide] svg, [data-guide-img], [data-sidebar="menu-action"] svg, [data-guide-rows] [data-sidebar="menu-button"] svg, [data-guide-rows] [data-sidebar="menu-button"] .size-2',
                        )
                        .forEach((node) => {
                          const box = node.getBoundingClientRect(),
                            center = box.left + box.width / 2 - frame.left
                          if (box.width > 0) xs.push(center - 12, center + 12)
                        })
                      const axes = xs
                        .sort((a, b) => a - b)
                        .filter((x, i, all) => i === 0 || x - (all[i - 1] ?? x) > 2)
                      Queue.offerUnsafe(queue, Root.Message.Observed({ visible, axes }))
                    }
                    const resize = new ResizeObserver(measure),
                      intersection = new IntersectionObserver(
                        (entries) => {
                          visible = (entries[0]?.intersectionRatio ?? 0) >= 0.5
                          measure()
                        },
                        { threshold: [0, 0.5, 1] },
                      )
                    resize.observe(element)
                    intersection.observe(element)
                    measure()
                    return () => {
                      resize.disconnect()
                      intersection.disconnect()
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})
