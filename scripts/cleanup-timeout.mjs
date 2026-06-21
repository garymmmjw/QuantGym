export async function closeWithTimeout(label, close, timeoutMs, onTimeout = null) {
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      if (typeof onTimeout === "function") {
        try {
          onTimeout();
        } catch {
          // Cleanup timeout hooks should never keep the caller stuck.
        }
      }
      resolve(false);
    }, timeoutMs);
  });
  const closed = Promise.resolve()
    .then(close)
    .then(() => true);

  try {
    return await Promise.race([closed, timeout]);
  } catch (error) {
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
