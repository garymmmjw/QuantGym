export async function readFilePayload(file, options = {}) {
  const isPdf = isPdfFile(file);
  const isImage = isImageFile(file);
  const preferDataUrl = options.preferDataUrl || isPdf;
  const content = preferDataUrl ? await readFileAsDataUrl(file) : await readFileAsText(file);
  return {
    name: file.name,
    type: file.type || (isPdf ? "application/pdf" : isImage ? "image/*" : "text/plain"),
    size: file.size,
    dataUrl: preferDataUrl ? content : "",
    text: preferDataUrl ? "" : String(content || "").slice(0, 80_000)
  };
}

export function isPdfFile(file) {
  return Boolean(file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")));
}

export function isImageFile(file) {
  return Boolean(file && (String(file.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || "")));
}

export function isBinaryInterviewAttachment(file) {
  return Boolean(file && (isImageFile(file) || isPdfFile(file)));
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsText(file);
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(payload, filename) {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), filename);
}
