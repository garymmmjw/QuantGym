import * as shared from "../sharedImports.js";
import { initRuntimeSliceImpl } from "./impl/initRuntimeSlice.impl.js";

export function initRuntimeSlice(ctx = {}) {
  return initRuntimeSliceImpl(shared, ctx);
}
