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
        startEvent.preventDefault()
        const startPoint = { x: startEvent.clientX, y: startEvent.clientY }

        const rect = getBoundingClientRectIgnoringTransforms(
          startEvent.currentTarget as HTMLElement,
        )

        const ongoingDrag = OngoingDrag.create({
          element: startEvent.currentTarget,
          startPoint,
          pointerOffset: Point.diff(startPoint, rect),
        })

        controller.ongoingDrag.set(ongoingDrag)

        function moveListener(event: PointerEvent) {
          const point = { x: event.clientX, y: event.clientY }

          ongoingDrag.lastPoint.set(point)
          options.current?.onDragMove?.(ongoingDrag, point)
          ongoingDrag.dragMove.fire({ event, point })
        }
        function stopDrag() {
          window.removeEventListener("pointermove", moveListener)
          window.removeEventListener("pointerup", upListener)
          window.removeEventListener("pointercancel", cancelListener)

          controller.ongoingDrag.set(undefined)
          controller.inDropZone.set(false)
        }
        function upListener(event: PointerEvent) {
          stopDrag()

          const point = { x: event.clientX, y: event.clientY }

          options.current?.onDragEnd?.(ongoingDrag, point)
          ongoingDrag.dragEnd.fire({ event: event, point })
        }
        function cancelListener(event: PointerEvent) {
          stopDrag()

          const point = { x: event.clientX, y: event.clientY }

          options.current?.onDragCancel?.(ongoingDrag, point)
          ongoingDrag.dragCancel.fire({ event: event, point })
        }
        window.addEventListener("pointermove", moveListener)
        window.addEventListener("pointerup", upListener)
        window.addEventListener("pointercancel", cancelListener)

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
