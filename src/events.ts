export type Unsubscribe = () => void
export type Listener<T> = (value: T) => void

export type EventController<T> = {
  subscribe: (cb: Listener<T>) => Unsubscribe
  fire: (event: T) => void
}

export const EventController = {
  create<T>(): EventController<T> {
    const subscribers: Array<Listener<T>> = []

    return {
      subscribe(cb) {
        subscribers.push(cb)
        return () => {
          const index = subscribers.indexOf(cb)
          if (index >= 0) {
            subscribers.splice(index, 1)
          }
        }
      },
      fire(event) {
        for (const subscriber of subscribers) {
          subscriber(event)
        }
      },
    }
  },
}
