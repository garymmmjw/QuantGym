const root = document.documentElement;
const body = document.body;
const themes = ["", "theme-slate", "theme-forest"];
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/";
let themeIndex = 0;
let particleFrame = 0;
let waveFrame = 0;
let inkFrame = 0;
let matrixFrame = 0;

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  setupFilters();
  setupGlobalControls();
  setupKineticWord();
  setupScramble();
  setupTypewriter();
  setupTilt();
  setupRippleButtons();
  setupMagnetButtons();
  setupSpotlight();
  setupSegmentedControl();
  setupStack();
  setupChips();
  setupToast();
  setupImageReveal();
  setupCommandPalette();
  setupAccordion();
  setupElasticSearch();
  setupToggleSwitch();
  setupMiniDock();
  setupCountUp();
  setupRevealObserver();
  setupCanvasEffects();
});

function setupFilters() {
  const buttons = [...document.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll("[data-category]")];
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      cards.forEach((card) => {
        card.classList.toggle("is-hidden", filter !== "all" && card.dataset.category !== filter);
      });
    });
  });
}

function setupGlobalControls() {
  const speed = document.getElementById("speedControl");
  const pause = document.getElementById("pauseAnimations");
  const shuffle = document.getElementById("shuffleTheme");
  const reset = document.getElementById("resetPlayground");

  speed?.addEventListener("input", () => {
    root.style.setProperty("--speed", speed.value);
  });

  pause?.addEventListener("click", () => {
    body.classList.toggle("animations-paused");
    pause.classList.toggle("active", body.classList.contains("animations-paused"));
    pause.innerHTML = body.classList.contains("animations-paused")
      ? '<i data-lucide="play"></i>'
      : '<i data-lucide="pause"></i>';
    if (window.lucide) window.lucide.createIcons();
  });

  shuffle?.addEventListener("click", () => {
    body.classList.remove(...themes.filter(Boolean));
    themeIndex = (themeIndex + 1) % themes.length;
    if (themes[themeIndex]) body.classList.add(themes[themeIndex]);
  });

  reset?.addEventListener("click", () => {
    body.classList.remove("animations-paused", ...themes.filter(Boolean));
    themeIndex = 0;
    if (speed) speed.value = "1";
    root.style.setProperty("--speed", 1);
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === "all");
    });
    document.querySelectorAll("[data-category]").forEach((card) => card.classList.remove("is-hidden"));
    document.querySelectorAll(".flip-card").forEach((card) => card.classList.remove("is-flipped"));
    document.getElementById("commandPalette")?.classList.add("hidden");
    document.getElementById("toggleSwitch")?.classList.remove("is-on");
    if (pause) {
      pause.classList.remove("active");
      pause.innerHTML = '<i data-lucide="pause"></i>';
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

function setupKineticWord() {
  const node = document.querySelector(".kinetic-word");
  if (!node) return;
  const words = String(node.dataset.words || "").split(",").filter(Boolean);
  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % words.length;
    node.classList.remove("is-changing");
    window.requestAnimationFrame(() => {
      node.textContent = words[index];
      node.classList.add("is-changing");
    });
  }, 2300);
}

function setupScramble() {
  const headline = document.getElementById("scrambleHeadline");
  if (headline) {
    headline.addEventListener("click", () => animateScramble(headline, headline.dataset.text, 760));
  }

  document.querySelectorAll("[data-scramble]").forEach((node) => {
    const button = node.closest("button");
    button?.addEventListener("click", () => animateScramble(node, node.dataset.scramble, 620));
  });
}

function animateScramble(node, target, duration = 600) {
  const started = performance.now();
  const original = node.textContent || "";
  const maxLength = Math.max(original.length, target.length);

  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    const locked = Math.floor(progress * maxLength);
    const output = Array.from({ length: maxLength }, (_, index) => {
      if (index < locked) return target[index] || "";
      if (index >= target.length) return "";
      return letters[Math.floor(Math.random() * letters.length)];
    }).join("");
    node.textContent = output;
    if (progress < 1) requestAnimationFrame(frame);
    else node.textContent = target;
  }

  requestAnimationFrame(frame);
}

function setupTypewriter() {
  const node = document.getElementById("typewriter");
  if (!node) return;
  const phrases = [
    "Price risk before it prices you.",
    "Speak the model out loud.",
    "Fast math, calm reasoning.",
    "Turn practice into signal."
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const phrase = phrases[phraseIndex];
    node.textContent = phrase.slice(0, charIndex);
    if (!deleting && charIndex < phrase.length) {
      charIndex += 1;
    } else if (!deleting) {
      deleting = true;
      setTimeout(tick, 900);
      return;
    } else if (charIndex > 0) {
      charIndex -= 1;
    } else {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
    }
    setTimeout(tick, deleting ? 28 : 54);
  }

  tick();
}

function setupTilt() {
  document.querySelectorAll("[data-tilt]").forEach((node) => {
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      node.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });
    node.addEventListener("pointerleave", () => {
      node.style.transform = "";
    });
  });
}

function setupRippleButtons() {
  document.querySelectorAll(".ripple-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    });
  });
}

function setupMagnetButtons() {
  document.querySelectorAll("[data-magnet]").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

function setupSpotlight() {
  document.querySelectorAll("[data-spotlight]").forEach((node) => {
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty("--x", `${x}%`);
      node.style.setProperty("--y", `${y}%`);
    });
  });
}

function setupSegmentedControl() {
  const control = document.getElementById("segmentedControl");
  const state = document.getElementById("segmentState");
  if (!control) return;
  const buttons = [...control.querySelectorAll("button")];
  const indicator = control.querySelector(".segment-indicator");
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      if (indicator) indicator.style.transform = `translateX(${index * 100}%)`;
      if (state) state.textContent = `${button.textContent.trim()} mode`;
    });
  });
}

function setupStack() {
  const stack = document.getElementById("cardStack");
  if (!stack) return;
  stack.addEventListener("click", () => stack.classList.toggle("is-shuffled"));
}

function setupChips() {
  const stage = document.getElementById("chipStage");
  const echo = document.getElementById("chipEcho");
  if (!stage) return;
  stage.querySelectorAll(".topic-chip").forEach((button) => {
    button.addEventListener("click", () => {
      stage.querySelectorAll(".topic-chip").forEach((item) => item.classList.toggle("active", item === button));
      if (echo) echo.textContent = `${button.textContent.trim()} selected`;
    });
  });
}

function setupToast() {
  const button = document.getElementById("toastButton");
  const toast = document.getElementById("toast");
  if (!button || !toast) return;
  button.addEventListener("click", (event) => {
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 1500);
    fireConfetti(event.clientX, event.clientY);
  });
}

function fireConfetti(x, y) {
  const colors = ["#2f6f5e", "#24777b", "#d95f43", "#b98324", "#3e66a5", "#6f5fa8"];
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--dx", `${Math.random() * 220 - 110}px`);
    piece.style.setProperty("--dy", `${Math.random() * 180 + 60}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

function setupImageReveal() {
  const reveal = document.getElementById("imageReveal");
  const input = reveal?.querySelector("input");
  input?.addEventListener("input", () => {
    reveal.style.setProperty("--split", `${input.value}%`);
  });
}

function setupCommandPalette() {
  const open = document.getElementById("openCommandPalette");
  const close = document.getElementById("closeCommandPalette");
  const palette = document.getElementById("commandPalette");
  if (!open || !palette) return;
  open.addEventListener("click", () => {
    palette.classList.remove("hidden");
    palette.querySelector("input")?.focus();
  });
  close?.addEventListener("click", () => palette.classList.add("hidden"));
  palette.querySelectorAll("button:not(#closeCommandPalette)").forEach((button) => {
    button.addEventListener("click", () => {
      button.animate([
        { transform: "translateX(0)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" }
      ], { duration: 180, easing: "ease-out" });
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") palette.classList.add("hidden");
  });
}

function setupAccordion() {
  const stage = document.getElementById("accordionStage");
  if (!stage) return;
  stage.querySelectorAll(".accordion-item").forEach((item) => {
    item.addEventListener("click", () => {
      stage.querySelectorAll(".accordion-item").forEach((button) => button.classList.toggle("active", button === item));
    });
  });
}

function setupElasticSearch() {
  const input = document.getElementById("elasticSearchInput");
  const echo = document.getElementById("elasticSearchEcho");
  if (!input || !echo) return;
  input.addEventListener("input", () => {
    const value = input.value.trim();
    echo.textContent = value ? `query: ${value}` : "ready";
  });
}

function setupToggleSwitch() {
  const toggle = document.getElementById("toggleSwitch");
  const label = document.getElementById("toggleSwitchLabel");
  if (!toggle || !label) return;
  toggle.addEventListener("click", () => {
    const isOn = toggle.classList.toggle("is-on");
    toggle.setAttribute("aria-pressed", String(isOn));
    label.textContent = isOn ? "Focus mode on" : "Focus mode off";
  });
}

function setupMiniDock() {
  const dock = document.getElementById("miniDock");
  if (!dock) return;
  const buttons = [...dock.querySelectorAll("button")];
  dock.addEventListener("pointermove", (event) => {
    buttons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(event.clientX - center);
      const scale = Math.max(1, 1.62 - distance / 120);
      button.style.setProperty("--dock-scale", scale.toFixed(2));
    });
  });
  dock.addEventListener("pointerleave", () => {
    buttons.forEach((button) => button.style.setProperty("--dock-scale", "1"));
  });
}

function setupCountUp() {
  const counters = [...document.querySelectorAll(".count-up")];
  const run = (node) => {
    const target = Number(node.dataset.target || 0);
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / 1100);
      node.textContent = String(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  counters.forEach((counter) => observer.observe(counter));
}

function setupRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal-in").forEach((node) => observer.observe(node));
}

function setupCanvasEffects() {
  setupParticleCanvas();
  setupWaveCanvas();
  setupInkCanvas();
  setupMatrixCanvas();
}

function setupParticleCanvas() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const pointer = { x: -9999, y: -9999 };
  const particles = Array.from({ length: 64 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0018,
    vy: (Math.random() - 0.5) * 0.0018,
    r: Math.random() * 2 + 1.4
  }));

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  function draw() {
    const speed = Number(getComputedStyle(root).getPropertyValue("--speed")) || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#17211f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.x += particle.vx * speed;
      particle.y += particle.vy * speed;
      if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
      if (particle.y < 0 || particle.y > 1) particle.vy *= -1;

      const px = particle.x * canvas.width;
      const py = particle.y * canvas.height;
      const dx = px - pointer.x;
      const dy = py - pointer.y;
      const distance = Math.hypot(dx, dy);
      const push = distance < 80 ? (80 - distance) / 80 : 0;
      const drawX = px + (dx / Math.max(distance, 1)) * push * 24;
      const drawY = py + (dy / Math.max(distance, 1)) * push * 24;

      ctx.beginPath();
      ctx.fillStyle = particle.r > 2.4 ? "#ffd56a" : "#6ee2bb";
      ctx.arc(drawX, drawY, particle.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.lineWidth = 1;
    particles.forEach((a, index) => {
      const ax = a.x * canvas.width;
      const ay = a.y * canvas.height;
      particles.slice(index + 1).forEach((b) => {
        const bx = b.x * canvas.width;
        const by = b.y * canvas.height;
        const distance = Math.hypot(ax - bx, ay - by);
        if (distance > 92) return;
        ctx.strokeStyle = `rgba(110, 226, 187, ${1 - distance / 92})`;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      });
    });

    particleFrame = requestAnimationFrame(draw);
  }

  cancelAnimationFrame(particleFrame);
  draw();
}

function setupWaveCanvas() {
  const canvas = document.getElementById("waveCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let tick = 0;

  function drawWave(color, amplitude, offset, width) {
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 8) {
      const y = canvas.height / 2 + Math.sin((x + tick + offset) * 0.026) * amplitude + Math.cos((x + tick * 0.6) * 0.014) * 18;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function draw() {
    const speed = Number(getComputedStyle(root).getPropertyValue("--speed")) || 1;
    tick += 1.7 * speed;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#17211f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWave("rgba(110, 226, 187, 0.9)", 34, 0, 3);
    drawWave("rgba(255, 213, 106, 0.76)", 24, 90, 2);
    drawWave("rgba(255, 139, 111, 0.68)", 42, 180, 2);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    for (let x = 24; x < canvas.width; x += 64) {
      const y = canvas.height / 2 + Math.sin((x + tick) * 0.026) * 34;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    waveFrame = requestAnimationFrame(draw);
  }

  cancelAnimationFrame(waveFrame);
  draw();
}

function setupInkCanvas() {
  const canvas = document.getElementById("inkCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const points = [];
  let autoTick = 0;

  function addPoint(x, y, radius = 18) {
    points.push({ x, y, radius, life: 1 });
    if (points.length > 90) points.shift();
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    addPoint(
      ((event.clientX - rect.left) / rect.width) * canvas.width,
      ((event.clientY - rect.top) / rect.height) * canvas.height,
      24
    );
  });

  function draw() {
    const speed = Number(getComputedStyle(root).getPropertyValue("--speed")) || 1;
    autoTick += 0.028 * speed;
    const autoX = canvas.width / 2 + Math.cos(autoTick * 2.2) * 180;
    const autoY = canvas.height / 2 + Math.sin(autoTick * 3) * 82;
    addPoint(autoX, autoY, 15);

    ctx.fillStyle = "rgba(23, 33, 31, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    points.forEach((point) => {
      point.life -= 0.016 * speed;
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius);
      gradient.addColorStop(0, `rgba(255, 213, 106, ${Math.max(point.life, 0)})`);
      gradient.addColorStop(0.5, `rgba(110, 226, 187, ${Math.max(point.life * 0.45, 0)})`);
      gradient.addColorStop(1, "rgba(110, 226, 187, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (points[index].life <= 0) points.splice(index, 1);
    }
    inkFrame = requestAnimationFrame(draw);
  }

  cancelAnimationFrame(inkFrame);
  ctx.fillStyle = "#17211f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  draw();
}

function setupMatrixCanvas() {
  const canvas = document.getElementById("matrixCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const glyphs = "010101EVBSMLQP";
  const columnWidth = 18;
  const columns = Math.ceil(canvas.width / columnWidth);
  const drops = Array.from({ length: columns }, () => Math.random() * -canvas.height);

  function draw() {
    const speed = Number(getComputedStyle(root).getPropertyValue("--speed")) || 1;
    ctx.fillStyle = "rgba(23, 33, 31, 0.16)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, monospace";

    drops.forEach((drop, index) => {
      const x = index * columnWidth;
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillStyle = Math.random() > 0.82 ? "#ffd56a" : "#6ee2bb";
      ctx.fillText(glyph, x, drop);
      drops[index] += (8 + Math.random() * 5) * speed;
      if (drops[index] > canvas.height + 30) drops[index] = Math.random() * -140;
    });

    matrixFrame = requestAnimationFrame(draw);
  }

  cancelAnimationFrame(matrixFrame);
  ctx.fillStyle = "#17211f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  draw();
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}
