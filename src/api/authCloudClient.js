import {
  loginCloudAccount,
  loginCloudGoogle,
  registerCloudAccount,
  sendCloudVerificationCode
} from './auth.js';

export function createAuthCloudClient(deps = {}) {
  const cloudApi = (...args) => deps.cloudApi?.(...args);
  const cloudStatePayload = (state) => deps.cloudStatePayload?.(state) || state;
  const getUserCatalogProblems = (problems) => deps.getUserCatalogProblems?.(problems) || problems || [];

  return {
    sendVerificationCode(email, purpose = "register") {
      return sendCloudVerificationCode({
        cloudApi,
        email,
        purpose
      });
    },

    registerAccount(account, password, localState, localCommunity, verificationCode = "") {
      return registerCloudAccount({
        cloudApi,
        account,
        password,
        localState,
        localCommunity,
        verificationCode,
        cloudStatePayload,
        getUserCatalogProblems
      });
    },

    loginAccount(email, password) {
      return loginCloudAccount({
        cloudApi,
        email,
        password
      });
    },

    loginGoogle(account, credential, localState, localCommunity) {
      return loginCloudGoogle({
        cloudApi,
        account,
        credential,
        localState,
        localCommunity,
        cloudStatePayload,
        getUserCatalogProblems
      });
    }
  };
}
