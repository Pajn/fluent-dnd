import { fireEvent } from "@testing-library/react"
import { executeServerCommand } from "@web/test-runner-commands"
import chai from "chai"

export const nextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )

export async function simulateDrag(
  target: Element,
  offset: { x: number; y: number },
  { steps = 10, debug = false } = {},
) {
  const targetPos = target.getBoundingClientRect()
  const pointerStart = {
    x: targetPos.left + targetPos.width / 2,
    y: targetPos.top + targetPos.height / 2,
  }
  if (debug) {
    console.log(
      `Drag from ${pointerStart.x}, ${pointerStart.y} to ${
        pointerStart.x + offset.x
      }, ${pointerStart.y + offset.y}`,
    )
  }

  fireEvent.pointerDown(target, {
    clientX: pointerStart.x,
    clientY: pointerStart.y,
  })
  await nextFrame()
  for (let step = 0; step < steps; step++) {
    const percentage = Math.min(step / steps, 1)

    fireEvent.pointerMove(window, {
      clientX: pointerStart.x + offset.x * percentage,
      clientY: pointerStart.y + offset.y * percentage,
    })
    await nextFrame()
  }
  fireEvent.pointerMove(window, {
    clientX: pointerStart.x + offset.x,
    clientY: pointerStart.y + offset.y,
  })
  await nextFrame()
  fireEvent.pointerUp(window, {
    clientX: pointerStart.x + offset.x,
    clientY: pointerStart.y + offset.y,
  })
  await nextFrame()
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
    let element = this.nodeName.toLocaleLowerCase()
    if (this instanceof HTMLElement) {
      if (this.dataset.testid) {
        element += `[data-testid="${this.dataset.testid}"]`
      }
    }
    if (typeof options === "number") {
      options = { duration: options }
    }
    controller.animations.push({ element, keyframes, options })
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

chai.util.addMethod(chai.Assertion.prototype, "matchSnapshot", async function (
  this: any,
  options?: SnapshotOptions,
) {
  const data = chai.util.flag(this, "object")
  const response = (await executeServerCommand("take-snapshot", {
    name: options?.name ?? testName,
    data,
  })) as any
  new chai.Assertion(data).to.deep.equal(response.content)
})

declare global {
  namespace Chai {
    interface Assertion {
      matchSnapshot(): Promise<void>
    }
  }
}
