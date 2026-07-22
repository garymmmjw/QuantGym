import { createBrowserRouter } from "react-router-dom";

import AuthPage from "../../pages/v2/AuthPage";

const kernelStatus = (
  <main aria-labelledby="v2-kernel-title">
    <h1 id="v2-kernel-title">QuantGym</h1>
    <p>全新的训练体验正在准备中。</p>
  </main>
);

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: <AuthPage />,
  },
  {
    path: "/auth/reset",
    element: <AuthPage />,
  },
  {
    path: "*",
    element: kernelStatus,
  },
]);
