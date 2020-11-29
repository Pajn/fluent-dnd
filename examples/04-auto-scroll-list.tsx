import {
  Autoscroll,
  DndProvider,
  SortableList,
  useSortabeListItem,
} from "@lib/index"
import move from "array-move"
import React, { useState } from "react"
import { ExampleContainer } from "./lib/ExmpleContainer"
import { listItemStyles } from "./lib/styles"

type Item = { id: number }

export default () => {
  const [items, setItems] = useState(() =>
    Array.from({ length: 100 }).map((_, index) => ({ id: index })),
  )

  return (
    <DndProvider>
      <ExampleContainer>
        <Autoscroll
          style={{
            padding: "0 50px",
            height: "min(500px, 100%)",
            overflow: "auto",
          }}
        >
          <SortableList
            items={items}
            moveItem={(from, to) => setItems((items) => move(items, from, to))}
            renderItem={({ item }) => <ListItem key={item.id} item={item} />}
          />
        </Autoscroll>
      </ExampleContainer>
    </DndProvider>
  )
}

const ListItem = (props: { item: Item }) => {
  const listItem = useSortabeListItem()

  return listItem.mapChildren(
    <li
      data-testid={`item-${props.item.id}`}
      {...listItem.props}
      style={{ ...listItemStyles }}
    >
      Item {props.item.id + 1}
    </li>,
  )
}
