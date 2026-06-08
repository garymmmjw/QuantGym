export function createPageApiUserState(deps = {}) {
  const getUserState = () => deps.userState?.value || {};
  const setUserPatch = (patch) => {
    const nextState = {
      ...getUserState(),
      ...patch
    };
    if (deps.userStateRuntime?.setValue) {
      deps.userStateRuntime.setValue(nextState);
    } else if (deps.userState) {
      deps.userState.value = nextState;
    }
    deps.userStateRuntime?.save?.({ checkIn: false });
  };
  return { getUserState, setUserPatch };
}
