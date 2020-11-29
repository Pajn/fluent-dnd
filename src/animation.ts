import { lerp, Point } from "./geometry"

declare global {
  interface Animation {
    commitStyles(): void
  }
}

export const durations = {
  pickup: 250,
  outOfTheWay: 200,
  acceptedDrop: lerp([0, 1500], [330, 550]),
  cancelDrop: lerp([0, 1500], [180, 330]),
}
export const easings = {
  outOfTheWay: "cubic-bezier(.2,0,0,1)",
  drop: "cubic-bezier(.2,1,.1,1)",
}

export const translate = (point: Point) =>
  `translate(${point.x}px,${point.y}px)`

export function animate(
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  const animation = element.animate(keyframes, { fill: "both", ...options })
  const listener = () => {
    try {
      animation.commitStyles()
    } catch (err) {
      console.warn("commitStyles", err)
    }
    animation.cancel()
    animation.removeEventListener("finish", listener)
  }
  animation.addEventListener("finish", listener)
  return animation
}
