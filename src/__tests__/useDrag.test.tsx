import { DndProvider } from "@lib/context"
import { useDraggable } from "@lib/useDraggable"
import { useObserveValue } from "@lib/value"
import { mockPointerCapture, nextFrame } from "@lib/__tests__/testUtils"
import { fireEvent, render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import React from "react"

chai.use(chaiDom)

describe("useDrag", () => {
  it("returns correct dragging status", async () => {
    mockPointerCapture()
    const Component = () => {
      const draggable = useDraggable()
      const isDragging = useObserveValue(draggable.isDragging)

      return (
        <div {...draggable.props} data-testid="dragitem">
          {isDragging && "isDragging"}
          <br />
          {draggable.isLifted && "isLifted"}
        </div>
      )
    }

    const { getByTestId } = render(
      <DndProvider>
        <Component />
      </DndProvider>,
    )
    const dragitem = getByTestId("dragitem")

    expect(dragitem).to.have.text("")
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

    expect(dragitem).to.contain.text("isDragging")
    expect(dragitem).to.contain.text("isLifted")

    fireEvent.pointerUp(dragitem, {
      buttons: 1,
      clientX: 10,
      clientY: 10,
    })
    expect(dragitem).to.not.contain.text("isDragging")
    expect(dragitem).to.contain.text("isLifted")
  })
})
