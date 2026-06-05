export function createHeroCoachController(options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const windowRef = options.windowRef || globalThis.window;
  const elements = options.elements || {};
  let typewriterTimer = null;
  let sharkReady = false;

  function clearTypewriterTimer() {
    if (!typewriterTimer) return;
    windowRef.clearTimeout?.(typewriterTimer);
    typewriterTimer = null;
  }

  function startTypewriter() {
    const node = elements.heroTypewriter;
    if (!node) return false;
    clearTypewriterTimer();
    const typeDelay = 78;
    const deleteDelay = 44;
    const phrasePause = 6800;
    const nextPhraseDelay = 460;
    const phrases = [
      "Sharpen your quant edge today.",
      "Practice faster. Think clearer.",
      "Turn solved problems into signal.",
      "Build interview-ready intuition."
    ];
    const prefersReducedMotion = windowRef.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) {
      node.textContent = phrases[0];
      return true;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    node.setAttribute("aria-live", "polite");
    node.classList.remove("is-changing");

    const tick = () => {
      const phrase = phrases[phraseIndex];
      node.textContent = phrase.slice(0, charIndex);
      if (!deleting && charIndex < phrase.length) {
        charIndex += 1;
        typewriterTimer = windowRef.setTimeout?.(tick, typeDelay) || null;
        return;
      }
      if (!deleting) {
        deleting = true;
        typewriterTimer = windowRef.setTimeout?.(tick, phrasePause) || null;
        return;
      }
      if (charIndex > 0) {
        charIndex -= 1;
        typewriterTimer = windowRef.setTimeout?.(tick, deleteDelay) || null;
        return;
      }
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typewriterTimer = windowRef.setTimeout?.(tick, nextPhraseDelay) || null;
    };

    node.textContent = "";
    tick();
    return true;
  }

  function initSharkInteractions() {
    if (sharkReady) return false;
    const stage = documentRef.getElementById?.("sharkStage");
    const btn = documentRef.getElementById?.("sharkInteractive");
    const shark = documentRef.getElementById?.("heroShark");
    const bubble = documentRef.getElementById?.("sharkBubble");
    if (!stage || !btn || !shark) return false;
    sharkReady = true;

    const reduceMotion = windowRef.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let raf = null;
    let targetX = 0;
    let targetY = 0;
    let targetRot = 0;
    let curX = 0;
    let curY = 0;
    let curRot = 0;

    const apply = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      curRot += (targetRot - curRot) * 0.12;
      btn.style.setProperty("--sx", `${curX.toFixed(2)}px`);
      btn.style.setProperty("--sy", `${curY.toFixed(2)}px`);
      btn.style.setProperty("--srot", `${curRot.toFixed(2)}deg`);
      if (Math.abs(targetX - curX) > 0.1 || Math.abs(targetY - curY) > 0.1 || Math.abs(targetRot - curRot) > 0.05) {
        raf = windowRef.requestAnimationFrame?.(apply) || null;
      } else {
        raf = null;
      }
    };
    const schedule = () => {
      if (!raf) raf = windowRef.requestAnimationFrame?.(apply) || null;
    };

    if (!reduceMotion) {
      windowRef.addEventListener?.("mousemove", (event) => {
        const rect = stage.getBoundingClientRect();
        if (!rect.width) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (event.clientX - cx) / rect.width;
        const dy = (event.clientY - cy) / rect.height;
        targetX = Math.max(-1, Math.min(1, dx)) * 16;
        targetY = Math.max(-1, Math.min(1, dy)) * 10;
        targetRot = Math.max(-1, Math.min(1, dx)) * 5;
        schedule();
      }, { passive: true });

      documentRef.addEventListener?.("mouseleave", () => {
        targetX = 0;
        targetY = 0;
        targetRot = 0;
        schedule();
      });
    }

    let bubbleTimer = null;
    const sharkLines = [
      "嘿，专注一点 🦈",
      "今天也要 sharpen 一下！",
      "解一道题，就离 offer 更近一点。",
      "概率题别慌，先写样本空间。",
      "连续打卡中，别断啊！",
      "速算练了吗？我在看着你哦。",
      "蒙特卡洛说：再来一次。",
      "Greeks 复习一下？",
      "好好刷题，鲨鱼罩着你。",
      "深呼吸，面试稳得很。"
    ];
    let lastLine = -1;
    const sayLine = (text) => {
      if (!bubble) return;
      bubble.textContent = text;
      bubble.classList.add("is-visible");
      if (bubbleTimer) windowRef.clearTimeout?.(bubbleTimer);
      bubbleTimer = windowRef.setTimeout?.(() => bubble.classList.remove("is-visible"), 2600) || null;
    };
    const sayRandom = () => {
      let index = Math.floor(Math.random() * sharkLines.length);
      if (index === lastLine) index = (index + 1) % sharkLines.length;
      lastLine = index;
      sayLine(sharkLines[index]);
    };

    btn.addEventListener("click", () => {
      if (!reduceMotion) {
        btn.classList.remove("is-poked");
        void shark.offsetWidth;
        btn.classList.add("is-poked");
        windowRef.setTimeout?.(() => btn.classList.remove("is-poked"), 640);
      }
      sayRandom();
    });

    let hoverCooldown = 0;
    btn.addEventListener("mouseenter", () => {
      const now = Date.now();
      if (now - hoverCooldown > 6000) {
        hoverCooldown = now;
        if (!bubble?.classList.contains("is-visible")) sayLine("点我一下试试 👆");
      }
    });

    if (!reduceMotion) {
      let lastActivity = Date.now();
      const markActivity = () => {
        lastActivity = Date.now();
      };
      windowRef.addEventListener?.("mousemove", markActivity, { passive: true });
      windowRef.addEventListener?.("keydown", markActivity);
      windowRef.setInterval?.(() => {
        const idleFor = Date.now() - lastActivity;
        const overviewVisible = stage.offsetParent !== null;
        if (idleFor > 9000 && overviewVisible && !btn.classList.contains("is-poked")) {
          btn.classList.remove("is-idle-wiggle");
          void shark.offsetWidth;
          btn.classList.add("is-idle-wiggle");
          windowRef.setTimeout?.(() => btn.classList.remove("is-idle-wiggle"), 1400);
          lastActivity = Date.now();
        }
      }, 4000);
    }

    return true;
  }

  return {
    startTypewriter,
    initSharkInteractions,
    dispose() {
      clearTypewriterTimer();
    }
  };
}
