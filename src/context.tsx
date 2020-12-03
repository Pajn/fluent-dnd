import React, { createContext, ReactNode, useContext } from "react"
import type { DragType } from "./dragType"
import { EventController } from "./events"
import type { ElementSize, Point } from "./geometry"
import { useConstant } from "./util"
import { ObservableValue } from "./value"

export type DropState = {
  drag: OngoingDrag
  spacerSize: ElementSize
  pos: Point
}

export type DndContext = {
  dragStart: EventController<OngoingDrag>
  drops: ObservableValue<Map<unknown, ObservableValue<DropState>>>
}
export const dndContext = createContext<DndContext>(undefined as any)

export const useDndContext = () => useContext(dndContext)

export const DndProvider = (props: { children: ReactNode }) => {
  const context = useConstant(
    (): DndContext => ({
      dragStart: EventController.create(),
      drops: new ObservableValue(new Map()),
    }),
  )

  return (
    <dndContext.Provider value={context}>{props.children}</dndContext.Provider>
  )
}

export type OngoingDrag = Readonly<{
  startPoint: Readonly<Point>
  pointerOffset: Readonly<Point>
  lastPoint: ObservableValue<Point>
  data: Map<DragType<unknown>, unknown>

  dragMove: EventController<{
    event: PointerEvent | MouseEvent | TouchEvent
    point: Point
  }>
  dragEnd: EventController<{
    event: PointerEvent | MouseEvent | TouchEvent
    point: Point
  }>
  dragCancel: EventController<{
    event: PointerEvent | MouseEvent | TouchEvent
    point: Point
  }>

  enteredDropZone: EventController<void>
  leftDropZone: EventController<void>
  droppedInDropZone: EventController<void>
}>

export const OngoingDrag = {
  create(base: Pick<OngoingDrag, "startPoint" | "pointerOffset">): OngoingDrag {
    return {
      ...base,
      lastPoint: new ObservableValue(base.startPoint),
      data: new Map(),

      dragMove: EventController.create(),
      dragEnd: EventController.create(),
      dragCancel: EventController.create(),

      enteredDropZone: EventController.create(),
      leftDropZone: EventController.create(),
      droppedInDropZone: EventController.create(),
    }
  },

  getData<T>(self: OngoingDrag, type: DragType<T>): T | undefined {
    return self.data.get(type) as T | undefined
  },
  setData<T>(self: OngoingDrag, type: DragType<T>, data: T) {
    self.data.set(type, data)
  },
  deleteData<T>(self: OngoingDrag, type: DragType<T>) {
    self.data.delete(type)
  },
}
