export const STORAGE_KEY = "quantMemoryBoard.v1";
export const AUTH_KEY = "quantMemoryBoard.auth.v1";
export const USER_STATE_PREFIX = "quantMemoryBoard.userState.v1";
export const LLM_CONFIG_KEY = "quantMemoryBoard.llm.v1";
export const PENDING_CAPTURE_KEY = "quantMemoryBoard.pendingCapture.v1";
export const APP_PREFS_KEY = "quantMemoryBoard.preferences.v1";
export const COMMUNITY_KEY = "quantMemoryBoard.community.v1";
export const CLOUD_CONFIG_KEY = "quantMemoryBoard.cloud.v1";
export const SUPPORTED_LANGUAGES = ["zh", "en"];
export const DEFAULT_LANGUAGE = "zh";
export const RUNTIME_CONFIG = globalThis.QUANTGYM_CONFIG || {};
export const DEFAULT_LLM_ENDPOINT = String(RUNTIME_CONFIG.llmEndpoint || "http://127.0.0.1:8787/interview").trim();
export const DEFAULT_LLM_MODEL = String(RUNTIME_CONFIG.llmModel || "gpt-5-nano").trim();
export const DEFAULT_GOOGLE_CLIENT_ID = String(RUNTIME_CONFIG.googleClientId || "").trim();
export const GOOGLE_LOGIN_FLAG = String(RUNTIME_CONFIG.googleLoginEnabled ?? "").toLowerCase();
export const GOOGLE_LOGIN_ENABLED = RUNTIME_CONFIG.googleLoginEnabled === true
  || GOOGLE_LOGIN_FLAG === "true"
  || (Boolean(DEFAULT_GOOGLE_CLIENT_ID) && !["0", "false", "off", "no"].includes(GOOGLE_LOGIN_FLAG));
export const LLM_DEFAULTS_VERSION = 2;
export const LLM_MODEL_OPTIONS = [
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-4o-mini",
  "gpt-4.1-nano"
];
export const DEFAULT_CLOUD_API_ENDPOINT = String(RUNTIME_CONFIG.cloudApiEndpoint || "http://127.0.0.1:8790/api").trim();
export const CLOUD_SYNC_DEBOUNCE_MS = 700;
export const SCORE_XP_PER_POINT = 40;
export const NEWS_AUTO_REFRESH_MS = 60 * 60 * 1000;
export const NEWS_RETRY_MS = 10 * 60 * 1000;
export const NEWS_TOPIC_QUERY_PACKS = {
  all: [
    '"Jane Street" quant trading',
    '"market making" "quant"',
    '"options volatility" trading',
    '"electronic trading" "hedge fund"',
    '"Citadel Securities" market making',
    '"Optiver" "market making"',
    '"IMC Trading" "quant"',
    '"Jane Street" CoreWeave AI'
  ],
  quantFirms: [
    '"Jane Street" trading revenue',
    '"Citadel Securities" market maker',
    '"Optiver" quant trading',
    '"IMC Trading" market making',
    '"Jump Trading" quant',
    '"Hudson River Trading" quant',
    '"Two Sigma" quant trading',
    '"DE Shaw" systematic trading'
  ],
  marketStructure: [
    '"market making" "exchange"',
    '"electronic trading" "liquidity"',
    '"order book" "market structure"',
    '"options volatility" "market makers"',
    '"SEC" "market structure" trading',
    '"CME" "market making"'
  ],
  aiInfra: [
    '"quant trading" "AI infrastructure"',
    '"Jane Street" CoreWeave AI',
    '"hedge fund" GPU AI',
    '"machine learning" "market making"',
    '"low latency" "machine learning" trading'
  ],
  recruiting: [
    '"quant trading" internship',
    '"Jane Street" campus recruiting',
    '"Optiver" graduate trader',
    '"Citadel Securities" internship',
    '"IMC Trading" graduate',
    '"quant researcher" "new grad"'
  ]
};
export const NEWS_SOURCE_FILTERS = ["all", "news", "official", "social"];
export const JOBS_AUTO_REFRESH_MS = 12 * 60 * 60 * 1000;
export const JOBS_RETRY_MS = 20 * 60 * 1000;
export const POKER_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export const POKER_SUITS = [
  { key: "s", symbol: "♠" },
  { key: "h", symbol: "♥" },
  { key: "d", symbol: "♦" },
  { key: "c", symbol: "♣" }
];
export const POKER_BLIND_LEVELS = [
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 75, big: 150 },
  { small: 100, big: 200 }
];
export const POKER_HAND_NAMES = [
  "High card",
  "One pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush"
];
export const DEFAULT_GRADUATION_TERM = "2027-09";
export const leetcodeHot100 = Array.isArray(globalThis.leetcodeHot100?.problems)
  ? globalThis.leetcodeHot100.problems
  : [];
// Runtime catalog loaded from global set by data/problem-catalog.js
