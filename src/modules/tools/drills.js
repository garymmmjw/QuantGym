import { formatNumber } from "../../lib/number.js";
import { randomChoice, randomInt } from "../../lib/random.js";

export function makeDrill(mode) {
  if (mode === "numberLogic") return makeNumberLogicDrill();
  if (mode === "arithmetic") return makeArithmeticDrill();
  if (mode === "square") {
    const n = randomInt(12, 45);
    const answer = n * n;
    return makeChoiceDrill(`${n}² = ?`, answer, `${n}² = ${answer}`, { spread: Math.max(8, n), integer: true });
  }
  if (mode === "ev") {
    const p = randomChoice([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75]);
    const win = randomInt(20, 90);
    const lose = randomInt(5, 35);
    const answer = p * win - (1 - p) * lose;
    return makeChoiceDrill(`${Math.round(p * 100)}% win ${win}, otherwise lose ${lose}. EV = ?`, answer, `${p} x ${win} - ${formatNumber(1 - p)} x ${lose}`, { spread: 8, tolerance: 0.15 });
  }
  const base = randomInt(40, 240);
  const pct = randomChoice([5, 8, 10, 12, 15, 18, 20, 25, 30, 35]);
  const direction = Math.random() > 0.5 ? "increase" : "decrease";
  const answer = direction === "increase" ? base * (1 + pct / 100) : base * (1 - pct / 100);
  const word = direction === "increase" ? "up" : "down";
  return makeChoiceDrill(`${base} ${word} ${pct}% = ?`, answer, `${base} x ${formatNumber(direction === "increase" ? 1 + pct / 100 : 1 - pct / 100)}`, { spread: Math.max(5, base * 0.08), tolerance: 0.1 });
}

function makeNumberLogicDrill() {
  const type = randomChoice(["arithmetic", "geometric", "alternating", "fibonacci"]);
  let sequence = [];
  let answer = 0;
  let explain = "";
  if (type === "geometric") {
    const start = randomChoice([1, 2, 3, 4, 5]);
    const ratio = randomChoice([2, 3, 4]);
    sequence = Array.from({ length: 5 }, (_, index) => start * ratio ** index);
    answer = start * ratio ** 5;
    explain = `Multiply by ${ratio}.`;
  } else if (type === "alternating") {
    const start = randomInt(8, 24);
    const up = randomInt(4, 12);
    const down = randomInt(1, 5);
    sequence = [start];
    for (let index = 1; index < 6; index += 1) {
      sequence.push(sequence[index - 1] + (index % 2 ? up : -down));
    }
    answer = sequence.pop();
    explain = `Alternate +${up}, -${down}.`;
  } else if (type === "fibonacci") {
    const a = randomInt(1, 6);
    const b = randomInt(2, 9);
    sequence = [a, b];
    while (sequence.length < 6) sequence.push(sequence.at(-1) + sequence.at(-2));
    answer = sequence.pop();
    explain = "Each value is the sum of the previous two.";
  } else {
    const start = randomInt(2, 28);
    const step = randomInt(2, 13);
    sequence = Array.from({ length: 5 }, (_, index) => start + step * index);
    answer = start + step * 5;
    explain = `Add ${step} each step.`;
  }
  return makeChoiceDrill(`${sequence.join("   ")}   ?`, answer, explain, { spread: Math.max(6, Math.abs(answer) * 0.2), integer: true });
}

function makeArithmeticDrill() {
  const type = randomChoice(["multiply", "divide", "add", "fraction"]);
  if (type === "divide") {
    const divisor = randomInt(3, 12);
    const answer = randomInt(8, 36);
    const dividend = divisor * answer;
    return makeChoiceDrill(`${dividend} ÷ ${divisor} = ?`, answer, `${divisor} x ${answer} = ${dividend}`, { spread: 8, integer: true });
  }
  if (type === "fraction") {
    const denominator = randomChoice([4, 5, 8, 10, 12, 16]);
    const numerator = randomInt(1, denominator - 1);
    const base = randomChoice([80, 96, 120, 160, 200, 240]);
    const answer = (base * numerator) / denominator;
    return makeChoiceDrill(`${numerator}/${denominator} of ${base} = ?`, answer, `${base} ÷ ${denominator} x ${numerator}`, { spread: 10, tolerance: 0.1 });
  }
  if (type === "add") {
    const a = randomInt(120, 980);
    const b = randomInt(80, 760);
    const sign = Math.random() > 0.45 ? "+" : "-";
    const answer = sign === "+" ? a + b : a - b;
    return makeChoiceDrill(`${a} ${sign} ${b} = ?`, answer, `${a} ${sign} ${b}`, { spread: 30, integer: true });
  }
  const a = randomInt(11, 29);
  const b = randomInt(6, 24);
  const answer = a * b;
  return makeChoiceDrill(`${a} × ${b} = ?`, answer, `${a} x ${b} = ${answer}`, { spread: 18, integer: true });
}

function makeChoiceDrill(question, answer, explain, options = {}) {
  const tolerance = options.tolerance ?? 0;
  return {
    question,
    answer,
    tolerance,
    explain,
    options: makeAnswerOptions(answer, options),
    answered: false,
    selected: null,
    feedback: ""
  };
}

function makeAnswerOptions(answer, options = {}) {
  const integer = options.integer !== false && Math.abs(answer - Math.round(answer)) < 0.001;
  const spread = Math.max(1, Number(options.spread || Math.abs(answer) * 0.12 || 6));
  const normalize = (value) => integer ? Math.round(value) : Number(value.toFixed(1));
  const values = new Set([String(normalize(answer))]);
  const offsets = [-2, -1, 1, 2, 3, -3, 4, -4];
  offsets.forEach((offset) => {
    if (values.size >= 5) return;
    values.add(String(normalize(answer + offset * spread * randomChoice([0.45, 0.7, 1, 1.35]))));
  });
  while (values.size < 5) {
    values.add(String(normalize(answer + randomInt(-5, 5) * spread || answer + values.size + 1)));
  }
  return [...values].map(Number).sort(() => Math.random() - 0.5).slice(0, 5);
}

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
