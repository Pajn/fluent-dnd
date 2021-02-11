import {
  animate,
  createDragType,
  DndProvider,
  OngoingDrag,
  Point,
  useDrop,
} from "@lib/index"
import { useDraggable } from "@lib/useDraggable"
import { useObserveValue } from "@lib/value"
import React, { useEffect, useState } from "react"
import { ExampleContainer } from "./lib/ExmpleContainer"
import { dragItemStyles } from "./lib/styles"

const inDropZone = createDragType<boolean>()
const dropZoneCenter = createDragType<Point>()

export default () => {
  const [message, setMessage] = useState("")

  return (
    <DndProvider>
      <ExampleContainer columns={2}>
        <DragItem setMessage={setMessage} />
        <DropZone />
        <div data-testid="message" style={{ gridColumn: "span 2", height: 30 }}>
          {message}
        </div>
      </ExampleContainer>
    </DndProvider>
  )
}

const DragItem = (props: { setMessage: (message: string) => void }) => {
  const draggable = useDraggable({
    whenDragging: {
      transform: "scale(1.1)",
    },
    onDropAnimationWillStart(drag, drop) {
      const point = OngoingDrag.getData(drag, dropZoneCenter)
      if (point) {
        const rect = drop.element.getBoundingClientRect()
        drop.replaceTarget(
          {
            x: point.x - rect.width / 2,
            y: point.y - rect.height / 2,
          },
          { scale: 0, durationModifier: 2 },
        )

        drop.getAnimation().addEventListener("finish", () => {
          animate(
            draggable.element.current!,
            [{ transform: "scale(0)" }, { transform: "scale(1)" }],
            { duration: 500, easing: "ease" },
          )
        })
        props.setMessage("Dropped in dropzone")
      } else {
        props.setMessage("Dropped outside")
      }
    },
  })
  const overDropZone = useObserveValue(draggable.inDropZone)

  useEffect(() => {
    let animation: Animation | undefined = undefined
    return draggable.inDropZone.subscribe((overDropZone) => {
      if (overDropZone) {
        animation = draggable.element.current?.animate(
          { transform: "scale(0.9)" },
          { duration: 200, fill: "forwards" },
        )
      } else {
        animation?.reverse()
      }
    })
  }, [])

  return draggable.mapChildren(
    <div
      data-testid="dragitem"
      {...draggable.props}
      style={{
        ...dragItemStyles,
        ...draggable.props.style,
        opacity: overDropZone ? 0.7 : 1,
        transition: "opacity 200ms linear",
      }}
    >
      {overDropZone ? "Drop me" : "Drag me"}
    </div>,
  )
}

const DropZone = () => {
  const drop = useDrop({
    onItemEntered(drag) {
      OngoingDrag.setData(drag, inDropZone, true)
    },
    onItemLeft(drag) {
      OngoingDrag.setData(drag, inDropZone, false)
    },
    onDrop(drag) {
      if (drop.position.current) {
        const rect = drop.position.current
        OngoingDrag.setData(drag, dropZoneCenter, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      }
    },
  })
  const isDraggingOver = useObserveValue(drop.isDraggingOver)

  return (
    <div
      {...drop.props}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 200,
        height: 200,
        borderRadius: 10,
        color: "white",
        backgroundColor: isDraggingOver ? "#7e8c9b" : "slategray",
      }}
    >
      Drop Here
    </div>
  )
}
