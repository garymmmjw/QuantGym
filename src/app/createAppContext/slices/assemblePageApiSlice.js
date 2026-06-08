import * as shared from "../sharedImports.js";
import { assemblePageApiSliceImpl } from "./impl/assemblePageApiSlice.impl.js";

export function assemblePageApiSlice(ctx = {}) {
  return assemblePageApiSliceImpl(shared, ctx);
}
