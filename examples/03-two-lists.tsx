import {
  createDragType,
  DndProvider,
  SortableList,
  useSortabeListItem,
} from "@lib/index"
import move from "array-move"
import React, { Dispatch, SetStateAction, useState } from "react"
import { ExampleContainer } from "./lib/ExmpleContainer"
import { listItemStyles } from "./lib/styles"

type Item = { id: number; color: string; height: number }
const dragItemType = createDragType<Item>()

type Updater = Dispatch<SetStateAction<Array<Item>>>
function moveBetweenLists(
  oldUpdater: Updater,
  newUpdater: Updater,
  item: Item,
  newIndex: number,
) {
  oldUpdater((items) => items.filter((i) => i !== item))
  newUpdater((items) => {
    items = [...items]
    items.splice(newIndex, 0, item)
    return items
  })
}

export default () => {
  const [itemsLeft, setItemsLeft] = useState([
    { id: 0, color: "#FF008C", height: 60 },
    { id: 1, color: "#D309E1", height: 80 },
    { id: 2, color: "#9C1AFF", height: 40 },
    { id: 3, color: "#7700FF", height: 100 },
  ])
  const [itemsRight, setItemsRight] = useState([
    { id: 4, color: "#00FF1E", height: 60 },
    { id: 5, color: "#60E109", height: 80 },
    { id: 6, color: "#C9FF1A", height: 40 },
    { id: 7, color: "#DDFF00", height: 100 },
  ])

  return (
    <DndProvider>
      <ExampleContainer
        columns={2}
        style={{
          gap: 0,
          alignItems: "start",
          alignContent: "start",
        }}
      >
        <SortableList
          data-testid="list-left"
          itemType={dragItemType}
          items={itemsLeft}
          moveItem={(from, to) =>
            setItemsLeft((items) => move(items, from, to))
          }
          addItem={(item, index) =>
            moveBetweenLists(setItemsRight, setItemsLeft, item, index)
          }
          renderItem={({ item }) => <ListItem key={item.id} item={item} />}
          style={{ padding: 50, width: 300 }}
        />
        <SortableList
          data-testid="list-right"
          itemType={dragItemType}
          items={itemsRight}
          moveItem={(from, to) =>
            setItemsRight((items) => move(items, from, to))
          }
          addItem={(item, index) =>
            moveBetweenLists(setItemsLeft, setItemsRight, item, index)
          }
          renderItem={({ item }) => <ListItem key={item.id} item={item} />}
          style={{ padding: 50, width: 300 }}
        />
      </ExampleContainer>
    </DndProvider>
  )
}

const ListItem = (props: { item: Item }) => {
  const listItem = useSortabeListItem({
    id: props.item.id,
  })

  return listItem.mapChildren(
    <li
      data-testid={`item-${props.item.id}`}
      {...listItem.props}
      style={{
        ...listItemStyles,
        ...listItem.props.style,
        height: props.item.height,
        backgroundColor: props.item.color,
      }}
    />,
  )
}
