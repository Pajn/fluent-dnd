export type Rect = Point & Size
export const Rect = {
  top(rect: Rect): number {
    return rect.y
  },
  bottom(rect: Rect): number {
    return rect.y + rect.height
  },
  left(rect: Rect): number {
    return rect.x
  },
  right(rect: Rect): number {
    return rect.x + rect.width
  },
  relativeTo(child: Rect, parent: Rect): Rect {
    return {
      x: child.x - parent.x,
      y: child.y - parent.y,
      width: child.width,
      height: child.height,
    }
  },
}

export type Point = { x: number; y: number }
export const Point = {
  diff(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y }
  },
  distance(a: Point, b: Point): number {
    const diff = Point.diff(a, b)
    return Math.sqrt(Math.abs(diff.x) ** 2 + Math.abs(diff.y) ** 2)
  },
}

export type Size = { width: number; height: number }

export const pointInsideRectangle = (box: Rect, point: Point) => {
  return (
    Rect.top(box) <= point.y &&
    Rect.bottom(box) >= point.y &&
    Rect.left(box) <= point.x &&
    Rect.right(box) >= point.x
  )
}

export type Range<T = number> = [T, T]
export const clamp = (range: Range, value: number) =>
  Math.min(range[1], Math.max(range[0], value))
export const lerp = (from: Range, to: Range) => {
  const fromOffset = from[0]
  const fromScale = from[1] - fromOffset
  const toOffset = to[0]
  const toScale = to[1] - toOffset

  return (value: number) => {
    const percentage = (clamp(from, value) - fromOffset) / fromScale
    return percentage * toScale + toOffset
  }
}

export type ElementSize = {
  width: number
  height: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

export function getElementSize(element: HTMLElement): ElementSize {
  const rect = getBoundingClientRectIgnoringTransforms(element)
  const style = window.getComputedStyle(element)

  return {
    width:
      rect.width +
      parseInt(style.borderLeftWidth) +
      parseInt(style.borderRightWidth),
    height:
      rect.height +
      parseInt(style.borderTopWidth) +
      parseInt(style.borderBottomWidth),
    marginTop: parseInt(style.marginTop),
    marginBottom: parseInt(style.marginBottom),
    marginLeft: parseInt(style.marginLeft),
    marginRight: parseInt(style.marginRight),
  }
}

/**
 * `el.getBoundingClientRect()` but ignoring transforms currently applied
 * to the element. Used to get the elements actual position, not where it
 * appears to be due to animations.
 */
export function getBoundingClientRectIgnoringTransforms(
  element: HTMLElement,
): Rect {
  let rect = element.getBoundingClientRect()
  let style = getComputedStyle(element)
  let tx = style.transform

  if (tx) {
    let sx, sy, dx, dy
    if (tx.startsWith("matrix3d(")) {
      let ta = tx.slice(9, -1).split(/, /)
      sx = +ta[0]
      sy = +ta[5]
      dx = +ta[12]
      dy = +ta[13]
    } else if (tx.startsWith("matrix(")) {
      let ta = tx.slice(7, -1).split(/, /)
      sx = +ta[0]
      sy = +ta[3]
      dx = +ta[4]
      dy = +ta[5]
    } else {
      return rect
    }

    let to = style.transformOrigin
    let x = rect.x - dx - (1 - sx) * parseFloat(to)
    let y = rect.y - dy - (1 - sy) * parseFloat(to.slice(to.indexOf(" ") + 1))
    let w = sx ? rect.width / sx : element.offsetWidth
    let h = sy ? rect.height / sy : element.offsetHeight
    return {
      x,
      y,
      width: w,
      height: h,
    }
  } else {
    return rect
  }
}
