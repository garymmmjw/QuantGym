import { sanitizeAccountForCloud } from "./cloud.js";

export function sendCloudVerificationCode(options = {}) {
  const {
    cloudApi = async () => ({}),
    email = "",
    purpose = "register"
  } = options;
  return cloudApi("/auth/verification-code", {
    method: "POST",
    auth: false,
    body: { email, purpose }
  });
}

export function registerCloudAccount(options = {}) {
  const {
    cloudApi = async () => ({}),
    account = {},
    password = "",
    localState = {},
    localCommunity = {},
    verificationCode = "",
    cloudStatePayload = (state) => state,
    getUserCatalogProblems = (problems) => problems || []
  } = options;
  return cloudApi("/auth/register", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      password,
      verificationCode,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}

export function loginCloudAccount(options = {}) {
  const {
    cloudApi = async () => ({}),
    email = "",
    password = ""
  } = options;
  return cloudApi("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password }
  });
}

export function loginCloudGoogle(options = {}) {
  const {
    cloudApi = async () => ({}),
    account = {},
    credential = "",
    localState = {},
    localCommunity = {},
    cloudStatePayload = (state) => state,
    getUserCatalogProblems = (problems) => problems || []
  } = options;
  return cloudApi("/auth/google", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      credential,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}
