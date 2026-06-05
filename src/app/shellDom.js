import { bindAppShellEvents } from '../ui/appEvents.js';
import { collectAppElements } from '../ui/elements.js';
import { loadPagePartials as loadPagePartialsView } from '../ui/partials.js';

export function loadPagePartials(documentRef = globalThis.document) {
  return loadPagePartialsView({ root: documentRef });
}

export function bindElements(elements, documentRef = globalThis.document) {
  Object.assign(elements, collectAppElements(documentRef));
  return elements;
}

export function bindShellEvents(options = {}) {
  return bindAppShellEvents(options);
}
