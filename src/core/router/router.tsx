import { createBrowserRouter } from "react-router-dom";

const kernelStatus = (
  <main aria-labelledby="v2-kernel-title">
    <h1 id="v2-kernel-title">QuantGym</h1>
    <p>全新的训练体验正在准备中。</p>
  </main>
);

export const appRouter = createBrowserRouter([
  {
    path: "*",
    element: kernelStatus,
  },
]);
