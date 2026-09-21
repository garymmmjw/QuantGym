import { fetchPrivateImage, privateMediaRequest } from '../../features/account/privateMedia.js';

// A render owns every request and object URL it creates. Disposing the render
// aborts pending downloads and removes prior account images immediately.
export function createPrivateMediaRenderContext({ config = {}, ownerId = '', fetchImpl = globalThis.fetch,
  createObjectURL = blob => URL.createObjectURL(blob), revokeObjectURL = url => URL.revokeObjectURL(url) } = {}) {
  const controller = new AbortController();
  const urls = new Set();
  const images = new Set();
  return {
    loadImage(image, source) {
      if (controller.signal.aborted) return;
      const request = privateMediaRequest(source, config, ownerId);
      if (!request) { image.src = source; return; }
      if (request.blocked) return;
      images.add(image);
      fetchPrivateImage(source, config, ownerId, { fetchImpl, signal: controller.signal }).then(result => {
        if (controller.signal.aborted || !result.blob) return;
        const url = createObjectURL(result.blob);
        urls.add(url);
        image.src = url;
      }).catch(() => { /* A failed private image never retries anonymously. */ });
    },
    dispose() {
      controller.abort();
      for (const image of images) image.removeAttribute('src');
      for (const url of urls) revokeObjectURL(url);
      images.clear();
      urls.clear();
    },
  };
}
