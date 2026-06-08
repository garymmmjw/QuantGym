import * as shared from "../sharedImports.js";
import { initShellSliceImpl } from "./impl/initShellSlice.impl.js";

export function initShellSlice(ctx = {}) {
  return initShellSliceImpl(shared, ctx);
}
