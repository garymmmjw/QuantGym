import * as shared from "../sharedImports.js";
import { initOverviewSliceImpl } from "./impl/initOverviewSlice.impl.js";

export function initOverviewSlice(ctx = {}) {
  return initOverviewSliceImpl(shared, ctx);
}
