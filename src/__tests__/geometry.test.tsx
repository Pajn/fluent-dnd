import { ElementSize, getElementSize } from "@lib/geometry"
import { mockPointerCapture, nextFrame } from "@lib/__tests__/testUtils"
import { render } from "@testing-library/react"
import chai, { expect } from "chai"
import chaiDom from "chai-dom"
import React, { useLayoutEffect, useRef } from "react"

chai.use(chaiDom)

describe("geometry", () => {
  describe("getElementSize", () => {
    it("correctly measures the size of an element", async () => {
      mockPointerCapture()
      let size: ElementSize | null = null
      const Component = () => {
        const ref = useRef<HTMLDivElement>(null)

        useLayoutEffect(() => {
          if (ref.current) {
            size = getElementSize(ref.current)
          }
        }, [])

        return (
          <div
            ref={ref}
            style={{ width: 20, height: 10, border: "2px solid red" }}
          />
        )
      }

      const { getByTestId } = render(<Component />)
      await nextFrame()

      expect(size).to.deep.equal({
        width: 24,
        height: 14,
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        marginBottom: 0,
      })
    })
  })
})
