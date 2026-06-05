import { stableSlugId } from '../../lib/id.js';
import { parseTags as parseTagsValue } from '../../lib/text.js';
import { inferSourceFromUrl } from '../../lib/url.js';

export function normalizeCourses(rawCourses, options = {}) {
  const seedCourses = Array.isArray(options.seedCourses) ? options.seedCourses : [];
  const courses = Array.isArray(rawCourses) && rawCourses.length ? rawCourses : seedCourses;
  const parseTags = options.parseTags || parseTagsValue;
  const stableId = options.stableId || defaultStableCourseId;
  const makeId = options.makeId || (() => Math.random().toString(36).slice(2));
  const inferSource = options.inferSource || inferSourceFromUrl;
  return courses.map((course) => {
    const url = String(course?.url || "#").trim();
    const sources = normalizeContentSources(course?.sources, {
      title: course?.provider || course?.platform || "Original",
      provider: course?.platform || inferSource(url) || "Original",
      url
    }, options);
    return {
      id: String(course?.id || stableId(`${course?.platform || "course"}-${course?.title || makeId()}`, url)),
      title: String(course?.title || "Quant Course").trim(),
      platform: String(course?.platform || sources[0]?.provider || "Course").trim(),
      provider: String(course?.provider || course?.platform || sources[0]?.title || "Course").trim(),
      url,
      sources,
      topic: String(course?.topic || "Quant").trim(),
      level: String(course?.level || "Core").trim(),
      summary: String(course?.summary || "").trim(),
      tags: Array.isArray(course?.tags) ? course.tags.map(String).filter(Boolean) : parseTags(course?.tags || "")
    };
  });
}

export function normalizeCourseStates(rawStates = []) {
  const states = Array.isArray(rawStates) ? rawStates : [];
  return states.map((item) => ({
    courseId: String(item?.courseId || item?.id || "").trim(),
    saved: Boolean(item?.saved),
    inPath: Boolean(item?.inPath),
    done: Boolean(item?.done),
    note: String(item?.note || "").slice(0, 4000),
    selectedSourceId: String(item?.selectedSourceId || ""),
    pathAddedAt: item?.pathAddedAt || "",
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString()
  })).filter((item) => item.courseId);
}

export function mergeCourseStates(lists = [], options = {}) {
  const byId = new Map();
  const latestIso = options.latestIso || ((a, b) => b || a || "");
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const normalized = normalizeCourseStates([item])[0];
    if (!normalized) return;
    const previous = byId.get(normalized.courseId) || {};
    const previousIsNewer = latestIso(previous.updatedAt, normalized.updatedAt) === previous.updatedAt;
    byId.set(normalized.courseId, {
      ...previous,
      ...normalized,
      saved: Boolean(previous.saved || normalized.saved),
      inPath: Boolean(previous.inPath || normalized.inPath),
      done: Boolean(previous.done || normalized.done),
      note: previousIsNewer ? previous.note || normalized.note : normalized.note || previous.note,
      pathAddedAt: previous.pathAddedAt || normalized.pathAddedAt
    });
  });
  return [...byId.values()];
}

export function mergeCourses(remoteCourses, localCourses, options = {}) {
  const byId = new Map();
  [...normalizeCourses(remoteCourses, options), ...normalizeCourses(localCourses, options)].forEach((course) => {
    byId.set(course.id, { ...(byId.get(course.id) || {}), ...course });
  });
  return [...byId.values()];
}

export function normalizeContentSources(rawSources, fallback = {}, options = {}) {
  const sourceList = Array.isArray(rawSources) ? rawSources : [];
  const fallbackUrl = String(fallback.url || "").trim();
  const candidates = [
    ...sourceList,
    ...(fallbackUrl ? [fallback] : [])
  ];
  const safeExternalUrl = options.safeExternalUrl || ((url) => String(url || "").trim() || "#");
  const seen = new Set();
  return candidates
    .map((source, index) => normalizeContentSource(source, index, options))
    .filter((source) => {
      if (!source.url || safeExternalUrl(source.url) === "#") return false;
      const key = source.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeContentSource(raw = {}, index = 0, options = {}) {
  const stableId = options.stableId || defaultStableCourseId;
  const inferSource = options.inferSource || inferSourceFromUrl;
  const url = String(raw?.url || raw?.sourceUrl || raw || "").trim();
  const provider = normalizeSourceProvider(raw?.provider || raw?.platform || inferSource(url));
  const embed = getOfficialEmbed(url, provider);
  const title = String(raw?.title || raw?.label || provider || "Original").trim();
  return {
    id: String(raw?.id || stableId(`${provider}-${title}-${index}`, url)),
    title,
    provider,
    url,
    embedUrl: String(raw?.embedUrl || embed.embedUrl || "").trim(),
    videoId: String(raw?.videoId || embed.videoId || "").trim(),
    embeddable: Boolean(raw?.embedUrl || embed.embedUrl)
  };
}

export function normalizeSourceProvider(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (/youtube|youtu\.be/.test(lower)) return "YouTube";
  if (/bilibili|bili|b站/.test(lower)) return "Bilibili";
  if (/ocw|mit/.test(lower)) return raw || "MIT OCW";
  return raw || "Original";
}

export function getOfficialEmbed(url, provider = "") {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      provider: "YouTube",
      videoId: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`
    };
  }
  const bvid = getBilibiliBvid(url);
  if (bvid) {
    return {
      provider: "Bilibili",
      videoId: bvid,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&autoplay=0`
    };
  }
  const lower = String(provider || "").toLowerCase();
  if (lower.includes("youtube") || lower.includes("bilibili")) return { provider, videoId: "", embedUrl: "" };
  return { provider, videoId: "", embedUrl: "" };
}

export function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(String(url || ""));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

export function getBilibiliBvid(url) {
  const value = String(url || "");
  try {
    const parsed = new URL(value);
    const fromQuery = parsed.searchParams.get("bvid");
    if (fromQuery) return fromQuery;
    const match = parsed.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
    return match?.[1] || "";
  } catch {
    const match = value.match(/BV[a-zA-Z0-9]+/i);
    return match?.[0] || "";
  }
}

function defaultStableCourseId(title, sourceUrl) {
  return stableSlugId("course", title, sourceUrl, { limit: 90, fallback: "item" });
}
