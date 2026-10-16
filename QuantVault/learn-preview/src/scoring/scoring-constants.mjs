// Audited public constants; source: captures/learn-2026-10-15/scoring/recommender.js:12-83.

const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export const TOPICS = freeze(['probability','expectation','coding','statistics','combinatorics','regression',
    'optimization','options-pricing','game-theory','finance','machine-learning','linear-algebra',
    'time-series','brain-teaser','random-variables','market-microstructure','stochastic-process']);

export const B = freeze({ easy: -0.5, medium: -0.1, hard: 0.5 });

export const K_SRC = freeze({ onboarding: 0.9, solve: 0.9, mcq: 0.85, selfrate: 0.5, status: 0.2 });

export const MIN_EVIDENCE = freeze(3);

export const LEVEL_TARGET = freeze({ beginner: -0.3, undergrad: 0.3, graduate: 0.8, phd: 1.1 });

export const ROLE_REL = freeze({
    qt: { probability:1, expectation:1, 'game-theory':1, 'brain-teaser':0.8, 'market-microstructure':0.8,
          'options-pricing':0.7, combinatorics:0.6, 'random-variables':0.6, optimization:0.5, statistics:0.4, finance:0.5 },
    qr: { statistics:1, regression:1, probability:1, 'machine-learning':0.9, 'linear-algebra':0.9,
          'time-series':0.8, 'stochastic-process':0.7, expectation:0.7, optimization:0.6, 'random-variables':0.6 },
    qd: { coding:1, 'linear-algebra':0.8, optimization:0.7, 'machine-learning':0.7, probability:0.6, statistics:0.5, combinatorics:0.5 },
    unsure: { probability:0.8, statistics:0.7, 'brain-teaser':0.7, expectation:0.7, combinatorics:0.6, coding:0.6, 'linear-algebra':0.6 }
  });

export const MACRO = freeze({
    prob: ['probability','expectation','statistics','combinatorics','random-variables'],
    la:   ['linear-algebra'],
    prog: ['coding'],
    fin:  ['options-pricing','finance','market-microstructure']
  });

export const RATE = freeze({ shaky: { x:0, b:0 }, ok: { x:0.6, b:0 }, strong: { x:1, b:0.5 } });

export const INTRINSIC = freeze({
    probability:1.0, expectation:0.9, statistics:0.85,
    'random-variables':0.7, combinatorics:0.7, 'linear-algebra':0.7, coding:0.7,
    regression:0.6, 'brain-teaser':0.6,
    'game-theory':0.55, optimization:0.55, 'machine-learning':0.55, 'stochastic-process':0.55,
    'options-pricing':0.5, finance:0.45, 'time-series':0.45, 'market-microstructure':0.4
  });

export const GAMMA = freeze(0.35);

export const CROSS_MASS = freeze(0.25);

export const TAG_TOPIC = freeze({
    'expected-value':'expectation','indicator-variables':'expectation','linearity-of-expectation':'expectation','expectation':'expectation',
    'discrete-probability':'probability','conditional-probability':'probability','uniform-distribution':'probability','joint-distribution':'probability',
    'binomial-distribution':'probability','geometric-distribution':'probability','geometric-probability':'probability','dice':'probability',
    'variance':'statistics','hypothesis-testing':'statistics','order-statistics':'statistics','bayes-theorem':'statistics','normal-distribution':'statistics',
    'maximum-likelihood':'statistics','correlation':'statistics','estimation':'statistics',
    'transformation-of-variables':'random-variables',
    'combinatorics':'combinatorics','generating-functions':'combinatorics','inclusion-exclusion':'combinatorics','counting':'combinatorics',
    'regression':'regression',
    'data-structures':'coding','divide-and-conquer':'coding','dynamic-programming':'coding','complexity-analysis':'coding','sorting-searching':'coding',
    'two-pointers-sliding':'coding','greedy':'coding','string-algorithms':'coding','graph-algorithms':'coding','backtracking':'coding','arrays':'coding',
    'convex-optimization':'optimization','optimization':'optimization',
    'matrix-operations':'linear-algebra','eigenvalues':'linear-algebra','linear-systems':'linear-algebra','pca-svd':'linear-algebra',
    'game-theory':'game-theory',
    'time-series':'time-series',
    'market-microstructure':'market-microstructure',
    'portfolio-theory':'finance','fixed-income':'finance',
    'put-call-parity':'options-pricing','black-scholes':'options-pricing','greeks':'options-pricing','volatility':'options-pricing',
    'classification':'machine-learning','cross-validation':'machine-learning','regularization':'machine-learning','feature-engineering':'machine-learning','neural-networks':'machine-learning',
    'first-passage-time':'stochastic-process','markov-chains':'stochastic-process','stochastic-calculus':'stochastic-process','random-walk':'stochastic-process',
    'poisson-process':'stochastic-process','martingale':'stochastic-process','optimal-stopping':'stochastic-process'
  });

export const ROLE_LABELS = freeze({ qt: 'Quant Trader', qr: 'Quant Researcher', qd: 'Quant Developer', unsure: 'Quant' });

export const ROLE_CORE = freeze({
    qt: { probability:1, expectation:1, 'game-theory':1, 'brain-teaser':1, 'market-microstructure':1, 'options-pricing':1 },
    qr: { statistics:1, regression:1, probability:1, 'machine-learning':1, 'linear-algebra':1, 'time-series':1 },
    qd: { coding:1, 'linear-algebra':1, optimization:1, 'machine-learning':1 },
    unsure: {}
  });

export const TOPIC_LABELS = freeze(Object.fromEntries(TOPICS.map(t => [t, t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')])));
