import { useLayoutEffect, useRef } from "react"

export function assertType<T>(value: T) {
  return value
}

export function createSequence() {
  let nextId = 1

  return function useId() {
    const id = useRef<number>()
    if (id.current === undefined) {
      id.current = nextId
      nextId += 1
    }
    return id.current
  }
}

export function useConstant<T>(factory: () => T) {
  const ref = useRef<T | null>(null)

  if (ref.current === null) {
    ref.current = factory()
  }

  return ref.current
}

export function useLatest<T>(value: T) {
  const ref = useRef(value)

  useLayoutEffect(() => {
    ref.current = value
  })

  return ref
}
