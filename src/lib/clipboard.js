export async function copyText(text, deps = {}) {
  const value = String(text ?? "");
  const navigatorRef = deps.navigatorRef || globalThis.navigator;
  const documentRef = deps.documentRef || globalThis.document;
  if (navigatorRef?.clipboard?.writeText) {
    await navigatorRef.clipboard.writeText(value);
    return true;
  }
  if (!documentRef?.createElement) return false;

  const textarea = documentRef.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  documentRef.body?.appendChild(textarea);
  textarea.select?.();
  const copied = documentRef.execCommand?.("copy") ?? false;
  textarea.remove?.();
  return Boolean(copied);
}
