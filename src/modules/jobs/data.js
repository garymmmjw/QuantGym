import { requestJson } from '../../api/client.js';
import { parseTags as parseTagsValue } from '../../lib/text.js';

const DEFAULT_JOB_BOARDS = ["janestreet", "optiverus", "imc", "jumptrading"];
const DEFAULT_JOBS_ENDPOINT = "http://127.0.0.1:8787/jobs";

export function normalizeJobs(rawJobs, deps = {}) {
  const {
    seedJobs = [],
    parseTags = parseTagsValue,
    stableId = (value) => String(value || ""),
    makeId = () => `${Date.now()}-${Math.random()}`
  } = deps;
  const jobs = Array.isArray(rawJobs) && rawJobs.length ? rawJobs : seedJobs;
  return jobs.map((job) => ({
    id: String(job?.id || stableId(`${job?.company || "job"}-${job?.title || makeId()}`, "job")),
    company: String(job?.company || "Quant Firm"),
    title: String(job?.title || "Quant Role"),
    type: String(job?.type || "internship").toLowerCase() === "fulltime" ? "fulltime" : "internship",
    location: String(job?.location || "Global"),
    url: String(job?.url || "#"),
    postedAt: String(job?.postedAt || "crawler-ready"),
    tags: Array.isArray(job?.tags) ? job.tags.map(String).filter(Boolean) : parseTags(job?.tags || "")
  }));
}

export function normalizeJobItem(raw = {}, deps = {}) {
  return normalizeJobs([raw], deps)[0];
}

export function mergeJobs(remoteJobs, localJobs, deps = {}) {
  const byId = new Map();
  [...normalizeJobs(remoteJobs, deps), ...normalizeJobs(localJobs, deps)].forEach((job) => {
    byId.set(job.id, { ...(byId.get(job.id) || {}), ...job });
  });
  return [...byId.values()];
}

export function getJobsEndpoint(endpoint, fallback = DEFAULT_JOBS_ENDPOINT) {
  try {
    const url = new URL(String(endpoint || "").trim());
    url.pathname = url.pathname.replace(/\/(interview|classify-log|news)\/?$/, "/jobs");
    if (!url.pathname.endsWith("/jobs")) url.pathname = "/jobs";
    url.search = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

export async function requestJobsFromApi(options = {}) {
  const {
    endpoint,
    fetchImpl = globalThis.fetch,
    normalizeItem = (item) => item,
    max = 18,
    boards = DEFAULT_JOB_BOARDS
  } = options;
  if (!endpoint) throw new Error("Missing jobs endpoint");
  let data;
  try {
    data = await requestJson(endpoint, {
      method: "POST",
      body: { max, boards },
      auth: false,
      fetchImpl
    });
  } catch (error) {
    if (error?.status) throw new Error(`Jobs API ${error.status}`);
    throw error;
  }
  const items = Array.isArray(data) ? data : data.items || data.jobs || [];
  return items.map(normalizeItem);
}
