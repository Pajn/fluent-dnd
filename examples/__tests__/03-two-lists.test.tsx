import {
  mockAnimations,
  nextFrame,
  orderByVisualHeight,
  simulateDrag,
} from "@lib/__tests__/testUtils"
import { fireEvent, getAllByRole, render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import * as React from "react"
import Example from "../03-two-lists"

chai.use(chaiDom)

describe("two-lists", () => {
  it("starts in order", async () => {
    const { getByTestId } = render(<Example />)

    const leftItems = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )
    const rightItems = getAllByRole(getByTestId("list-right"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(leftItems).to.deep.equal(["item-0", "item-1", "item-2", "item-3"])
    expect(rightItems).to.deep.equal(["item-4", "item-5", "item-6", "item-7"])
  })

  it("can drag an item down", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    await simulateDrag(getByTestId("item-4"), { x: 0, y: 60 })

    const items = getAllByRole(getByTestId("list-right"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(items).to.deep.equal(["item-5", "item-4", "item-6", "item-7"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag an item up", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    await simulateDrag(getByTestId("item-3"), { x: 0, y: -140 })

    const items = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(items).to.deep.equal(["item-0", "item-3", "item-1", "item-2"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag an item to the right", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    await simulateDrag(getByTestId("item-1"), { x: 500, y: 0 })

    const itemsLeft = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )
    const itemsRight = getAllByRole(getByTestId("list-right"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(itemsLeft).to.deep.equal(["item-0", "item-2", "item-3"])
    expect(itemsRight).to.deep.equal([
      "item-4",
      "item-1",
      "item-5",
      "item-6",
      "item-7",
    ])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag an item to the left", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    await simulateDrag(getByTestId("item-6"), { x: -500, y: -100 })

    const itemsLeft = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )
    const itemsRight = getAllByRole(getByTestId("list-right"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(itemsLeft).to.deep.equal([
      "item-0",
      "item-6",
      "item-1",
      "item-2",
      "item-3",
    ])
    expect(itemsRight).to.deep.equal(["item-4", "item-5", "item-7"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can drag multiple times", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    await simulateDrag(getByTestId("item-0"), { x: 500, y: 65 }, { steps: 5 })
    await simulateDrag(getByTestId("item-2"), { x: 500, y: -55 }, { steps: 5 })
    await simulateDrag(getByTestId("item-0"), { x: 0, y: 75 }, { steps: 5 })
    await simulateDrag(getByTestId("item-5"), { x: -500, y: 65 }, { steps: 5 })
    await simulateDrag(getByTestId("item-2"), { x: -500, y: 0 }, { steps: 5 })
    await simulateDrag(getByTestId("item-5"), { x: 0, y: -180 }, { steps: 5 })

    const itemsLeft = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )
    const itemsRight = getAllByRole(getByTestId("list-right"), "listitem").map(
      (li) => li.dataset.testid,
    )

    expect(itemsLeft).to.deep.equal(["item-1", "item-5", "item-2", "item-3"])
    expect(itemsRight).to.deep.equal(["item-4", "item-0", "item-6", "item-7"])
    await expect(animations.animations).to.matchSnapshot()
  })

  it("can leave and reenter the same list", async () => {
    const animations = mockAnimations()
    const { getByTestId } = render(<Example />)

    const end = await simulateDrag(
      getByTestId("item-3"),
      [
        { x: -500, y: 0 },
        { x: 0, y: -100 },
        { x: 500, y: 0 },
      ],
      { release: false },
    )

    let items = getAllByRole(document.body, "listitem")
      .filter((li) => +li.dataset.testid!.replace("item-", "") < 4)
      .sort(orderByVisualHeight)
      .map((li) => li.dataset.testid)
    expect(items).to.deep.equal(["item-0", "item-1", "item-3", "item-2"])

    fireEvent.pointerUp(window, end)
    await nextFrame()

    items = getAllByRole(getByTestId("list-left"), "listitem").map(
      (li) => li.dataset.testid,
    )
    expect(items).to.deep.equal(["item-0", "item-1", "item-3", "item-2"])

    await expect(animations.animations).to.matchSnapshot()
  })
})
