import { useCallback, useContext, useEffect } from "react"
import { dndContext, OngoingDrag } from "./context"
import type { DragType } from "./dragType"
import { Point, pointInsideRectangle } from "./geometry"
import { useConstant, useLatest } from "./util"
import { ObservableValue } from "./value"

export function useDrop(dropOptions?: {
  accept?: DragType<unknown>
  onDrop?: (drag: OngoingDrag, point: Point) => void
  onItemEntered?: (drag: OngoingDrag) => void
  onItemLeft?: (drag: OngoingDrag) => void
  onDragMoveOver?: (drag: OngoingDrag, point: Point) => void
}) {
  const context = useContext(dndContext)
  const options = useLatest(dropOptions)

  const controller = useConstant(() => {
    const ongoingDrag = new ObservableValue<OngoingDrag | undefined>(undefined)
    const isDraggingOver = new ObservableValue(false)

    isDraggingOver.onChange.subscribe((inside) => {
      if (ongoingDrag.current) {
        if (inside) {
          options.current?.onItemEntered?.(ongoingDrag.current)
          ongoingDrag.current.enteredDropZone.fire()
        } else {
          options.current?.onItemLeft?.(ongoingDrag.current)
          ongoingDrag.current.leftDropZone.fire()
        }
      }
    })

    return {
      element: new ObservableValue<HTMLElement | null>(null),
      position: new ObservableValue<DOMRect | undefined>(undefined),
      ongoingDrag,
      isDraggingOver,
      updatePosition() {
        controller.position.set(
          controller.element.current?.getBoundingClientRect(),
        )
        return controller.position.current
      },
    }
  })

  const refCallback = useCallback((e: HTMLElement | null) => {
    controller.element.set(e)
  }, [])

  useEffect(() => {
    return context.dragStart.subscribe((drag) => {
      if (options.current?.accept) {
        if (!OngoingDrag.getData(drag, options.current.accept)) return
      }
      controller.ongoingDrag.set(drag)
      const position = controller.updatePosition()

      if (position !== undefined) {
        const startedInside = pointInsideRectangle(position, drag.startPoint)
        setTimeout(() => {
          controller.isDraggingOver.set(startedInside)
        })

        drag.dragMove.subscribe(({ point }) => {
          const inside = pointInsideRectangle(position, point)
          controller.isDraggingOver.set(inside)
          if (inside) {
            options.current?.onDragMoveOver?.(drag, point)
          }
        })

        drag.dragEnd.subscribe(({ point }) => {
          controller.ongoingDrag.set(undefined)
          const inside = pointInsideRectangle(position, point)
          controller.isDraggingOver.set(inside)

          if (inside) {
            options.current?.onDrop?.(drag, point)
            drag.droppedInDropZone.fire()
          }

          controller.isDraggingOver.set(false)
        })
      }
    })
  }, [])

  const props = {
    ref: refCallback,
  }
  // typecheck
  const _p: React.HTMLProps<HTMLElement> = props

  return {
    isDraggingOver: controller.isDraggingOver,
    ongoingDrag: controller.ongoingDrag,
    element: controller.element,
    position: controller.position,
    props,
  }
}
