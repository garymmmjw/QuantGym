import * as shared from "../sharedImports.js";
import { initDomainSliceImpl } from "./impl/initDomainSlice.impl.js";

export function initDomainSlice(ctx = {}) {
  return initDomainSliceImpl(shared, ctx);
}
