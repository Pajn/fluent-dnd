import { simulateDrag } from "@lib/__tests__/testUtils"
import { render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import * as React from "react"
import Example from "../01-simple"

chai.use(chaiDom)

describe("simple", () => {
  it("is clean at startup", () => {
    const { getByTestId } = render(<Example />)
    const message = getByTestId("message")
    expect(message).to.have.text("")
  })

  it("can detect drop in dropzone", async () => {
    const { getByTestId } = render(<Example />)
    const dragitem = getByTestId("dragitem")
    const message = getByTestId("message")

    await simulateDrag(dragitem, { x: 300, y: 0 })
    expect(message).to.have.text("Dropped in dropzone")
  })

  it("can detect drop outside dropzone", async () => {
    const { getByTestId } = render(<Example />)
    const dragitem = getByTestId("dragitem")
    const message = getByTestId("message")

    await simulateDrag(dragitem, { x: 600, y: 0 })
    expect(message).to.have.text("Dropped outside")
  })
})
