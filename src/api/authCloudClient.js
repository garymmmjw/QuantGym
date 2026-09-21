import {
  loginCloudAccount,
  loginCloudGoogle,
  registerCloudAccount,
  requestCloudAuthConfig,
  requestCloudAccountStatus,
  resetCloudPassword,
  sendCloudVerificationCode
} from './auth.js';

export function createAuthCloudClient(deps = {}) {
  const cloudApi = (...args) => deps.cloudApi?.(...args);
  const cloudStatePayload = (state) => deps.cloudStatePayload?.(state) || state;
  const getUserCatalogProblems = (problems) => deps.getUserCatalogProblems?.(problems) || problems || [];

  return {
    authConfig() {
      return requestCloudAuthConfig({ cloudApi });
    },

    accountStatus(email) {
      return requestCloudAccountStatus({
        cloudApi,
        email
      });
    },

    sendVerificationCode(email, purpose = "register", inviteCode = "") {
      return sendCloudVerificationCode({
        cloudApi,
        email,
        purpose,
        inviteCode
      });
    },

    registerAccount(account, password, localState, localCommunity, verificationCode = "", inviteCode = "") {
      return registerCloudAccount({
        cloudApi,
        account,
        password,
        localState,
        localCommunity,
        verificationCode,
        inviteCode,
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

    resetPassword(email, password, verificationCode) {
      return resetCloudPassword({
        cloudApi,
        email,
        password,
        verificationCode
      });
    },

    loginGoogle(account, credential, localState, localCommunity, inviteCode = "") {
      return loginCloudGoogle({
        cloudApi,
        account,
        credential,
        inviteCode,
        localState,
        localCommunity,
        cloudStatePayload,
        getUserCatalogProblems
      });
    }
  };
}
