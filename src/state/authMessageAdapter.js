import {
  getAuthErrorMessage as getAuthErrorMessageValue,
  getAuthReadyMessage as getAuthReadyMessageValue,
  getVerificationErrorMessage as getVerificationErrorMessageValue
} from './auth.js';

export function createAuthMessageAdapter(deps = {}) {
  const getProtocol = () => deps.getProtocol?.() || globalThis.location?.protocol || "";
  const text = (key) => deps.t?.(key) || key;

  return {
    getAuthReadyMessage() {
      return getAuthReadyMessageValue({
        googleLoginEnabled: Boolean(deps.googleLoginEnabled),
        protocol: getProtocol(),
        text
      });
    },

    getVerificationErrorMessage(error) {
      return getVerificationErrorMessageValue(error, { text });
    },

    getAuthErrorMessage(error) {
      return getAuthErrorMessageValue(error, {
        protocol: getProtocol(),
        text
      });
    }
  };
}
