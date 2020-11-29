import { mockAnimations, simulateDrag } from "@lib/__tests__/testUtils"
import { render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import * as React from "react"
import Example from "../02-sort-list"

chai.use(chaiDom)

describe("sort-list", () => {
  it("starts in order", async () => {
    const { getAllByRole } = render(<Example />)

    const items = getAllByRole("listitem").map((li) => li.dataset.testid)

    expect(items).to.deep.equal(["item-0", "item-1", "item-2", "item-3"])
  })

  it("can drag an item down", async () => {
    const animations = mockAnimations()
    const { getByTestId, getAllByRole } = render(<Example />)

    await simulateDrag(getByTestId("item-1"), { x: 0, y: 40 })

    const items = getAllByRole("listitem").map((li) => li.dataset.testid)

    expect(items).to.deep.equal(["item-0", "item-2", "item-1", "item-3"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag an item up", async () => {
    const animations = mockAnimations()
    const { getByTestId, getAllByRole } = render(<Example />)

    await simulateDrag(getByTestId("item-3"), { x: 0, y: -140 })

    const items = getAllByRole("listitem").map((li) => li.dataset.testid)

    expect(items).to.deep.equal(["item-0", "item-3", "item-1", "item-2"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag multiple times", async () => {
    const animations = mockAnimations()
    const { getByTestId, getAllByRole } = render(<Example />)

    await simulateDrag(getByTestId("item-0"), { x: 0, y: 65 })
    await simulateDrag(getByTestId("item-2"), { x: 0, y: -80 })
    await simulateDrag(getByTestId("item-0"), { x: 0, y: 70 })

    const items = getAllByRole("listitem").map((li) => li.dataset.testid)

    expect(items).to.deep.equal(["item-1", "item-2", "item-3", "item-0"])
    await expect(animations.animations).to.matchSnapshot()
  })
})
