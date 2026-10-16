export function learnFrameHeight(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 250000
    ? Math.ceil(value) : null;
}

// Translate a child-document target into the only scrollable page: QuantGym.
export function learnScrollTarget(view, request) {
  if (!Number.isFinite(request.top) || request.top < 0 || request.top > 250000) return null;
  const top = view.frameTop + request.top;
  const bottom = view.frameTop + (Number.isFinite(request.bottom) ? request.bottom : request.top);
  const visibleTop = view.topInset + 12;
  const visibleBottom = view.viewportHeight - view.bottomInset - 12;
  if (request.onlyIfAbove && top >= visibleTop - 16) return null;
  if (request.block === 'nearest' && top >= visibleTop && bottom <= visibleBottom) return null;
  if (request.block === 'nearest' && top >= visibleTop && bottom - top < visibleBottom - visibleTop) {
    return Math.max(0, view.pageY + bottom - visibleBottom);
  }
  return Math.max(0, view.pageY + top - visibleTop);
}
