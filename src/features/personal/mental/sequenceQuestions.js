const DIFFICULTIES = ['easy', 'medium', 'hard'];
const family = (id, type, difficulties, label, labelEn) => Object.freeze({ id, type, difficulties: Object.freeze(difficulties), label, labelEn });

// Original generated exercises: no fixed third-party question bank or external calls.
export const SEQUENCE_FAMILIES = Object.freeze([
  family('arithmetic', 'numbers', ['easy', 'medium'], '等差数列', 'Arithmetic progression'),
  family('geometric', 'numbers', ['easy', 'medium'], '等比数列', 'Geometric progression'),
  family('alternating_steps', 'numbers', ['easy', 'medium'], '交替加减', 'Alternating additions'),
  family('increasing_differences', 'numbers', ['medium', 'hard'], '递增差分', 'Increasing differences'),
  family('interleaved_arithmetic', 'numbers', ['medium', 'hard'], '交错等差数列', 'Interleaved arithmetic progressions'),
  family('fibonacci', 'numbers', ['medium', 'hard'], '前两项相加', 'Sum of the previous two terms'),
  family('affine', 'numbers', ['hard'], '先乘后加', 'Multiply then add'),
  family('squares_offset', 'numbers', ['medium', 'hard'], '平方数加常数', 'Shifted squares'),
  family('cubes_offset', 'numbers', ['hard'], '立方数加常数', 'Shifted cubes'),
  family('alternating_multipliers', 'numbers', ['hard'], '交替倍率', 'Alternating multipliers'),
  family('interleaved_geometric', 'numbers', ['hard'], '交错等比数列', 'Interleaved geometric progressions'),
  family('increasing_multipliers', 'numbers', ['hard'], '递增倍率', 'Increasing multipliers'),
  family('letter_step', 'letters', ['easy', 'medium'], '字母固定步长', 'Constant alphabet steps'),
  family('letter_alternating_steps', 'letters', ['easy', 'medium'], '字母交替步长', 'Alternating alphabet steps'),
  family('letter_increasing_steps', 'letters', ['medium', 'hard'], '字母递增步长', 'Increasing alphabet steps'),
  family('letter_interleaved', 'letters', ['medium', 'hard'], '交错字母序列', 'Interleaved alphabet sequences'),
  family('letter_pairs', 'letters', ['hard'], '双字母独立移动', 'Independent letter pairs'),
  family('letter_mirror', 'letters', ['medium', 'hard'], '镜像字母组', 'Mirror alphabet pairs'),
  family('letter_repeated_step', 'letters', ['easy'], '成对重复字母', 'Repeated alphabet steps'),
]);

function randomTools(rng) {
  const integer = (min, max) => {
    const value = Number(rng());
    const unit = Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
    return min + Math.floor(unit * (max - min + 1));
  };
  return { integer, pick: values => values[integer(0, values.length - 1)] };
}

const alphabet = value => String.fromCharCode(65 + ((value % 26) + 26) % 26);
const signed = value => value >= 0 ? `+${value}` : String(value);
const directionZh = step => `向${step > 0 ? '后' : '前'}移动 ${Math.abs(step)} 个字母`;
const directionEn = step => `move ${Math.abs(step)} letters ${step > 0 ? 'forward' : 'backward'}`;

function makeRule(id, difficulty, length, random) {
  const { integer, pick } = random;
  const hard = difficulty === 'hard';
  const series = initial => {
    const values = [initial];
    return { values, extend: step => { for (let i = 1; i < length; i += 1) values.push(step(values[i - 1], i)); return values; } };
  };
  switch (id) {
    case 'arithmetic': {
      const first = integer(10, 50), step = pick([-1, 1]) * integer(1, difficulty === 'easy' ? 6 : 15);
      return { values: series(first).extend(previous => previous + step),
        zh: `相邻两项的差固定为 ${signed(step)}，每项都在前一项上加 ${step}。`,
        en: `The difference is always ${signed(step)}: add ${step} to the previous term.` };
    }
    case 'geometric': {
      const first = integer(1, 7), multiplier = integer(2, difficulty === 'easy' ? 3 : 4);
      return { values: series(first).extend(previous => previous * multiplier),
        zh: `每一项都是前一项乘以 ${multiplier}。`, en: `Multiply the previous term by ${multiplier} each time.` };
    }
    case 'alternating_steps': {
      const first = integer(8, 45), a = integer(2, 10), b = pick([-1, -2, -3, -4, -5, -6].filter(value => value !== -a));
      return { values: series(first).extend((previous, i) => previous + (i % 2 ? a : b)),
        zh: `从第一项开始，交替加 ${a}、加 ${b}，即 ${signed(a)}、${signed(b)} 两步循环。`,
        en: `Starting after the first term, alternate adding ${a} and ${b}: repeat ${signed(a)}, ${signed(b)}.` };
    }
    case 'increasing_differences': {
      const first = integer(2, 35), initialDifference = (hard ? pick([-1, 1]) : 1) * integer(1, 9), increase = integer(1, hard ? 6 : 3);
      return { values: series(first).extend((previous, i) => previous + initialDifference + (i - 1) * increase),
        zh: `相邻差依次为 ${initialDifference}、${initialDifference + increase}、${initialDifference + 2 * increase}……；差每次增加 ${increase}。`,
        en: `The successive differences are ${initialDifference}, ${initialDifference + increase}, ${initialDifference + 2 * increase}, …; each difference increases by ${increase}.` };
    }
    case 'interleaved_arithmetic': {
      const odd = integer(2, 30), even = integer(40, 80), oddStep = integer(2, hard ? 15 : 8), evenStep = -integer(1, hard ? 12 : 6);
      return { values: Array.from({ length }, (_, i) => i % 2 ? even + Math.floor(i / 2) * evenStep : odd + Math.floor(i / 2) * oddStep),
        zh: `按位置拆成两列：第 1、3、5……项每次加 ${oddStep}；第 2、4、6……项每次加 ${evenStep}。`,
        en: `Separate the positions: terms 1, 3, 5, … add ${oddStep}; terms 2, 4, 6, … add ${evenStep}.` };
    }
    case 'fibonacci': {
      const values = [integer(1, hard ? 20 : 8), integer(1, hard ? 25 : 9)];
      for (let i = 2; i < length; i += 1) values.push(values[i - 1] + values[i - 2]);
      return { values, zh: '从第三项起，每项等于前面两项之和。', en: 'From the third term onward, each term is the sum of the previous two terms.' };
    }
    case 'affine': {
      const first = integer(1, 9), multiplier = integer(2, 3), addition = integer(1, 9);
      return { values: series(first).extend(previous => previous * multiplier + addition),
        zh: `每一步先把前一项乘以 ${multiplier}，再加 ${addition}。`, en: `At each step, multiply the previous term by ${multiplier}, then add ${addition}.` };
    }
    case 'squares_offset': {
      const firstBase = integer(1, hard ? 8 : 5), offset = integer(hard ? -15 : 0, 15);
      return { values: Array.from({ length }, (_, i) => (firstBase + i) ** 2 + offset),
        zh: `依次取 ${firstBase}、${firstBase + 1}、${firstBase + 2}……的平方，再统一加 ${offset}。`,
        en: `Square consecutive integers starting at ${firstBase}, then add ${offset} to each square.` };
    }
    case 'cubes_offset': {
      const firstBase = integer(1, 5), offset = integer(-20, 20);
      return { values: Array.from({ length }, (_, i) => (firstBase + i) ** 3 + offset),
        zh: `依次取 ${firstBase}、${firstBase + 1}、${firstBase + 2}……的立方，再统一加 ${offset}。`,
        en: `Cube consecutive integers starting at ${firstBase}, then add ${offset} to each cube.` };
    }
    case 'alternating_multipliers': {
      const first = integer(1, 8), a = integer(2, 4), b = pick([2, 3, 4].filter(value => value !== a));
      return { values: series(first).extend((previous, i) => previous * (i % 2 ? a : b)),
        zh: `从第一项开始，交替乘以 ${a} 和 ${b}，重复这两步。`,
        en: `Starting after the first term, alternate multiplying by ${a} and ${b}; repeat these two steps.` };
    }
    case 'interleaved_geometric': {
      const odd = integer(1, 9), even = integer(10, 25), a = integer(2, 4), b = pick([2, 3, 4].filter(value => value !== a));
      return { values: Array.from({ length }, (_, i) => i % 2 ? even * b ** Math.floor(i / 2) : odd * a ** Math.floor(i / 2)),
        zh: `按位置拆成两列：第 1、3、5……项每次乘以 ${a}；第 2、4、6……项每次乘以 ${b}。`,
        en: `Separate the positions: terms 1, 3, 5, … multiply by ${a}; terms 2, 4, 6, … multiply by ${b}.` };
    }
    case 'increasing_multipliers': {
      const first = integer(1, 6), initialMultiplier = integer(2, 3);
      return { values: series(first).extend((previous, i) => previous * (initialMultiplier + i - 1)),
        zh: `每一步依次乘以 ${initialMultiplier}、${initialMultiplier + 1}、${initialMultiplier + 2}……；倍率每次增加 1。`,
        en: `Multiply successively by ${initialMultiplier}, ${initialMultiplier + 1}, ${initialMultiplier + 2}, …; the multiplier increases by 1 each time.` };
    }
    case 'letter_step': {
      const first = integer(0, 25), step = pick([-1, 1]) * integer(1, difficulty === 'easy' ? 4 : 7);
      return { values: Array.from({ length }, (_, i) => alphabet(first + i * step)),
        zh: `每次${directionZh(step)}。`, en: `At each step, ${directionEn(step)}.` };
    }
    case 'letter_alternating_steps': {
      const first = integer(0, 25), a = integer(2, 6), b = pick([-1, -2, -3, -4, -5].filter(value => value !== -a));
      return { values: series(first).extend((previous, i) => previous + (i % 2 ? a : b)).map(alphabet),
        zh: `交替${directionZh(a)}、${directionZh(b)}，重复这两步。`,
        en: `Alternate these steps: ${directionEn(a)}, then ${directionEn(b)}.` };
    }
    case 'letter_increasing_steps': {
      const first = integer(0, 25), initialStep = integer(1, hard ? 7 : 4), increase = integer(1, hard ? 4 : 2);
      return { values: series(first).extend((previous, i) => previous + initialStep + (i - 1) * increase).map(alphabet),
        zh: `依次向后移动 ${initialStep}、${initialStep + increase}、${initialStep + 2 * increase}……个字母；步长每次增加 ${increase}。`,
        en: `Move forward by ${initialStep}, ${initialStep + increase}, ${initialStep + 2 * increase}, … letters; increase the step by ${increase} each time.` };
    }
    case 'letter_interleaved': {
      const odd = integer(0, 12), even = integer(13, 25), oddStep = integer(1, hard ? 6 : 3), evenStep = -integer(1, hard ? 5 : 3);
      return { values: Array.from({ length }, (_, i) => alphabet(i % 2 ? even + Math.floor(i / 2) * evenStep : odd + Math.floor(i / 2) * oddStep)),
        zh: `按位置拆成两列：第 1、3、5……项每次${directionZh(oddStep)}；第 2、4、6……项每次${directionZh(evenStep)}。`,
        en: `Separate the positions: terms 1, 3, 5, … ${directionEn(oddStep)}; terms 2, 4, 6, … ${directionEn(evenStep)}.` };
    }
    case 'letter_pairs': {
      const firstA = integer(0, 25), firstB = integer(0, 25), stepA = integer(1, 5), stepB = -integer(1, 5);
      return { values: Array.from({ length }, (_, i) => `${alphabet(firstA + i * stepA)}${alphabet(firstB + i * stepB)}`),
        zh: `每组有两个字母：第一个字母每次${directionZh(stepA)}，第二个字母每次${directionZh(stepB)}。`,
        en: `Track the two letters separately: for the first letter, ${directionEn(stepA)} each time; for the second, ${directionEn(stepB)} each time.` };
    }
    case 'letter_mirror': {
      const first = integer(0, 25), step = integer(1, hard ? 5 : 3);
      return { values: Array.from({ length }, (_, i) => {
        const firstLetter = (first + i * step) % 26;
        return `${alphabet(firstLetter)}${alphabet(25 - firstLetter)}`;
      }), zh: `两个字母按 A↔Z、B↔Y……镜像配对。每组的第一个字母${directionZh(step)}，第二个字母始终取它的镜像。`,
      en: `Pair mirror letters A↔Z, B↔Y, … . For the first letter in each pair, ${directionEn(step)}; the second is always its mirror.` };
    }
    case 'letter_repeated_step': {
      const first = integer(0, 25), step = pick([-1, 1]) * integer(1, 5);
      return { values: Array.from({ length }, (_, i) => alphabet(first + Math.floor(i / 2) * step)),
        zh: `每个字母连续出现两次，再${directionZh(step)}，继续重复两次。`,
        en: `Repeat each letter twice, then ${directionEn(step)} and repeat the new letter twice.` };
    }
    default: throw new Error(`Unknown sequence family: ${id}`);
  }
}

export function generateSequenceQuestion({ difficulty = 'medium', sequenceType = 'mixed' } = {}, { index = 1, now = Date.now(), rng = Math.random } = {}) {
  const level = DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  const random = randomTools(rng);
  const type = ['numbers', 'letters'].includes(sequenceType) ? sequenceType : random.pick(['numbers', 'letters']);
  const selected = random.pick(SEQUENCE_FAMILIES.filter(entry => entry.type === type && entry.difficulties.includes(level)));
  const count = random.integer(6, 8);
  const rule = makeRule(selected.id, level, count + 1, random);
  const tokens = rule.values.slice(0, count).map(String);
  const answer = String(rule.values[count]);
  const letterNote = type === 'letters' ? '字母按 A–Z 循环，Z 后回到 A，A 前回到 Z。' : '';
  const letterNoteEn = type === 'letters' ? ' The alphabet wraps A–Z: after Z comes A, and before A comes Z.' : '';
  return { id: `q${index}`, index, kind: 'sequence', family: selected.id, difficulty: level, tokens, answer,
    explanation: `${rule.zh}${letterNote}下一项为 ${answer}。`,
    explanationEn: `${rule.en}${letterNoteEn} The next term is ${answer}.`,
    startedAt: new Date(now).toISOString(), completedAt: null, elapsedMs: null, outcome: null, submittedAnswer: null, mistakes: [] };
}
