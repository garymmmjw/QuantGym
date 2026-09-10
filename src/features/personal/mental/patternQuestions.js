export const PATTERN_FAMILIES = Object.freeze(['rotation', 'count', 'shape-cycle', 'position', 'union', 'xor']);
export const PATTERN_SHAPES = Object.freeze(['circle', 'triangle', 'square', 'arrow']);
export const PATTERN_FILLS = Object.freeze(['outline', 'solid', 'striped']);
export const PATTERN_DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COUNT_POSITIONS = [[], [4], [3, 5], [3, 4, 5], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const mod = (value, size) => ((value % size) + size) % size;
const randomInt = (size, rng) => Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, Number(rng()) || 0)) * size);
function shuffle(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1, rng);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Every symbol in a cell shares shape/fill/rotation. Positions are row-major 0..8. */
export function validatePatternCell(cell) {
  if (!cell || typeof cell !== 'object' || Array.isArray(cell)
    || Object.keys(cell).length !== 4 || Object.keys(cell).some(key => !['shape', 'fill', 'rotation', 'positions'].includes(key))
    || !PATTERN_SHAPES.includes(cell.shape) || !PATTERN_FILLS.includes(cell.fill)
    || ![0, 90, 180, 270].includes(cell.rotation)
    || (['circle', 'square'].includes(cell.shape) && cell.rotation !== 0)
    || !Array.isArray(cell.positions) || !cell.positions.length || cell.positions.length > 9
    || cell.positions.some((position, index) => !Number.isInteger(position) || position < 0 || position > 8
      || (index > 0 && position <= cell.positions[index - 1]))) throw new Error('Invalid pattern cell.');
  return cell;
}

function cell(shape = 'circle', fill = 'outline', rotation = 0, positions = [4]) {
  return validatePatternCell({ shape, fill, rotation: ['circle', 'square'].includes(shape) ? 0 : mod(rotation, 360), positions: [...new Set(positions)].sort((a, b) => a - b) });
}

/** Visual identity: symmetric shapes never acquire fake rotational differences. */
export function patternCellKey(value) {
  validatePatternCell(value);
  return `${value.shape}|${value.fill}|${value.rotation}|${value.positions.join(',')}`;
}

export function describePatternCell(value, language = 'zh') {
  validatePatternCell(value);
  const en = language === 'en';
  const shapes = en ? { circle: 'circle', triangle: 'triangle', square: 'square', arrow: 'arrow' }
    : { circle: '圆形', triangle: '三角形', square: '正方形', arrow: '箭头' };
  const fills = en ? { outline: 'outline', solid: 'solid', striped: 'striped' } : { outline: '空心', solid: '实心', striped: '条纹' };
  const locations = en ? ['top left', 'top center', 'top right', 'middle left', 'center', 'middle right', 'bottom left', 'bottom center', 'bottom right']
    : ['左上', '上中', '右上', '左中', '中心', '右中', '左下', '下中', '右下'];
  const direction = ['triangle', 'arrow'].includes(value.shape)
    ? (en ? `, pointing ${['up', 'right', 'down', 'left'][value.rotation / 90]}` : `，朝${['上', '右', '下', '左'][value.rotation / 90]}`) : '';
  return en ? `${value.positions.length} ${fills[value.fill]} ${shapes[value.shape]}${value.positions.length > 1 ? 's' : ''}${direction}; positions: ${value.positions.map(position => locations[position]).join(', ')}`
    : `${value.positions.length} 个${fills[value.fill]}${shapes[value.shape]}${direction}；位置：${value.positions.map(position => locations[position]).join('、')}`;
}

function positionSet(left, right, xor = false) {
  return [...new Set([...left, ...right])].filter(position => !xor || left.includes(position) !== right.includes(position)).sort((a, b) => a - b);
}

function buildMatrix(family, difficulty, rng) {
  const hard = difficulty === 'hard';
  const offset = randomInt(3, rng);
  const baseFill = PATTERN_FILLS[difficulty === 'easy' ? randomInt(2, rng) : randomInt(3, rng)];
  const fillAt = (row, col) => hard ? PATTERN_FILLS[mod(offset + 2 * row + col, 3)] : baseFill;
  const matrix = [];
  let explanation, explanationEn;
  if (family === 'rotation') {
    const start = randomInt(4, rng) * 90;
    const direction = difficulty === 'easy' || randomInt(2, rng) ? 90 : -90;
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) matrix.push(cell('arrow', fillAt(row, col), start + row * 90 + col * direction));
    explanation = `每行从左到右，箭头依次${direction > 0 ? '顺' : '逆'}时针旋转 90°；每下一行，起始方向顺时针旋转 90°。`;
    explanationEn = `Across each row, the arrow rotates 90° ${direction > 0 ? 'clockwise' : 'counterclockwise'}. The starting direction rotates 90° clockwise on each new row.`;
  } else if (family === 'count') {
    const start = difficulty === 'easy' ? 1 : 1 + randomInt(2, rng);
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) matrix.push(cell('circle', fillAt(row, col), 0, COUNT_POSITIONS[start + row + col]));
    explanation = '从左向右或从上向下，每移动一格，圆形数量增加 1。右下角应比它左侧和上方都多 1 个。';
    explanationEn = 'Moving one cell right or down adds one circle. The missing cell has one more circle than either its left or upper neighbor.';
  } else if (family === 'shape-cycle') {
    const fillOnly = !hard && difficulty === 'medium' && randomInt(2, rng) === 1;
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) matrix.push(cell(
      fillOnly ? 'circle' : PATTERN_SHAPES[mod(offset + row + col, 3)],
      fillOnly ? PATTERN_FILLS[mod(offset + row + col, 3)] : fillAt(row, col),
    ));
    explanation = fillOnly ? '填充依次按「空心 → 实心 → 条纹 → 空心」循环。每向右或向下移动一格，都前进一项。'
      : '形状依次按「圆形 → 三角形 → 正方形 → 圆形」循环。每向右或向下移动一格，都前进一项。';
    explanationEn = fillOnly ? 'Fill cycles outline → solid → striped → outline. Move one step in the cycle for each cell right or down.'
      : 'Shapes cycle circle → triangle → square → circle. Move one step in the cycle for each cell right or down.';
  } else if (family === 'position') {
    const startRow = difficulty === 'easy' ? 0 : randomInt(3, rng);
    const startCol = difficulty === 'easy' ? 0 : randomInt(3, rng);
    const direction = difficulty === 'easy' || randomInt(2, rng) ? 1 : -1;
    const rotation = randomInt(4, rng) * 90;
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) matrix.push(cell(
      hard ? 'arrow' : 'circle', baseFill, rotation + (row + col) * 90,
      [mod(startRow + row, 3) * 3 + mod(startCol + col * direction, 3)],
    ));
    explanation = `每行从左到右，图形在格内向${direction > 0 ? '右' : '左'}移动一列，越界后回到另一侧；每下一行，格内位置向下移动一行并循环。`;
    explanationEn = `Across a row, the symbol moves one inner column ${direction > 0 ? 'right' : 'left'}, wrapping at the edge. Each new matrix row shifts its inner position one row down, also wrapping.`;
    if (hard) {
      explanation += '同时，每向右或向下移动一格，箭头方向都顺时针旋转 90°。';
      explanationEn += ' At the same time, each move right or down rotates the arrow 90° clockwise.';
    }
  } else {
    const size = difficulty === 'easy' ? 2 : 3;
    for (let row = 0; row < 3; row += 1) {
      // One shared position demonstrates the difference between union and XOR.
      const positions = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rng);
      const left = positions.slice(0, size);
      const right = [positions[0], ...positions.slice(size, size * 2 - 1)];
      [left, right, positionSet(left, right, family === 'xor')].forEach((points, col) => matrix.push(cell('circle', fillAt(row, col), 0, points)));
    }
    explanation = family === 'union' ? '每行第三格是前两格的位置叠加：任一格出现的位置都保留，重合位置只画一个图形。'
      : '每行第三格保留前两格中只出现一次的位置；两格共同出现的位置抵消。这是位置集合的异或。';
    explanationEn = family === 'union' ? 'The third cell of each row is the union of the first two position sets: keep every occupied position, drawing overlaps only once.'
      : 'The third cell keeps positions present in exactly one of the first two cells. Shared positions cancel: the symmetric difference, or XOR, of the position sets.';
  }
  if (hard && family !== 'position') {
    explanation += '同时，填充按「空心 → 实心 → 条纹」循环：每向右前进一项，每向下前进两项。';
    explanationEn += ' Independently, fill cycles outline → solid → striped: one step right advances one fill, and one step down advances two fills.';
  }
  return { matrix, explanation, explanationEn };
}

function answerOptions(correct, matrix, family, difficulty, rng) {
  const preferred = [];
  const add = (changes) => preferred.push(cell(changes.shape ?? correct.shape, changes.fill ?? correct.fill, changes.rotation ?? correct.rotation, changes.positions ?? correct.positions));
  if (family === 'count') COUNT_POSITIONS.slice(1).forEach(positions => add({ positions }));
  if (family === 'rotation') [0, 90, 180, 270].forEach(rotation => add({ rotation }));
  if (family === 'shape-cycle') PATTERN_SHAPES.slice(0, 3).forEach(shape => PATTERN_FILLS.forEach(fill => add({ shape, fill })));
  if (family === 'position') for (let position = 0; position < 9; position += 1) add({ positions: [position] });
  if (['union', 'xor'].includes(family)) {
    [matrix[6].positions, matrix[7].positions, positionSet(matrix[6].positions, matrix[7].positions), positionSet(matrix[6].positions, matrix[7].positions, true)].forEach(positions => add({ positions }));
    for (let position = 0; position < 9; position += 1) {
      const points = correct.positions.includes(position) ? correct.positions.filter(value => value !== position) : [...correct.positions, position];
      if (points.length) add({ positions: points });
    }
  }
  if (difficulty === 'hard' || family === 'rotation') PATTERN_FILLS.forEach(fill => add({ fill }));
  if (difficulty === 'hard' && family === 'position') [0, 90, 180, 270].forEach(rotation => add({ rotation }));
  const correctKey = patternCellKey(correct);
  const unique = new Map();
  const insert = candidate => { const key = patternCellKey(candidate); if (key !== correctKey && !unique.has(key)) unique.set(key, candidate); };
  shuffle(preferred, rng).forEach(insert);
  // Bounded fallback also works with constant or boundary-valued random sources.
  for (let position = 0; position < 9; position += 1) insert(cell(correct.shape, correct.fill, correct.rotation, [position]));
  return shuffle([correct, ...[...unique.values()].slice(0, 5)], rng).map((option, index) => ({ id: LETTERS[index], cell: option }));
}

export function generatePatternQuestion({ difficulty = 'medium' } = {}, { index = 1, now = Date.now(), rng = Math.random } = {}) {
  const level = PATTERN_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  if (!Number.isSafeInteger(index) || index < 1) throw new Error('Pattern question index must be a positive integer.');
  if (typeof rng !== 'function') throw new Error('Pattern random source must be a function.');
  const startedAt = new Date(now).toISOString();
  const family = PATTERN_FAMILIES[randomInt(PATTERN_FAMILIES.length, rng)];
  const { matrix, explanation, explanationEn } = buildMatrix(family, level, rng);
  const correct = matrix[8];
  const options = answerOptions(correct, matrix, family, level, rng);
  return { id: `q${index}`, index, kind: 'pattern', family, difficulty: level,
    grid: [...matrix.slice(0, 8), null], options,
    answer: options.find(option => patternCellKey(option.cell) === patternCellKey(correct)).id,
    explanation, explanationEn, startedAt, completedAt: null, elapsedMs: null,
    outcome: null, submittedAnswer: null, mistakes: [],
  };
}
