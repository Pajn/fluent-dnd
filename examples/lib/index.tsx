import "focus-visible"
import React, { lazy, Suspense } from "react"
import ReactDOM from "react-dom"
import {
  BrowserRouter,
  NavLink,
  NavLinkProps,
  Route,
  Routes,
} from "react-router-dom"
import "./index.css"

const examples = [
  {
    id: "simple",
    name: "Simple",
    Component: lazy(() => import("@examples/01-simple")),
  },
  {
    id: "sort-list",
    name: "Sort List",
    Component: lazy(() => import("@examples/02-sort-list")),
  },
  {
    id: "two-lists",
    name: "Two Lists",
    Component: lazy(() => import("@examples/03-two-lists")),
  },
  {
    id: "auto-scroll-list",
    name: "Auto scroll list",
    Component: lazy(() => import("@examples/04-auto-scroll-list")),
  },
]

const SidebarItem = (props: NavLinkProps) => {
  return <NavLink {...props} activeClassName="active" />
}

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <div className="sidemenu">
        {examples.map((example) => (
          <SidebarItem key={example.id} to={`/${example.id}`}>
            {example.name}
          </SidebarItem>
        ))}
      </div>
      <Suspense fallback={null}>
        <Routes>
          {examples.map((example) => (
            <Route key={example.id} path={`/${example.id}`}>
              <example.Component />
            </Route>
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root"),
)

if (import.meta.hot) {
  import.meta.hot.accept()
}
