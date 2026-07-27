// PK 数值题四选项折中方案（用户决策 #6）。
//
// 答案能整体解析为数值（纯数字或正分数）的题目，在对战态渲染
// “真实答案 + 3 个干扰项”的四选项按钮；其余题目维持自由作答框。
// 干扰项参照 src/modules/tools/drills.js makeAnswerOptions 的
// 相对扰动手法（spread = |answer| * 0.12，offset × {0.45,0.7,1,1.35}），
// 但把其中的 Math.random 全部换成以题目 id 为种子的确定性 PRNG，
// 保证刷新/重渲染后选项值与顺序都不会变位。
//
// 点选后的提交仍走现有 api.submit(值) 真实判分路径（见 pkHooks.js），
// 本文件只负责“把哪些值摆上按钮”。

const PLAIN_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;
const POSITIVE_FRACTION_PATTERN = /^\d+\s*\/\s*[1-9]\d*$/;
const OFFSETS = [-2, -1, 1, 2, 3, -3, 4, -4];
const MULTIPLIERS = [0.45, 0.7, 1, 1.35];
const DISTRACTOR_COUNT = 3;

function hashSeed(text) {
  let hash = 2166136261;
  const source = String(text || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// mulberry32 —— 极小的确定性 PRNG，同一种子永远吐出同一序列。
function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(list, rand) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return list;
}

function valueKey(value) {
  return Number(value).toFixed(9);
}

// 与 modules/problemContent.js getLocalizedProblemField(problem,"answer",false)
// 相同的取值优先级，保证按钮上的“真实答案”与查看参考答案一致。
export function resolvePkAnswerText(problem) {
  return String(problem?.answerZh || problem?.answer || problem?.answerEn || "").trim();
}

export function parsePkNumericAnswer(problem) {
  const text = resolvePkAnswerText(problem);
  if (!text) return null;
  if (PLAIN_NUMBER_PATTERN.test(text)) {
    const value = Number(text);
    if (!Number.isFinite(value)) return null;
    return { kind: "decimal", text, value };
  }
  if (POSITIVE_FRACTION_PATTERN.test(text)) {
    const [numeratorText, denominatorText] = text.split("/");
    const numerator = Number(numeratorText.trim());
    const denominator = Number(denominatorText.trim());
    if (!numerator || !denominator) return null;
    return {
      kind: "fraction",
      text: `${numerator}/${denominator}`,
      value: numerator / denominator,
      numerator,
      denominator
    };
  }
  return null;
}

function normalizeDecimalLabel(value, integer, decimals) {
  let label = integer ? String(Math.round(value)) : value.toFixed(decimals);
  if (/^-0(?:\.0+)?$/.test(label)) label = label.slice(1);
  return label;
}

// drills.js makeAnswerOptions 的相对扰动，去随机化：
// spread 沿用 max(minStep, |answer|*0.12 || 6)，offset × 确定性抽取的乘子。
// （drills 固定 min 1，这里对小数把下限放宽到答案自身的小数步长，
// 避免 0.375 这类答案被 ±1 量级的干扰项一眼识破。）
function buildDecimalDistractors(parsed, rand) {
  const answer = parsed.value;
  const integer = !parsed.text.includes(".");
  const decimals = integer ? 0 : Math.min(4, (parsed.text.split(".")[1] || "").length || 1);
  const minStep = integer ? 1 : Math.pow(10, -decimals);
  const spread = Math.max(minStep, Math.abs(answer) * 0.12 || 6);
  const seen = new Set([valueKey(answer)]);
  const labels = [];

  const push = (value) => {
    const label = normalizeDecimalLabel(value, integer, decimals);
    const key = valueKey(Number(label));
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  OFFSETS.forEach((offset) => {
    if (labels.length >= DISTRACTOR_COUNT) return;
    const multiplier = MULTIPLIERS[Math.floor(rand() * MULTIPLIERS.length)];
    push(answer + offset * spread * multiplier);
  });

  let guard = 0;
  while (labels.length < DISTRACTOR_COUNT && guard < 40) {
    guard += 1;
    const step = Math.floor(rand() * 11) - 5;
    push(answer + (step || labels.length + 1) * spread);
  }
  return labels;
}

// 分数答案：先扰动分子（同分母家族最像的干扰项），不够再扰动分母
// （覆盖 1/2 这类分子取值空间太小的答案）。真分数保持真分数。
function buildFractionDistractors(parsed, rand) {
  const { numerator, denominator, value } = parsed;
  const proper = numerator < denominator;
  const numeratorCandidates = [];
  const denominatorCandidates = [];

  OFFSETS.forEach((offset) => {
    const nextNumerator = numerator + offset;
    if (nextNumerator <= 0) return;
    if (proper && nextNumerator >= denominator) return;
    numeratorCandidates.push([nextNumerator, denominator]);
  });
  [-1, 1, 2, -2, 3, -3].forEach((offset) => {
    const nextDenominator = denominator + offset;
    if (nextDenominator < 2) return;
    if (proper && numerator >= nextDenominator) return;
    denominatorCandidates.push([numerator, nextDenominator]);
  });

  shuffleInPlace(numeratorCandidates, rand);
  shuffleInPlace(denominatorCandidates, rand);

  const seen = new Set([valueKey(value)]);
  const labels = [];
  [...numeratorCandidates, ...denominatorCandidates].forEach(([num, den]) => {
    if (labels.length >= DISTRACTOR_COUNT) return;
    const key = valueKey(num / den);
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(`${num}/${den}`);
  });
  return labels;
}

// 返回 [{ id, value, correct }] × 4（顺序已确定性打乱），
// 非数值答案题返回 null → 调用方维持自由作答框。
export function buildPkAnswerOptions(problem) {
  const parsed = parsePkNumericAnswer(problem);
  if (!parsed) return null;
  const rand = mulberry32(hashSeed(`${problem?.id || "pk"}::${parsed.text}`));
  const distractors = parsed.kind === "fraction"
    ? buildFractionDistractors(parsed, rand)
    : buildDecimalDistractors(parsed, rand);
  if (distractors.length < DISTRACTOR_COUNT) return null;

  const options = [
    { value: parsed.text, correct: true },
    ...distractors.slice(0, DISTRACTOR_COUNT).map((label) => ({ value: label, correct: false }))
  ];
  shuffleInPlace(options, rand);
  return options.map((option, index) => ({
    id: `${problem?.id || "pk"}-opt-${index}`,
    value: option.value,
    correct: option.correct
  }));
}
