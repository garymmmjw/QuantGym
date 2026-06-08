export function createMessagesPageApi(deps = {}) {
  const syncCommunityStore = (store) => {
    deps.appState.community = store;
    deps.communityStore?.actions?.replace?.(store);
    window.dispatchEvent(new CustomEvent("quantgym:community-updated"));
  };

  return {
    getSelected: () => deps.messageSelectionState?.getSelected?.() || "",
    setSelected: (id) => deps.messageSelectionState?.setSelected?.(id),
    getThreads: deps.getMessageThreads,
    loadCommunity: deps.loadCommunity,
    setCommunity: syncCommunityStore,
    saveCommunity: deps.saveCommunity,
    normalizeThread: deps.normalizeMessageThread,
    normalizeParticipant: deps.normalizeMessageParticipant,
    updateUnreadBadge: deps.updateUnreadMessageBadge
  };
}
