import type { Point } from "@lib/geometry"
import { fireEvent } from "@testing-library/react"
import { executeServerCommand } from "@web/test-runner-commands"
import chai from "chai"

export const nextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )

export const orderByVisualHeight = (a: HTMLElement, b: HTMLElement) =>
  a.getBoundingClientRect().top - b.getBoundingClientRect().top

function elementDescription(element: Element) {
  let description = element.nodeName.toLocaleLowerCase()
  if (element instanceof HTMLElement) {
    if (element.dataset.testid) {
      description += `[data-testid="${element.dataset.testid}"]`
    }
  }
  return description
}

export async function simulateDrag(
  target: Element,
  offset: Point | Array<Point>,
  { steps = 10, debug = false, release = true } = {},
) {
  const offsets = Array.isArray(offset) ? offset : [offset]
  const lastOffset = offsets[offsets.length - 1]

  const targetPos = target.getBoundingClientRect()
  const pointerStart = {
    x: targetPos.left + targetPos.width / 2,
    y: targetPos.top + targetPos.height / 2,
  }
  if (debug) {
    console.debug(
      `Drag start ${pointerStart.x}, ${pointerStart.y}, ${elementDescription(
        target,
      )}`,
    )
  }

  fireEvent.pointerDown(target, {
    clientX: pointerStart.x,
    clientY: pointerStart.y,
  })
  await nextFrame()
  let startPoint = pointerStart
  for (const offset of offsets) {
    for (let step = 0; step < steps; step++) {
      const percentage = Math.min(step / steps, 1)

      fireEvent.pointerMove(window, {
        clientX: startPoint.x + offset.x * percentage,
        clientY: startPoint.y + offset.y * percentage,
      })
      await nextFrame()
    }
    fireEvent.pointerMove(window, {
      clientX: startPoint.x + offset.x,
      clientY: startPoint.y + offset.y,
    })
    if (debug) {
      console.debug(
        `Drag stop ${startPoint.x + offset.x}, ${
          startPoint.y + offset.y
        }, ${elementDescription(target)}`,
      )
    }
    await nextFrame()
    if (offset !== lastOffset) {
      startPoint = {
        x: startPoint.x + offset.x,
        y: startPoint.y + offset.y,
      }
    }
  }

  if (release) {
    fireEvent.pointerUp(window, {
      clientX: startPoint.x + lastOffset.x,
      clientY: startPoint.y + lastOffset.y,
    })
    if (debug) {
      console.debug(
        `Drag end ${startPoint.x + lastOffset.x}, ${
          startPoint.y + lastOffset.y
        }, ${elementDescription(target)}`,
      )
    }
    await nextFrame()
  }
  return {
    clientX: startPoint.x + lastOffset.x,
    clientY: startPoint.y + lastOffset.y,
  }
}

class MockAnimation extends Animation {
  get finished() {
    return Promise.resolve(this)
  }
  commitStyles() {}
  addEventListener(type: string, cb: EventListenerOrEventListenerObject) {
    if (typeof cb === "function") {
      cb(new Event(type))
    } else {
      cb.handleEvent(new Event(type))
    }
  }
}

export function mockAnimations() {
  const original = Element.prototype.animate
  let restored = false
  const controller = {
    animations: [] as Array<{
      element: string
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null
      options: KeyframeAnimationOptions | undefined
    }>,
    restore() {
      Element.prototype.animate = original
    },
  }

  Element.prototype.animate = function (keyframes, options) {
    if (typeof options === "number") {
      options = { duration: options }
    }
    controller.animations.push({
      element: elementDescription(this),
      keyframes,
      options,
    })
    return new MockAnimation()
  }

  afterEach(() => {
    if (restored) return
    restored = true
    controller.restore()
  })

  return controller
}

type SnapshotOptions = {
  name?: string
}

let testName: string | undefined

beforeEach(function () {
  testName = this.test?.title.replace(/^"before each" hook for "(.*?)"/, "$1")
})

chai.util.addMethod(
  chai.Assertion.prototype,
  "matchSnapshot",
  async function (this: any, options?: SnapshotOptions) {
    const data = chai.util.flag(this, "object")
    const response = (await executeServerCommand("take-snapshot", {
      name: options?.name ?? testName,
      data,
    })) as any
    new chai.Assertion(data).to.deep.equal(response.content)
  },
)

declare global {
  namespace Chai {
    interface Assertion {
      matchSnapshot(): Promise<void>
    }
  }
}
