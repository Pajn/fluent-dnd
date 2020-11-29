import Portal from "@reach/portal"
import React, {
  cloneElement,
  CSSProperties,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react"
import { animate, durations, easings, translate } from "./animation"
import { DropState, OngoingDrag, useDndContext } from "./context"
import {
  ElementSize,
  getBoundingClientRectIgnoringTransforms,
  getElementSize,
  Point,
} from "./geometry"
import { Spacer } from "./Spacer"
import { useDrag } from "./useDrag"
import { useConstant, useLatest } from "./util"
import { ObservableValue, useMappedObserveValue } from "./value"

function useDropState(id: unknown | undefined) {
  const context = useDndContext()
  const internalId = useRef(id)
  if (internalId.current === undefined) {
    internalId.current = Symbol()
  }

  const drop = useConstant(() => {
    let drag = context.drops.current.get(internalId.current)
    if (drag !== undefined)
      return drag as ObservableValue<DropState | undefined>
    return new ObservableValue<DropState | undefined>(undefined)
  })

  useEffect(
    () =>
      context.drops.onChange.subscribe((drops) => {
        drop.set(drops.get(internalId.current)?.current)
      }),
    [],
  )

  if (id !== undefined && internalId.current !== id) {
    // TODO: id changed
  }

  function setDropState(dropState: DropState | undefined) {
    if (dropState === undefined) {
      context.drops.current.delete(internalId.current)
      context.drops.set(context.drops.current, { force: true })
    } else {
      const drop = context.drops.current.get(internalId.current)
      if (drop) {
        drop.set(dropState)
      } else {
        context.drops.current.set(
          internalId.current,
          new ObservableValue(dropState),
        )
        context.drops.set(context.drops.current, { force: true })
      }
    }
  }

  return [drop, setDropState] as const
}

export type DraggableOptions = {
  id?: unknown
  spacerZeroSized?: boolean
  whenDragging?: CSSProperties
  onDragStart?: (drag: OngoingDrag, point: Point) => void
  onDragMove?: (drag: OngoingDrag, point: Point) => void
  onDragEnd?: (drag: OngoingDrag, point: Point) => void
  onDragCancel?: (drag: OngoingDrag, point: Point) => void
  onDropAnimationWillStart?: (
    drag: OngoingDrag,
    dropAnimation: {
      startPoint: Point
      targetPoint: Point
      element: HTMLElement
      getAnimation: () => Animation
      accept: () => void
      replaceTarget: (
        targetPoint: Point,
        options?: { scale?: number; durationModifier?: number },
      ) => void
      replaceAnimation: (newAnimation: Animation) => void
    },
  ) => void
}

export const useDraggable = (dragOptions?: DraggableOptions) => {
  const dragContainerRef = useRef<HTMLElement | null>(null)
  const spacerRef = useRef<HTMLElement | null>(null)
  const pickupAnimation = useRef<Animation | null>(null)
  const options = useLatest(dragOptions)
  const [dropState, setDropState] = useDropState(dragOptions?.id)
  const dropAnimation = useConstant(
    () => new ObservableValue<Animation | null>(null),
  )

  const element = useConstant(
    () => new ObservableValue<HTMLElement | null>(null),
  )
  const spacerPos = useConstant(
    () => new ObservableValue<Point | undefined>(undefined),
  )
  const spacerSize = useConstant(
    () =>
      new ObservableValue<ElementSize | undefined>(
        dropState.current?.spacerSize,
      ),
  )
  const dragPos = useConstant(
    () => new ObservableValue<Point | undefined>(dropState.current?.pos),
  )
  const isLifted = useMappedObserveValue(dragPos, (v) => v !== undefined)

  useEffect(
    () =>
      dragPos.subscribe((dragPos) => {
        if (dragPos !== undefined && dragContainerRef.current !== null) {
          dragContainerRef.current.style.transform = translate(dragPos)
        }
      }),
    [],
  )

  function maybePerformDropAnimation() {
    if (
      dropState.current != undefined &&
      dropAnimation.current == null &&
      dragContainerRef.current != null &&
      spacerRef.current != null
    ) {
      const spacerDomRect = getBoundingClientRectIgnoringTransforms(
        spacerRef.current,
      )
      spacerPos.set(spacerDomRect)
      const startPoint = dropState.current.pos
      let targetPoint: Point = spacerDomRect
      const element = dragContainerRef.current
      let animation = animate(
        element,
        [{ transform: translate(targetPoint) }],
        {
          duration: durations.cancelDrop(
            Point.distance(startPoint, targetPoint),
          ),
          easing: easings.drop,
        },
      )
      function replaceAnimation(newAnimation: Animation) {
        animation.cancel()
        animation = newAnimation
      }
      options.current?.onDropAnimationWillStart?.(dropState.current.drag, {
        startPoint,
        targetPoint,
        element,
        getAnimation: () => animation,
        accept: () => {
          animation.effect?.updateTiming({
            duration: durations.acceptedDrop(
              Point.distance(startPoint, targetPoint),
            ),
          })
        },
        replaceTarget: (target, options) => {
          targetPoint = target
          let transform = translate(targetPoint)
          let duration = durations.acceptedDrop(
            Point.distance(startPoint, targetPoint),
          )
          if (options?.scale !== undefined) {
            transform += ` scale(${options.scale})`
          }
          if (options?.durationModifier !== undefined) {
            duration *= options.durationModifier
          }
          replaceAnimation(
            animate(element, [{ transform }], {
              duration,
              easing: easings.drop,
            }),
          )
        },
        replaceAnimation,
      })

      if (pickupAnimation.current) {
        pickupAnimation.current.effect?.updateTiming({
          duration: animation.effect?.getComputedTiming().activeDuration,
        })
        pickupAnimation.current.reverse()
        pickupAnimation.current.addEventListener("finish", () => {
          pickupAnimation.current = null
        })
      }
      Promise.all([animation.finished, pickupAnimation.current?.finished]).then(
        () => {
          dropAnimation.set(null)
          setDropState(undefined)
          dragPos.set(undefined)
          spacerSize.set(undefined)
        },
      )
      dropAnimation.set(animation)
    }
  }

  useEffect(
    dropState.onChange.subscribe((dropState) => {
      if (dropState !== undefined) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            maybePerformDropAnimation()
          })
        })
      }
    }),
    [],
  )

  const dragContainerRefCallback = useCallback((e: HTMLElement | null) => {
    dragContainerRef.current = e
    if (e !== null && dragPos.current !== undefined) {
      e.style.transform = translate(dragPos.current)
    }
    maybePerformDropAnimation()
  }, [])

  const spacerRefCallback = useCallback((e: HTMLElement | null) => {
    spacerRef.current = e
    maybePerformDropAnimation()
  }, [])

  function stopDrag(drag: OngoingDrag, point: Point) {
    if (spacerSize.current ?? spacerRef.current) {
      setDropState({
        drag,
        spacerSize: spacerSize.current ?? getElementSize(spacerRef.current!),
        pos: Point.diff(point, drag.pointerOffset),
      })
    }
  }

  const drag = useDrag({
    onDragStart(drag, point) {
      if (element.current !== null) {
        spacerSize.set(getElementSize(element.current))
      }
      dragPos.set(Point.diff(point, drag.pointerOffset))
      dragOptions?.onDragStart?.(drag, point)
    },
    onDragMove(drag, point) {
      dragPos.set(Point.diff(point, drag.pointerOffset))
      dragOptions?.onDragMove?.(drag, point)
    },
    onDragEnd:
      options.current?.onDragEnd === undefined
        ? stopDrag
        : (drag, point) => {
            stopDrag(drag, point)
            options.current?.onDragEnd?.(drag, point)
          },
    onDragCancel:
      options.current?.onDragCancel === undefined
        ? stopDrag
        : (drag, point) => {
            stopDrag(drag, point)
            options.current?.onDragCancel?.(drag, point)
          },
  })

  const refCallback = useCallback((e: HTMLElement | null) => {
    element.set(e)
    if (e && options.current?.whenDragging) {
      if (drag.isDragging.current) {
        pickupAnimation.current = animate(
          e,
          [options.current.whenDragging as any],
          {
            duration: durations.pickup,
            fill: "forwards",
          },
        )
      }
    }
  }, [])

  const props = {
    ...drag.props,
    ref: refCallback,
  }
  // typecheck
  const _p: React.HTMLProps<HTMLElement> = props

  useLayoutEffect(() => {
    if (spacerRef.current !== null) {
      const spacerDomRect = getBoundingClientRectIgnoringTransforms(
        spacerRef.current,
      )
      spacerPos.set(spacerDomRect)
    }
  })

  return {
    ...drag,
    props,
    isLifted,
    spacerSize,
    spacerPos,
    element,
    mapChildren: (children: ReactNode) =>
      isLifted ? (
        <>
          <Spacer
            ref={spacerRefCallback}
            size={
              dragOptions?.spacerZeroSized === true
                ? undefined
                : spacerSize.current
            }
          />
          <Portal>
            <div
              ref={dragContainerRefCallback}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                willChange: "transform",
                pointerEvents: "none",
              }}
            >
              {children}
            </div>
          </Portal>
        </>
      ) : (
        <>{children}</>
      ),
  }
}

type ChildParams = ReturnType<typeof useDraggable>

export const Draggable = (props: {
  children:
    | ReactElement<ChildParams["props"]>
    | ((options: ChildParams) => ReactNode)
}) => {
  const draggable = useDraggable()

  return draggable.mapChildren(
    typeof props.children === "function"
      ? props.children(draggable)
      : cloneElement(props.children, draggable.props),
  )
}
