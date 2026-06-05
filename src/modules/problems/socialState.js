export function createProblemSocialState(initialSocial = new Map(), initialNotice = "") {
  let social = initialSocial instanceof Map ? initialSocial : new Map();
  let notice = String(initialNotice || "");

  return {
    getSocial() {
      return social;
    },
    setSocial(nextSocial = new Map()) {
      social = nextSocial instanceof Map ? nextSocial : new Map();
      return social;
    },
    getNotice() {
      return notice;
    },
    setNotice(nextNotice = "") {
      notice = String(nextNotice || "");
      return notice;
    },
    reset() {
      social = new Map();
      notice = "";
      return { social, notice };
    }
  };
}
