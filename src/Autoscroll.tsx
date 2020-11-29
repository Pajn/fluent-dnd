import React, { createContext, useContext, useEffect, useRef } from "react"
import { useDndContext } from "./context"
import { useConstant } from "./util"
import { ObservableValue } from "./value"

export type AutoscrollContext = {
  isScrolling: ObservableValue<boolean>
}

const autoscrollContext = createContext<AutoscrollContext | undefined>(
  undefined,
)

export const useAutoscrollContext = () => useContext(autoscrollContext)

export type AutoscrollProps<
  C extends React.ComponentType<any> = React.ComponentType<
    JSX.IntrinsicElements["div"]
  >
> = {
  scrollSpeedModifier?: number
  scrollAreaMinHeight?: number
  scrollAreaRatio?: number

  component?: C
}

export const Autoscroll = <
  C extends React.ComponentType<any> = React.ComponentType<
    JSX.IntrinsicElements["div"]
  >
>(
  props: AutoscrollProps<C> &
    Omit<React.ComponentPropsWithRef<C>, keyof AutoscrollProps<any>>,
) => {
  const {
    scrollSpeedModifier = 0.5,
    scrollAreaMinHeight = 20,
    scrollAreaRatio = 0.1,

    component: Container = "div",
    ...otherProps
  } = props

  const ref = useRef<HTMLDivElement>(null)
  const dndContext = useDndContext()
  const context = useConstant(
    (): AutoscrollContext => ({
      isScrolling: new ObservableValue<boolean>(false),
    }),
  )

  useEffect(
    () =>
      dndContext.dragStart.subscribe((drag) => {
        if (!ref.current) return
        let element = ref.current
        let rect = element.getBoundingClientRect()

        let scrollSpeed = 0
        let isDragging = true
        let lastTime = 0
        let didScroll = false
        function updateScrollPosition(time: number) {
          const delta = time - lastTime
          lastTime = time
          if (scrollSpeed !== 0) {
            const pre = element.scrollTop
            element.scrollTop += scrollSpeed * delta * scrollSpeedModifier
            const post = element.scrollTop
            didScroll = didScroll || pre !== post
            context.isScrolling.set(didScroll)
          } else if (didScroll) {
            didScroll = false
            context.isScrolling.set(false)
            window.getComputedStyle(element)
          }

          if (isDragging) {
            requestAnimationFrame(updateScrollPosition)
          }
        }
        requestAnimationFrame(updateScrollPosition)

        drag.dragEnd.subscribe(() => {
          scrollSpeed = 0
          isDragging = false
        })

        drag.dragMove.subscribe(({ point }) => {
          if (element !== ref.current && ref.current) {
            element = ref.current
            rect = element.getBoundingClientRect()
          }

          const scrollAreaHeight = Math.max(
            rect.height * scrollAreaRatio,
            scrollAreaMinHeight,
          )
          const scrollUpEnd = rect.top + scrollAreaHeight
          const scrollDownStart = rect.bottom - scrollAreaHeight

          if (point.y <= scrollUpEnd) {
            const pointerYPos = Math.max(point.y, rect.top)
            scrollSpeed = -(
              (scrollAreaHeight - (pointerYPos - rect.top)) /
              scrollAreaHeight
            )
          } else if (point.y >= scrollDownStart) {
            const pointerYPos = Math.min(point.y, rect.bottom)
            scrollSpeed =
              (scrollAreaHeight - (rect.bottom - pointerYPos)) /
              scrollAreaHeight
          } else {
            scrollSpeed = 0
          }
        })
      }),
    [],
  )

  return (
    <autoscrollContext.Provider value={context}>
      <Container ref={ref} {...otherProps} />
    </autoscrollContext.Provider>
  )
}
