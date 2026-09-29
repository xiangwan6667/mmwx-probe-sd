import { createHashRouter, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AppShell } from "@lumina/components/shell/AppShell";
import { RouteErrorFallback } from "@lumina/components/shell/ErrorBoundary";
import { Spinner } from "@lumina/components/ui/Spinner";
import { loadAssetsPage } from "@lumina/services/assetsPageLoader";
import { Traffic } from "@lumina/pages/Traffic";
import { Home } from "@lumina/pages/Home";

const Instance = lazy(() =>
  import("@lumina/pages/Instance").then((m) => ({ default: m.Instance })),
);
const Assets = lazy(() =>
  loadAssetsPage().then((m) => ({ default: m.Assets })),
);
const NotFound = lazy(() =>
  import("@lumina/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

function LoadingFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

function suspended(page: ReactNode) {
  return <Suspense fallback={<LoadingFallback />}>{page}</Suspense>;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "instance/:uuid",
        element: suspended(<Instance />),
      },
      {
        path: "assets",
        element: suspended(<Assets />),
      },
      {
        path: "traffic",
        element: <Traffic />,
      },
      {
        path: "404",
        element: suspended(<NotFound />),
      },
      { path: "*", element: <Navigate to="/404" replace /> },
    ],
  },
]);
