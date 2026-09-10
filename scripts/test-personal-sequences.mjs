import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSequenceQuestion, SEQUENCE_FAMILIES } from '../src/features/personal/mental/sequenceQuestions.js';

const now = Date.parse('2026-09-10T12:00:00.000Z');
function seeded(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
const mod = value => ((value % 26) + 26) % 26;
const letter = value => value.charCodeAt(0) - 65;
const differences = values => values.slice(1).map((value, index) => value - values[index]);
const ratios = values => values.slice(1).map((value, index) => value / values[index]);
const constant = values => assert.ok(values.every(value => value === values[0]), JSON.stringify(values));
const alternating = values => { assert.notEqual(values[0], values[1]); values.forEach((value, index) => assert.equal(value, values[index % 2])); };
const parity = (values, index) => values.filter((_, position) => position % 2 === index);
const directionSteps = explanation => [...explanation.matchAll(/move (\d+) letters (forward|backward)/g)].map(match => Number(match[1]) * (match[2] === 'forward' ? 1 : -1));

// Reconstruct each law from the visible terms, then verify the held-out answer.
// The explanation parameters are checked separately so a correct answer with a wrong explanation also fails.
function verifyRule(question) {
  const strings = [...question.tokens, question.answer];
  const values = strings.map(Number);
  const text = question.explanationEn;
  switch (question.family) {
    case 'arithmetic': {
      const delta = differences(values);
      constant(delta);
      assert.equal(Number(text.match(/add (-?\d+) to/)[1]), delta[0]);
      break;
    }
    case 'geometric': {
      const factors = ratios(values);
      constant(factors);
      assert.equal(Number(text.match(/by (\d+) each/)[1]), factors[0]);
      break;
    }
    case 'alternating_steps': {
      const delta = differences(values);
      alternating(delta);
      const rule = text.match(/adding (-?\d+) and (-?\d+)/);
      assert.deepEqual(rule.slice(1).map(Number), delta.slice(0, 2));
      break;
    }
    case 'increasing_differences': {
      const delta = differences(values), increase = differences(delta);
      constant(increase);
      assert.equal(Number(text.match(/increases by (\d+)/)[1]), increase[0]);
      assert.ok(text.includes(`are ${delta[0]}, ${delta[1]}, ${delta[2]},`));
      break;
    }
    case 'interleaved_arithmetic': {
      const odd = differences(parity(values, 0)), even = differences(parity(values, 1));
      constant(odd); constant(even);
      assert.deepEqual([...text.matchAll(/add (-?\d+)/g)].map(match => Number(match[1])), [odd[0], even[0]]);
      break;
    }
    case 'fibonacci':
      for (let index = 2; index < values.length; index += 1) assert.equal(values[index], values[index - 1] + values[index - 2]);
      assert.ok(text.includes('sum of the previous two terms'));
      break;
    case 'affine': {
      const delta = differences(values), multiplier = delta[1] / delta[0];
      constant(ratios(delta));
      const offset = values[1] - values[0] * multiplier;
      for (let index = 1; index < values.length; index += 1) assert.equal(values[index], values[index - 1] * multiplier + offset);
      const rule = text.match(/by (\d+), then add (\d+)/);
      assert.deepEqual(rule.slice(1).map(Number), [multiplier, offset]);
      break;
    }
    case 'squares_offset': {
      const second = differences(differences(values));
      assert.ok(second.every(value => value === 2));
      const firstBase = (values[1] - values[0] - 1) / 2;
      assert.ok(Number.isInteger(firstBase));
      const offset = values[0] - firstBase ** 2;
      assert.ok(values.every((value, index) => value === (firstBase + index) ** 2 + offset));
      assert.ok(text.includes(`starting at ${firstBase}, then add ${offset}`));
      break;
    }
    case 'cubes_offset': {
      assert.ok(differences(differences(differences(values))).every(value => value === 6));
      const firstBase = Array.from({ length: 20 }, (_, index) => index).find(candidate => (candidate + 1) ** 3 - candidate ** 3 === values[1] - values[0]);
      assert.notEqual(firstBase, undefined);
      const offset = values[0] - firstBase ** 3;
      assert.ok(values.every((value, index) => value === (firstBase + index) ** 3 + offset));
      assert.ok(text.includes(`starting at ${firstBase}, then add ${offset}`));
      break;
    }
    case 'alternating_multipliers': {
      const factors = ratios(values);
      alternating(factors);
      assert.deepEqual(text.match(/by (\d+) and (\d+)/).slice(1).map(Number), factors.slice(0, 2));
      break;
    }
    case 'interleaved_geometric': {
      const odd = ratios(parity(values, 0)), even = ratios(parity(values, 1));
      constant(odd); constant(even);
      assert.deepEqual([...text.matchAll(/multiply by (\d+)/g)].map(match => Number(match[1])), [odd[0], even[0]]);
      break;
    }
    case 'increasing_multipliers': {
      const factors = ratios(values);
      assert.ok(differences(factors).every(value => value === 1));
      assert.ok(text.includes(`by ${factors[0]}, ${factors[1]}, ${factors[2]},`));
      break;
    }
    case 'letter_step': {
      const steps = differences(strings.map(letter)).map(mod);
      constant(steps);
      assert.equal(mod(directionSteps(text)[0]), steps[0]);
      break;
    }
    case 'letter_alternating_steps': {
      const steps = differences(strings.map(letter)).map(mod);
      alternating(steps);
      assert.deepEqual(directionSteps(text).map(mod), steps.slice(0, 2));
      break;
    }
    case 'letter_increasing_steps': {
      const steps = differences(strings.map(letter)).map(mod), increase = differences(steps).map(mod);
      constant(increase);
      assert.equal(Number(text.match(/step by (\d+)/)[1]), increase[0]);
      assert.ok(text.includes(`by ${steps[0]}, ${steps[1]}, ${steps[2]},`));
      break;
    }
    case 'letter_interleaved': {
      const odd = differences(parity(strings.map(letter), 0)).map(mod), even = differences(parity(strings.map(letter), 1)).map(mod);
      constant(odd); constant(even);
      assert.deepEqual(directionSteps(text).map(mod), [odd[0], even[0]]);
      break;
    }
    case 'letter_pairs': {
      const first = differences(strings.map(value => letter(value[0]))).map(mod);
      const second = differences(strings.map(value => letter(value[1]))).map(mod);
      constant(first); constant(second);
      assert.deepEqual(directionSteps(text).map(mod), [first[0], second[0]]);
      break;
    }
    case 'letter_mirror': {
      assert.ok(strings.every(value => letter(value[0]) + letter(value[1]) === 25));
      const steps = differences(strings.map(value => letter(value[0]))).map(mod);
      constant(steps);
      assert.equal(mod(directionSteps(text)[0]), steps[0]);
      assert.ok(text.includes('mirror letters A↔Z, B↔Y'));
      break;
    }
    case 'letter_repeated_step': {
      strings.forEach((value, index) => { if (index % 2) assert.equal(value, strings[index - 1]); });
      const steps = differences(parity(strings.map(letter), 0)).map(mod);
      constant(steps);
      assert.equal(mod(directionSteps(text)[0]), steps[0]);
      assert.ok(text.includes('Repeat each letter twice'));
      break;
    }
    default: assert.fail(`Missing independent verifier for ${question.family}`);
  }
  assert.ok(question.explanation.endsWith(`下一项为 ${question.answer}。`));
  assert.ok(question.explanationEn.endsWith(`The next term is ${question.answer}.`));
}

test('all three difficulties and both types generate valid sequences independently consistent with their explanations', () => {
  const rng = seeded(42), seen = new Set();
  for (const difficulty of ['easy', 'medium', 'hard']) for (const sequenceType of ['numbers', 'letters']) {
    for (let index = 1; index <= 400; index += 1) {
      const question = generateSequenceQuestion({ difficulty, sequenceType }, { index, now, rng });
      assert.equal(question.id, `q${index}`);
      assert.equal(question.index, index);
      assert.equal(question.kind, 'sequence');
      assert.equal(question.difficulty, difficulty);
      assert.ok(question.tokens.length >= 6 && question.tokens.length <= 8);
      assert.equal(question.startedAt, '2026-09-10T12:00:00.000Z');
      assert.equal(question.completedAt, null);
      assert.equal(question.elapsedMs, null);
      assert.equal(question.outcome, null);
      assert.equal(question.submittedAnswer, null);
      assert.deepEqual(question.mistakes, []);
      const metadata = SEQUENCE_FAMILIES.find(entry => entry.id === question.family);
      assert.equal(metadata.type, sequenceType);
      assert.ok(metadata.difficulties.includes(difficulty));
      for (const token of [...question.tokens, question.answer]) {
        assert.equal(typeof token, 'string');
        if (sequenceType === 'numbers') {
          assert.match(token, /^-?\d+$/);
          assert.ok(Number.isSafeInteger(Number(token)) && Math.abs(Number(token)) <= 20_000_000);
        } else assert.match(token, /^[A-Z]{1,2}$/);
      }
      if (sequenceType === 'letters') {
        assert.ok(question.explanation.includes('A–Z 循环'));
        assert.ok(question.explanationEn.includes('after Z comes A, and before A comes Z'));
      }
      verifyRule(question);
      seen.add(question.family);
    }
  }
  assert.deepEqual([...seen].sort(), SEQUENCE_FAMILIES.map(entry => entry.id).sort());
  assert.ok(seen.size >= 12);
});

test('mixed mode samples numeric and alphabet families evenly at each difficulty', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const rng = seeded(953), counts = { numbers: 0, letters: 0 };
    for (let index = 1; index <= 1200; index += 1) {
      const question = generateSequenceQuestion({ difficulty, sequenceType: 'mixed' }, { index, now, rng });
      counts[SEQUENCE_FAMILIES.find(entry => entry.id === question.family).type] += 1;
    }
    assert.ok(counts.numbers > 500 && counts.numbers < 700, JSON.stringify({ difficulty, counts }));
    assert.equal(counts.numbers + counts.letters, 1200);
  }
});

test('fresh parameters and lengths provide substantial variation rather than cycling a small fixed question list', () => {
  for (const sequenceType of ['numbers', 'letters']) {
    const rng = seeded(918273), unique = new Set(), lengths = new Set();
    for (let index = 1; index <= 600; index += 1) {
      const question = generateSequenceQuestion({ difficulty: 'easy', sequenceType }, { index, now, rng });
      unique.add(`${question.family}:${question.tokens.join(',')}:${question.answer}`);
      lengths.add(question.tokens.length);
    }
    assert.ok(unique.size >= 400, `${sequenceType}: ${unique.size} unique questions`);
    assert.deepEqual([...lengths].sort(), [6, 7, 8]);
  }
});

test('seeded generation is reproducible, consumes no global randomness, and leaves frozen settings untouched', () => {
  const settings = Object.freeze({ difficulty: 'hard', sequenceType: 'mixed' });
  const firstOptions = Object.freeze({ index: 19, now, rng: seeded(991) });
  const secondOptions = Object.freeze({ index: 19, now, rng: seeded(991) });
  const before = JSON.stringify(settings);
  assert.deepEqual(generateSequenceQuestion(settings, firstOptions), generateSequenceQuestion(settings, secondOptions));
  assert.equal(JSON.stringify(settings), before);
  assert.ok(Object.isFrozen(SEQUENCE_FAMILIES));
  assert.ok(SEQUENCE_FAMILIES.every(entry => Object.isFrozen(entry) && Object.isFrozen(entry.difficulties)));
});

test('bounded RNG endpoints cannot cause an invalid family, infinite retry loop or out-of-range answer', () => {
  for (const sample of [0, 1, -1, 10, NaN, Infinity]) for (const difficulty of ['easy', 'medium', 'hard']) for (const sequenceType of ['numbers', 'letters', 'mixed']) {
    const question = generateSequenceQuestion({ difficulty, sequenceType }, { now, rng: () => sample });
    assert.ok(question.tokens.length >= 6 && question.tokens.length <= 8);
    verifyRule(question);
  }
});

test('invalid option names use the documented defaults and each question owns fresh mutable result arrays', () => {
  const first = generateSequenceQuestion({ difficulty: 'unknown', sequenceType: 'unknown' }, { now, rng: seeded(10) });
  const second = generateSequenceQuestion({}, { now, rng: seeded(10) });
  assert.deepEqual(first, second);
  first.tokens[0] = 'CHANGED';
  first.mistakes.push({ value: 'not an answer' });
  assert.notEqual(first.tokens[0], second.tokens[0]);
  assert.deepEqual(second.mistakes, []);
});
