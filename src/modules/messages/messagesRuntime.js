export function createMessageSelectionState(initialThreadId = "") {
  let threadId = String(initialThreadId || "");
  return {
    getSelected() {
      return threadId;
    },
    setSelected(value = "") {
      threadId = String(value || "");
      return threadId;
    }
  };
}
