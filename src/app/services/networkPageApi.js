export function createNetworkPageApi(deps = {}, userStateApi = {}) {
  const { getUserState, setUserPatch } = userStateApi;
  return {
    getContacts: () => getUserState().network || [],
    setContacts(contacts) {
      setUserPatch({ network: contacts });
    },
    normalizeContact: deps.normalizeNetworkContact,
    getStatusLabel: deps.getNetworkStatusLabel,
    getDeleteLabel: deps.getDeleteLabel
  };
}
