import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/outlet/history')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/outlet/history"!</div>
}
