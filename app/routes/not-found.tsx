import { NotFoundPage } from "../../src/features/not-found/NotFoundPage";
import { data, isRouteErrorResponse } from "react-router";
import type { MetaFunction } from "react-router";
import type { Route } from "./+types/not-found";

// Integration point: designer owns src/features/not-found/NotFoundPage.tsx.
// Catch all route renders that component with no invented copy here.

export const meta: MetaFunction = () => {
  return [
    { title: "Page not found: Oasis.dev" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export function loader() {
  throw data("Not Found", { status: 404, statusText: "Not Found" });
}

export default function NotFoundRoute() {
  return <NotFoundPage />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  throw error;
}
