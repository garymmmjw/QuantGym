import { requestText } from '../api/client.js';

export async function loadPagePartials(options = {}) {
  const {
    errorMarkup = '<section class="module-load-error" role="alert">页面模块加载失败，请刷新重试。</section>',
    fetchImpl = globalThis.fetch,
    root = globalThis.document,
    selector = "[data-page-partial]"
  } = options;
  const mounts = [...(root?.querySelectorAll?.(selector) || [])];
  if (!mounts.length) return [];
  const results = await Promise.all(mounts.map(async (mount) => {
    const partialPath = String(mount.dataset.pagePartial || "").trim();
    if (!partialPath) return { mount, path: "", loaded: false };
    try {
      mount.innerHTML = await requestText(partialPath, { cache: "no-cache", fetchImpl });
      mount.dataset.pagePartialLoaded = "true";
      return { mount, path: partialPath, loaded: true };
    } catch (error) {
      console.error(`Failed to load page partial: ${partialPath}`, error);
      mount.dataset.pagePartialError = "true";
      mount.innerHTML = errorMarkup;
      return { mount, path: partialPath, loaded: false, error };
    } finally {
      mount.removeAttribute?.("aria-busy");
    }
  }));
  return results;
}
