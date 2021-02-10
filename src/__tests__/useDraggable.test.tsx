import { DndProvider } from "@lib/context"
import { useDraggable } from "@lib/useDraggable"
import { mockPointerCapture, nextFrame } from "@lib/__tests__/testUtils"
import { fireEvent, render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import React from "react"

chai.use(chaiDom)

describe("useDraggable", () => {
  it("sets the size of the dragging container element", async () => {
    mockPointerCapture()
    const Component = () => {
      const draggable = useDraggable()

      return draggable.mapChildren(
        <div
          {...draggable.props}
          style={{ ...draggable.props.style, width: "100%", height: "100%" }}
          data-testid="dragitem"
        >
          Draggable {draggable.isLifted ? "lifted" : "not lifted"}{" "}
          {draggable.isLifted.toString()}
        </div>,
      )
    }

    const { getByTestId } = render(
      <DndProvider>
        <div style={{ width: 200, height: 100 }}>
          <Component />
        </div>
      </DndProvider>,
    )
    let dragitem = getByTestId("dragitem")

    fireEvent.pointerDown(dragitem, {
      buttons: 1,
      clientX: 0,
      clientY: 0,
    })
    await nextFrame()
    fireEvent.pointerMove(dragitem, {
      buttons: 1,
      clientX: 10,
      clientY: 10,
    })
    await nextFrame()

    dragitem = getByTestId("dragitem")

    expect(dragitem.clientWidth).to.equal(200)
    expect(dragitem.clientHeight).to.equal(100)
  })
})
