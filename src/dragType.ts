export interface DragType<_T> {
  name?: string
}

export function createDragType<T>(name?: string): DragType<T> {
  return { name }
}
