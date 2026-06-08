import { bindShellEvents } from "./shellDom.js";

export function bindAppEvents(context = {}) {
  const bind = context.bindEvents || context.bootstrap?.bindEvents;
  if (typeof bind === "function") {
    bind();
    return;
  }

  const { documentRef = document, elements = {}, handlers = {} } = context;
  bindShellEvents({ documentRef, elements, handlers });
}
