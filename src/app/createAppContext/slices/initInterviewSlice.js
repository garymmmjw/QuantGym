import * as shared from "../sharedImports.js";
import { initInterviewSliceImpl } from "./impl/initInterviewSlice.impl.js";

export function initInterviewSlice(ctx = {}) {
  return initInterviewSliceImpl(shared, ctx);
}
