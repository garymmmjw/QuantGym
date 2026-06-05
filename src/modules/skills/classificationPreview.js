export function createClassificationPreviewController(options = {}) {
  const {
    analyzeEntry = () => ({ gains: {} }),
    classifyEntry = async (text) => analyzeEntry(text),
    elements = {},
    pendingLabel = "自动分类中",
    prefixLabel = "自动分类：",
    skillDefs = {},
    documentRef = globalThis.document,
    windowRef = globalThis.window
  } = options;
  let latestClassification = null;
  let timer = 0;

  function getDifficulty() {
    return Number(elements.difficultyInput?.value || 1);
  }

  function renderChips(gains = {}, difficulty = getDifficulty()) {
    if (!elements.autoClassifyChips) return;
    elements.autoClassifyChips.innerHTML = "";
    Object.entries(skillDefs).forEach(([key, def]) => {
      const value = Math.round((gains[key] || 0) * difficulty);
      const chip = documentRef.createElement("span");
      chip.className = `auto-chip${value > 0 ? " active" : ""}`;
      chip.textContent = value > 0 ? `${def.name} +${value}` : def.name;
      elements.autoClassifyChips.appendChild(chip);
    });
  }

  function update() {
    if (!elements.logText) return;
    const text = elements.logText.value.trim();
    if (!text) {
      if (elements.analysisPreview) elements.analysisPreview.textContent = "";
      return;
    }
    const result = latestClassification?.text === text ? latestClassification.result : analyzeEntry(text);
    const difficulty = getDifficulty();
    const parts = Object.entries(result.gains || {})
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${skillDefs[key]?.name || key} +${Math.round(value * difficulty)}`);
    if (elements.analysisPreview) {
      elements.analysisPreview.textContent = parts.length ? `${prefixLabel}${parts.join(" | ")}` : pendingLabel;
    }
    renderChips(result.gains, difficulty);
  }

  function clearTimer() {
    if (!timer) return;
    windowRef.clearTimeout(timer);
    timer = 0;
  }

  function resetCache() {
    latestClassification = null;
  }

  function schedule() {
    resetCache();
    update();
    clearTimer();
    const text = elements.logText?.value.trim() || "";
    if (!text) return;
    timer = windowRef.setTimeout(async () => {
      try {
        const result = await classifyEntry(text);
        latestClassification = { text, result };
        update();
      } catch {
        update();
      } finally {
        timer = 0;
      }
    }, 700);
  }

  return {
    clearTimer,
    renderChips,
    resetCache,
    schedule,
    update
  };
}
