import move from "array-move"
import React, {
  cloneElement,
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { animate, durations, easings, translate } from "./animation"
import { useAutoscrollContext } from "./Autoscroll"
import { dndContext, OngoingDrag } from "./context"
import { createDragType, DragType } from "./dragType"
import { EventController } from "./events"
import {
  ElementSize,
  getBoundingClientRectIgnoringTransforms,
  getElementSize,
  Point,
  Rect,
} from "./geometry"
import { Spacer } from "./Spacer"
import { DraggableOptions, useDraggable } from "./useDraggable"
import { useDrop } from "./useDrop"
import { createSequence, useConstant, useLatest } from "./util"

// Prevent rapid reverse swapping
const buffer = 5

const calculateListIndex = (
  currentIndex: number | undefined,
  dragPos: Rect,
  positions: Array<Rect>,
) => {
  if (positions.length <= 1) return 0

  const dragPosCenterY = dragPos.y + dragPos.height / 2

  const firstElement = positions[0]
  const secondElement = positions[1]
  const combinedHeight = Rect.bottom(secondElement) - Rect.top(firstElement)
  const combinedCenterY = Rect.top(firstElement) + combinedHeight / 2
  if (dragPosCenterY <= combinedCenterY - buffer) {
    return 0
  }

  let min: {
    distance: number
    index: number
  }

  if (currentIndex === undefined) {
    min = { distance: Infinity, index: 1 }
  } else {
    const currentElement = positions[currentIndex]
    const currentElementCenterY = currentElement.y + currentElement.height / 2
    const currentDistance = Math.abs(dragPosCenterY - currentElementCenterY)

    min = { distance: currentDistance - buffer, index: currentIndex }
  }

  for (let i = 1; i < positions.length; i++) {
    const prevElement = positions[i - 1]
    const element = positions[i]

    const combinedHeight = Rect.bottom(element) - Rect.top(prevElement)
    const combinedCenterY = Rect.top(prevElement) + combinedHeight / 2
    const distance = Math.abs(dragPosCenterY - combinedCenterY)

    if (distance < min.distance) {
      min = { distance, index: i }
    }
  }

  return min.index
}

const sortableListContext = createContext<{
  listId: number
  updatePosition: EventController<void>
  itemOrderUpdate: number
  getPosition(_item: unknown): Rect | undefined
  setPosition(_item: unknown, _rect: Rect): Rect | undefined
  dragType: DragType<unknown> | undefined
  mapToDragType: ((_item: unknown) => unknown) | undefined
}>(undefined as any)
const listItemContext = createContext<{ item: unknown; index: number }>(
  undefined as any,
)

type ListInfo = {
  startListId: number
  currentListId: number | undefined
  item: unknown
  startIndex: number
  size: ElementSize
  onDropped: EventController<void>
}
const listInfo = createDragType<ListInfo>("list-info")

const useListId = createSequence()
const spacerKey = {}

export type SortableListProps<T, U, C> = {
  items: Array<T>
  moveItem: (fromIndex: number, toIndex: number, item: T) => void
  renderItem: (params: { item: T; index: number }) => ReactElement

  component?: C

  itemType?: DragType<U>
  mapToDragType?: (item: T) => U
  addItem?: (item: U, toIndex: number) => void
}

export const SortableList = <
  T extends object,
  U extends object = never,
  C extends React.ComponentType<any> = React.ComponentType<
    JSX.IntrinsicElements["ol"]
  >
>(
  props: SortableListProps<T, U, C> &
    Omit<
      React.ComponentPropsWithRef<C>,
      keyof SortableListProps<any, any, any>
    >,
) => {
  const {
    items,
    moveItem,
    renderItem,

    itemType,
    mapToDragType,
    addItem,
    removeItem,

    component,
    style,
    ...otherProps
  } = props

  const listId = useListId()
  const context = useContext(dndContext)
  const autoScrollContext = useAutoscrollContext()

  type DeletedItem = {
    listItem: T
    dragItem: U
    startIndex: number
    lastIndex: number
  }
  type WorkingItem =
    | { type: "item"; item: T; startIndex: number }
    | { type: "spacer"; dragItem: U; size: ElementSize }
  let [sortingState, setSortingState] = useState<{
    orderUpdate: number
    deletedItem?: DeletedItem
    workingItems?: Array<WorkingItem>
  }>({ orderUpdate: 0 })

  const controller = useConstant(() => ({
    props,
    sortingState,
    updatePosition: EventController.create<void>(),
    positions: new Map<T | typeof spacerKey, Rect>(),
    itemToInsert: undefined as U | undefined,
    getPosition(item: unknown) {
      return controller.positions.get(item as T)
    },
    setPosition(item: unknown, itemRect: Rect) {
      const element = drop.element.current
      if (element == null) return undefined
      const listRect = element.getBoundingClientRect()
      const diff = Rect.relativeTo(itemRect, listRect)
      controller.positions.set(item as T, diff)
      return diff
    },
    workingItemToPosition: (item: WorkingItem) =>
      controller.positions.get(item.type === "item" ? item.item : spacerKey)!,
    findItemIndex(dragInfo: ListInfo, dragItem: U | undefined) {
      return (
        controller.sortingState.workingItems?.findIndex(
          (item) =>
            (item.type === "item" && item.item === dragInfo.item) ||
            (item.type === "spacer" && item.dragItem === dragItem),
        ) ?? -1
      )
    },
    findNewItemIndex(
      drag: OngoingDrag,
      point: Point,
      currentIndex: number | undefined,
    ) {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (dragInfo === undefined) return currentIndex ?? 0
      const element = drop.element.current
      if (element == null) return currentIndex ?? 0
      const listRect = element.getBoundingClientRect()
      const targetIndex = calculateListIndex(
        currentIndex,
        {
          ...dragInfo.size,
          ...Point.diff(Point.diff(point, drag.pointerOffset), listRect),
        },
        controller.sortingState.workingItems!.map(
          controller.workingItemToPosition,
        ),
      )
      return targetIndex
    },
  }))

  const drop = useDrop({
    onItemEntered(drag) {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (dragInfo === undefined) return
      const dragItem = itemType && OngoingDrag.getData(drag, itemType)

      OngoingDrag.setData(drag, listInfo, {
        ...dragInfo,
        currentListId: listId,
      })

      if (dragItem === undefined) return

      if (dragInfo.startListId === listId) {
        // The normal sorting operation clears the deletedItem so we
        // never have to insert an item back into the starting list
        return
      }

      controller.itemToInsert = dragItem
    },
    onItemLeft(drag) {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (dragInfo === undefined) return
      const dragItem = itemType && OngoingDrag.getData(drag, itemType)

      if (dragInfo.currentListId === listId) {
        OngoingDrag.setData(drag, listInfo, {
          ...dragInfo,
          currentListId: undefined,
        })
      }

      if (dragItem === undefined) {
        setSortingState({
          orderUpdate: Date.now(),
          workingItems: items.map((item, index) => ({
            type: "item",
            item,
            startIndex: index,
          })),
        })
        return
      }

      if (dragInfo.startListId === listId) {
        const itemIndex = controller.findItemIndex(dragInfo, dragItem)
        setSortingState((state) => ({
          ...state,
          orderUpdate: Date.now(),
          deletedItem: {
            startIndex: dragInfo.startIndex,
            lastIndex: itemIndex,
            listItem: dragInfo.item as T,
            dragItem: dragItem,
          },
        }))
      } else {
        setSortingState((state) => ({
          orderUpdate: Date.now(),
          workingItems: state.workingItems?.filter(
            (item) => !(item.type === "spacer" && item.dragItem === dragItem),
          ),
        }))
      }
    },
    onDragMoveOver(drag, point) {
      if (autoScrollContext?.isScrolling.current === true) return

      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (dragInfo === undefined) return
      if (dragInfo.currentListId !== listId) return

      if (controller.itemToInsert === undefined) {
        const dragItem = itemType && OngoingDrag.getData(drag, itemType)
        const itemIndex = controller.findItemIndex(dragInfo, dragItem)
        if (itemIndex >= 0) {
          const targetIndex = controller.findNewItemIndex(
            drag,
            point,
            itemIndex,
          )
          if (targetIndex !== itemIndex || sortingState.deletedItem) {
            setSortingState((state) => ({
              orderUpdate: Date.now(),
              workingItems: move(state.workingItems!, itemIndex, targetIndex),
            }))
          }
        }
      } else {
        const dragItem = controller.itemToInsert
        controller.itemToInsert = undefined

        const insertIndex = controller.findNewItemIndex(drag, point, undefined)
        setSortingState((state) => {
          const workingItems = [...state.workingItems!]
          workingItems.splice(insertIndex, 0, {
            type: "spacer",
            dragItem,
            size: dragInfo.size,
          })
          return { orderUpdate: Date.now(), workingItems }
        })
      }
    },
    onDrop(drag, point) {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (dragInfo === undefined) return
      const dragItem = itemType && OngoingDrag.getData(drag, itemType)

      const itemIndex = controller.findItemIndex(dragInfo, dragItem)
      if (itemIndex >= 0) {
        const targetIndex = controller.findNewItemIndex(drag, point, itemIndex)
        if (dragInfo.startListId === listId) {
          if (dragInfo.startIndex !== targetIndex) {
            moveItem(dragInfo.startIndex, targetIndex, dragInfo.item as T)
          }
        } else if (dragItem !== undefined) {
          addItem?.(dragItem, targetIndex)
        }
      }
      dragInfo.onDropped.fire()
    },
  })

  useEffect(() => {
    controller.props = props
    controller.sortingState = sortingState
  })

  useLayoutEffect(
    () => drop.element.subscribe(() => controller.updatePosition.fire()),
    [drop.element],
  )

  useEffect(() => {
    const itemsSet = new Set(items)
    controller.positions.forEach((_, item) => {
      if (item !== spacerKey && !itemsSet.has(item as T)) {
        controller.positions.delete(item)
      }
    })

    return context.dragStart.subscribe((drag) => {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (!dragInfo) return

      setSortingState((state) => ({
        orderUpdate: state.orderUpdate,
        workingItems: items.map((item, index) => ({
          type: "item",
          item,
          startIndex: index,
        })),
      }))

      function endDragSession() {
        setSortingState({ orderUpdate: Date.now() })
      }

      dragInfo.onDropped.subscribe(endDragSession)

      drag.dragEnd.subscribe(() => {
        const dragInfo = OngoingDrag.getData(drag, listInfo)

        if (
          dragInfo?.currentListId === undefined ||
          dragInfo.currentListId === listId
        ) {
          endDragSession()
        }
      })
    })
  }, [items])

  const List = component ?? "ol"

  function renderItemWithContexts(item: T, index: number) {
    const rendered = renderItem({
      item,
      index,
    })
    return (
      <listItemContext.Provider value={{ item, index }} key={rendered.key}>
        {rendered}
      </listItemContext.Provider>
    )
  }

  const children =
    sortingState.workingItems === undefined
      ? items.map(renderItemWithContexts)
      : sortingState.workingItems
          .filter(
            (item) =>
              !(
                item.type === "item" &&
                item.startIndex === sortingState.deletedItem?.startIndex
              ),
          )
          .map((item, index) =>
            item.type === "spacer" ? (
              <ListItemSpacer key="__spacer__" size={item.size} />
            ) : (
              renderItemWithContexts(item.item, index)
            ),
          )

  if (sortingState.deletedItem !== undefined) {
    children.push(renderItemWithContexts(sortingState.deletedItem.listItem, -1))
  }

  return (
    <sortableListContext.Provider
      value={{
        listId,
        updatePosition: controller.updatePosition,
        itemOrderUpdate: sortingState.orderUpdate,
        getPosition: controller.getPosition,
        setPosition: controller.setPosition,
        dragType: itemType,
        mapToDragType: mapToDragType as (_item: unknown) => unknown,
      }}
    >
      <List
        {...(otherProps as any)}
        {...drop.props}
        style={{
          padding: 0,
          ...style,
        }}
      >
        {children}
      </List>
    </sortableListContext.Provider>
  )
}

const ListItemSpacer = (props: { size: ElementSize }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const context = useContext(sortableListContext)
  useLayoutEffect(() => {
    if (ref.current !== null) {
      context.setPosition(
        spacerKey,
        getBoundingClientRectIgnoringTransforms(ref.current),
      )
    }
  })

  return (
    <Spacer
      ref={ref}
      data-sortable-list-spacer
      style={{
        listStyle: "none",
      }}
      size={props.size}
    />
  )
}

export function useSortabeListItem(
  options?: Omit<DraggableOptions<never>, "spacerZeroSized" | "item">,
) {
  const listContext = useContext(sortableListContext)
  const listItem = useContext(listItemContext)
  const listItemRef = useLatest(listItem)
  const ref = useRef<HTMLElement | null>(null)
  const currentItemOrderUpdateRef = useRef(listContext.itemOrderUpdate)
  currentItemOrderUpdateRef.current = listContext.itemOrderUpdate
  const lastItemOrderUpdateRef = useRef(0)
  const draggable = useDraggable({
    ...options,
    spacerZeroSized: listItem.index === -1,
    onDragStart(drag, point) {
      const { item, index } = listItem
      if (ref.current !== null) {
        OngoingDrag.setData(drag, listInfo, {
          startListId: listContext.listId,
          currentListId: listContext.listId,
          item,
          startIndex: index,
          size: getElementSize(ref.current),
          onDropped: EventController.create<void>(),
        })
        if (listContext.dragType) {
          OngoingDrag.setData(
            drag,
            listContext.dragType,
            listContext.mapToDragType ? listContext.mapToDragType(item) : item,
          )
        }
      }
      options?.onDragStart?.(drag, point)
    },
    onDropAnimationWillStart(drag, drop) {
      const dragInfo = OngoingDrag.getData(drag, listInfo)
      if (!dragInfo) return

      if (dragInfo.currentListId !== undefined) {
        drop.accept()
      }
      options?.onDropAnimationWillStart?.(drag, drop)
    },
  })

  function updatePosition() {
    const { item, index } = listItemRef.current
    if (index >= 0 && ref.current !== null) {
      const oldPosition = listContext.getPosition(item)
      const rect = getBoundingClientRectIgnoringTransforms(ref.current)
      const newPosition =
        draggable.isLifted && draggable.spacerPos.current
          ? listContext.setPosition(item, {
              x: draggable.spacerPos.current.x,
              y: draggable.spacerPos.current.y,
              width: rect.width,
              height: rect.height,
            })
          : listContext.setPosition(item, rect)

      if (
        !draggable.isLifted &&
        oldPosition !== undefined &&
        newPosition !== undefined
      ) {
        if (
          oldPosition.y !== newPosition.y &&
          lastItemOrderUpdateRef.current !== currentItemOrderUpdateRef.current
        ) {
          lastItemOrderUpdateRef.current = currentItemOrderUpdateRef.current
          animate(
            ref.current,
            [
              {
                transform: translate(Point.diff(oldPosition, newPosition)),
              },
              { transform: translate({ x: 0, y: 0 }) },
            ],
            { duration: durations.outOfTheWay, easing: easings.outOfTheWay },
          )
        }
      }
    }
  }

  useLayoutEffect(updatePosition)
  useEffect(() => {
    updatePosition()
    return listContext.updatePosition.subscribe(() => updatePosition())
  }, [listContext.updatePosition])

  const refCallback = useCallback((e: HTMLElement | null) => {
    draggable.props.ref(e)
    ref.current = e
  }, [])

  const props = {
    ...draggable.props,
    ref: refCallback,
  }

  return { ...draggable, props }
}

type ChildParams = ReturnType<typeof useSortabeListItem>

export const SortableListItem = (props: {
  children:
    | ReactElement<ChildParams["props"]>
    | ((options: ChildParams) => ReactNode)
}) => {
  const listItem = useSortabeListItem()

  return listItem.mapChildren(
    typeof props.children === "function"
      ? props.children(listItem)
      : cloneElement(props.children, listItem.props),
  )
}
