import { initRuntimeSlice } from "./slices/initRuntimeSlice.js";
import { initShellSlice } from "./slices/initShellSlice.js";
import { initInterviewSlice } from "./slices/initInterviewSlice.js";
import { initDomainSlice } from "./slices/initDomainSlice.js";
import { initOverviewSlice } from "./slices/initOverviewSlice.js";
import { assemblePageApiSlice } from "./slices/assemblePageApiSlice.js";

export function createAppContext(options = {}) {
  const ctx = { options, __sliceRefs: {} };
  Object.assign(ctx, initRuntimeSlice(ctx));
  Object.assign(ctx, initShellSlice(ctx));
  Object.assign(ctx, initInterviewSlice(ctx));
  Object.assign(ctx, initDomainSlice(ctx));
  Object.assign(ctx, initOverviewSlice(ctx));
  return assemblePageApiSlice(ctx);
}
