/** Each reader owns one confirmed snapshot. Web Locks make compare-and-save
 * atomic across tabs; the local queue preserves this reader's message order. */
export function createLearnProgressWriter({ userId, initialProgress, read, save, locks, isActive }) {
  let baseline = JSON.stringify(initialProgress), closed = false;
  let queue = Promise.resolve();
  const write = async progress => {
    if (closed || !isActive()) return { status: 'inactive' };
    if (typeof locks?.request !== 'function') throw Error('当前浏览器无法安全保存多窗口课程进度，请使用最新版 Chrome。');
    return locks.request(`quantgym:learning:write:${encodeURIComponent(userId)}`, () => {
      if (closed || !isActive()) return { status: 'inactive' };
      const current = read();
      if (JSON.stringify(current) !== baseline) {
        closed = true;
        return { status: 'conflict', progress: current };
      }
      // These storage operations are synchronous inside the exclusive lock.
      if (!isActive()) return { status: 'inactive' };
      const saved = save(progress);
      baseline = JSON.stringify(saved);
      return { status: 'saved', progress: saved };
    });
  };
  return {
    submit(progress) {
      const snapshot = structuredClone(progress);
      const result = queue.then(() => write(snapshot));
      queue = result.catch(() => {});
      return result;
    },
    close() { closed = true; },
  };
}

/** The server revision replaces browser-only locks. Keep the reader's input
 * baseline: merged fields may belong to another device and are not yet in this
 * iframe, so their absence in its next snapshot is not an intentional deletion. */
export function createCloudLearnProgressWriter({ initialProgress, save, isActive, onPending = () => {} }) {
  let baseline = structuredClone(initialProgress), closed = false, pending = 0;
  let queue = Promise.resolve();
  return {
    submit(progress) {
      const input = structuredClone(progress);
      pending++; onPending(true);
      const result = queue.catch(() => {}).then(async () => {
        if (closed || !isActive()) return { status: 'inactive' };
        const saved = await save(input, baseline);
        if (saved.status === 'saved') baseline = input;
        return saved;
      });
      queue = result;
      // Keep flush() rejected after failure, while allowing an explicit retry.
      result.finally(() => { pending--; onPending(pending > 0); }).catch(() => {});
      return result;
    },
    flush: () => queue,
    hasPending: () => pending > 0,
    close() { closed = true; },
  };
}
