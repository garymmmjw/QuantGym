export function createProblemDetailState(initialDetailId = "") {
  let detailId = String(initialDetailId || "");
  return {
    getDetailId() {
      return detailId;
    },
    setDetailId(nextDetailId = "") {
      detailId = String(nextDetailId || "");
      return detailId;
    },
    clear() {
      detailId = "";
      return detailId;
    }
  };
}

export function getProblemBrowserViewState(options = {}) {
  const {
    selectedDetailId = "",
    problems = [],
    viewMode = "all",
    isCatalogProblem = () => true
  } = options;
  if (selectedDetailId) {
    const selected = (Array.isArray(problems) ? problems : []).find((item) => (
      item?.id === selectedDetailId && isCatalogProblem(item)
    ));
    if (selected) {
      return {
        mode: "detail",
        selected,
        selectedDetailId
      };
    }
    return {
      mode: viewMode === "ranking" ? "ranking" : "list",
      selected: null,
      selectedDetailId: ""
    };
  }
  return {
    mode: viewMode === "ranking" ? "ranking" : "list",
    selected: null,
    selectedDetailId: ""
  };
}

export function getProblemDetailOpenState(currentDetailId = "", nextDetailId = "") {
  const detailId = String(nextDetailId || "");
  if (!detailId) {
    return {
      detailId: "",
      resetReveals: Boolean(currentDetailId)
    };
  }
  return {
    detailId,
    resetReveals: currentDetailId !== detailId
  };
}

export function getProblemDetailReturnState(currentDetailId = "") {
  return {
    detailId: "",
    resetReveals: Boolean(currentDetailId)
  };
}
