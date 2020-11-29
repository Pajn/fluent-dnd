import React, { forwardRef } from "react"
import type { ElementSize } from "./geometry"

export const Spacer = forwardRef<
  HTMLDivElement,
  JSX.IntrinsicElements["div"] & { size: ElementSize | undefined }
>(({ size, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-draggable-spacer
      style={
        size === undefined
          ? { maxWidth: 0, maxHeight: 0, ...style }
          : {
              // ## Recreating the box model
              // Apply margins separately due to possible margin collapsing
              // when placed adjecent to other elements with margins

              // border box
              boxSizing: "border-box",
              width: size.width,
              height: size.height,
              // margin box
              marginTop: size.marginTop,
              marginBottom: size.marginBottom,
              marginLeft: size.marginLeft,
              marginRight: size.marginRight,

              // ## Avoiding flexing
              // Avoiding shrinking or growing of this element when placed
              // inside a flex container. We have already taken a snapshot
              // of the current dimensions, so we do not want this element
              // to change size during a drag.
              flexShrink: 0,
              flexGrow: 0,

              pointerEvents: "none",
              ...style,
            }
      }
      {...props}
    />
  )
})
