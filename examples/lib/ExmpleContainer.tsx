import React from "react"

export const ExampleContainer = ({
  columns = 1,
  ...props
}: { columns?: number } & JSX.IntrinsicElements["div"]) => {
  return (
    <div
      {...props}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, fit-content(200px))`,
        gap: 100,
        placeContent: "center",
        placeItems: "center",
        contain: "strict",
        ...props.style,
      }}
    />
  )
}
