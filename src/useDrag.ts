import { useContext } from "react"
import { dndContext, OngoingDrag } from "./context"
import { getBoundingClientRectIgnoringTransforms, Point } from "./geometry"
import { useConstant, useLatest } from "./util"
import { ObservableValue } from "./value"

export function useDrag(dragOptions?: {
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

    return {
      isMounted: true,
      ongoingDrag,
      isDragging,
      inDropZone: new ObservableValue(false),

      onPointerDown(startEvent: React.PointerEvent<HTMLElement>) {
        // Only react to the primary mouse button
        if (startEvent.buttons !== 1) return
        const pointerId = startEvent.pointerId
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

        const startPoint = {
          x: startEvent.clientX,
          y: startEvent.clientY,
        }

        const rect = getBoundingClientRectIgnoringTransforms(
          startEvent.currentTarget as HTMLElement,
        )

        const ongoingDrag = OngoingDrag.create({
          startPoint,
          pointerOffset: Point.diff(startPoint, rect),
        })

        controller.ongoingDrag.set(ongoingDrag)

        function moveListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return
          const point = {
            x: event.clientX,
            y: event.clientY,
          }

          ongoingDrag.lastPoint.set(point)
          options.current?.onDragMove?.(ongoingDrag, point)
          ongoingDrag.dragMove.fire({ event, point })
        }
        function stopDrag() {
          document.body.removeEventListener("pointermove", moveListener)
          document.body.removeEventListener("pointerup", upListener)
          document.body.removeEventListener("pointercancel", cancelListener)

          controller.ongoingDrag.set(undefined)
          controller.inDropZone.set(false)
          bodyCursor.cancel()
        }
        function upListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return
          stopDrag()

          const point = {
            x: event.clientX,
            y: event.clientY,
          }

          options.current?.onDragEnd?.(ongoingDrag, point)
          ongoingDrag.dragEnd.fire({ event: event, point })
        }
        function cancelListener(event: PointerEvent) {
          if (event.pointerId !== pointerId) return
          stopDrag()

          const point = {
            x: event.clientX,
            y: event.clientY,
          }

          options.current?.onDragCancel?.(ongoingDrag, point)
          ongoingDrag.dragCancel.fire({ event: event, point })
        }
        document.body.addEventListener("pointermove", moveListener)
        document.body.addEventListener("pointerup", upListener)
        document.body.addEventListener("pointercancel", cancelListener)

        ongoingDrag.enteredDropZone.subscribe(() => {
          controller.inDropZone.set(true)
        })
        ongoingDrag.leftDropZone.subscribe(() => {
          controller.inDropZone.set(false)
        })
        ongoingDrag.droppedInDropZone.subscribe(() => {
          options.current?.onDragDropped?.(ongoingDrag)
        })

        options.current?.onDragStart?.(ongoingDrag, startPoint)
        context.dragStart.fire(ongoingDrag)
      },
    }
  })

  const props = {
    onPointerDown: controller.onPointerDown,
    style: {
      cursor: "grab",
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
