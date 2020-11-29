import { useEffect, useState } from "react"
import { EventController, Listener, Unsubscribe } from "./events"

export class ObservableValue<T> {
  private _current: T
  readonly onChange = EventController.create<T>()

  public get current() {
    return this._current
  }

  constructor(initial: T) {
    this._current = initial
  }

  public set(value: T, options?: { force?: boolean }) {
    const changed = this._current !== value
    this._current = value
    if (changed || options?.force === true) {
      this.onChange.fire(value)
    }
  }

  public subscribe(cb: Listener<T>): Unsubscribe {
    cb(this.current)
    return this.onChange.subscribe(cb)
  }
}

export function useObserveValue<T>(value: ObservableValue<T>): T {
  const [state, setState] = useState(value.current)

  useEffect(() => value.onChange.subscribe(setState), [])

  return state
}
export function useMappedObserveValue<T, U>(
  value: ObservableValue<T>,
  mapValue: (value: T) => U,
): U {
  const [state, setState] = useState(() => mapValue(value.current))

  useEffect(
    () => value.onChange.subscribe((value) => setState(mapValue(value))),
    [],
  )

  return state
}
