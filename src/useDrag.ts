import { useContext } from "react"
import { dndContext, OngoingDrag } from "./context"
import type { DragType } from "./dragType"
import { getBoundingClientRectIgnoringTransforms, Point } from "./geometry"
import { useConstant, useLatest } from "./util"
import { ObservableValue } from "./value"

function getPoint(event: { clientX: number; clientY: number }): Point {
  return {
    x: event.clientX,
    y: event.clientY,
  }
}

function getTouch(touchList: TouchList, identifier: number) {
  for (let i = 0; i < touchList.length; i++) {
    const touch = touchList.item(i)
    if (touch!.identifier === identifier) return touch!
  }
}

function getPointerOffset(element: HTMLElement, startPoint: Point) {
  const rect = getBoundingClientRectIgnoringTransforms(element)
  return Point.diff(startPoint, rect)
}

export function useDrag<T>(dragOptions?: {
  item?: { item: T; type: DragType<T> }
  onDragStart?: (drag: OngoingDrag, point: Point) => void
  onDragMove?: (drag: OngoingDrag, point: Point) => void
  onDragEnd?: (drag: OngoingDrag, point: Point) => void
  onDragDropped?: (drag: OngoingDrag) => void
  onDragCancel?: (drag: OngoingDrag, point: Point) => void
}) {
  const context = useContext(dndContext)
  const options = useLatest(dragOptions)

  const controller = useConstant(() => {
    const ongoingDrag = new ObservableValue<OngoingDrag | undefined>(undefined)
    const isDragging = new ObservableValue(false)
    ongoingDrag.onChange.subscribe((drag) => isDragging.set(drag !== undefined))

    function createDragController(ongoingDrag: OngoingDrag) {
      return {
        start(point: Point) {
          ongoingDrag.enteredDropZone.subscribe(() => {
            controller.inDropZone.set(true)
          })
          ongoingDrag.leftDropZone.subscribe(() => {
            controller.inDropZone.set(false)
          })
          ongoingDrag.droppedInDropZone.subscribe(() => {
            options.current?.onDragDropped?.(ongoingDrag)
          })

          if (options.current?.item) {
            OngoingDrag.setData(
              ongoingDrag,
              options.current.item.type,
              options.current.item.item,
            )
          }
          controller.ongoingDrag.set(ongoingDrag)
          options.current?.onDragStart?.(ongoingDrag, point)
          context.dragStart.fire(ongoingDrag)
        },

        move(point: Point, event: PointerEvent | TouchEvent) {
          ongoingDrag.lastPoint.set(point)
          options.current?.onDragMove?.(ongoingDrag, point)
          ongoingDrag.dragMove.fire({ event, point })
        },

        end(point: Point, event: PointerEvent | TouchEvent) {
          controller.ongoingDrag.set(undefined)
          controller.inDropZone.set(false)

          options.current?.onDragEnd?.(ongoingDrag, point)
          ongoingDrag.dragEnd.fire({ event: event, point })
        },

        cancel(point: Point, event: PointerEvent | TouchEvent) {
          controller.ongoingDrag.set(undefined)
          controller.inDropZone.set(false)

          options.current?.onDragCancel?.(ongoingDrag, point)
          ongoingDrag.dragCancel.fire({ event: event, point })
        },
      }
    }

    return {
      isMounted: true,
      ongoingDrag,
      isDragging,
      inDropZone: new ObservableValue(false),

      onPointerDown(startEvent: React.PointerEvent<HTMLElement>) {
        // Only react to the primary mouse button
        if (startEvent.buttons !== 1) return
        const pointerId = startEvent.pointerId

        if (startEvent.currentTarget.hasPointerCapture(pointerId)) {
          // Touch devices does an implicit pointer capture on the
          // touched elements which breaks when it's then moved into a
          // portal. Instead we track then using touch events.
          return
        }

        startEvent.preventDefault()
        startEvent.stopPropagation()

        // Set pointer capture to the body to avoid other elements
        // reacting to hover or changing the cursor during the drag
        if (!document.body.hasPointerCapture(pointerId)) {
          document.body.setPointerCapture(pointerId)
        }
        // Use an animation for setting the cursor to grabbing as it is
        // a really nice way to temporarily set a style that overrides
        // everything else and goes back to the correct value on cancel
        const bodyCursor = document.body.animate([{ cursor: "grabbing" }], {
          duration: 0,
          fill: "both",
        })

        const startPoint = getPoint(startEvent)

        const dragController = createDragController(
          OngoingDrag.create({
            startPoint,
            pointerOffset: getPointerOffset(
              startEvent.currentTarget,
              startPoint,
            ),
          }),
        )

        function moveListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return

          dragController.move(getPoint(event), event)
        }
        function upListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return

          removeEvents()
          dragController.end(getPoint(event), event)
        }
        function cancelListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return

          removeEvents()
          dragController.cancel(getPoint(event), event)
        }
        function removeEvents() {
          document.body.removeEventListener("pointermove", moveListener)
          document.body.removeEventListener("pointerup", upListener)
          document.body.removeEventListener("pointercancel", cancelListener)

          bodyCursor.cancel()
        }
        document.body.addEventListener("pointermove", moveListener)
        document.body.addEventListener("pointerup", upListener)
        document.body.addEventListener("pointercancel", cancelListener)

        dragController.start(startPoint)
      },
      onTouchStart(startEvent: React.TouchEvent<HTMLElement>) {
        const element = startEvent.currentTarget
        const touchId = startEvent.changedTouches[0].identifier

        const startPoint = getPoint(startEvent.changedTouches[0])

        const dragController = createDragController(
          OngoingDrag.create({
            startPoint,
            pointerOffset: getPointerOffset(element, startPoint),
          }),
        )

        function moveListener(event: TouchEvent) {
          const touch = getTouch(event.changedTouches, touchId)
          if (touch === undefined) return

          dragController.move(getPoint(touch), event)
        }
        function upListener(event: TouchEvent) {
          const touch = getTouch(event.changedTouches, touchId)
          if (touch === undefined) return

          removeEvents()
          dragController.end(getPoint(touch), event)
        }
        function cancelListener(event: TouchEvent) {
          const touch = getTouch(event.changedTouches, touchId)
          if (touch === undefined) return

          removeEvents()
          dragController.cancel(getPoint(touch), event)
        }
        function removeEvents() {
          element.removeEventListener("touchmove", moveListener)
          element.removeEventListener("touchend", upListener)
          element.removeEventListener("touchcancel", cancelListener)
        }
        element.addEventListener("touchmove", moveListener)
        element.addEventListener("touchend", upListener)
        element.addEventListener("touchcancel", cancelListener)

        dragController.start(startPoint)
      },
    }
  })

  const props = {
    onPointerDown: controller.onPointerDown,
    onTouchStart: controller.onTouchStart,
    style: {
      cursor: "grab",
      touchAction: "none",
    } as const,
  }
  // typecheck
  const _p: React.HTMLProps<HTMLElement> = props

  return {
    ongoingDrag: controller.ongoingDrag,
    isDragging: controller.isDragging,
    inDropZone: controller.inDropZone,
    props,
  }
}
