import { timestampOrZero } from "../../lib/date.js";

export function getJobTimestamp(job = {}) {
  return timestampOrZero(job.postedAt || job.createdAt);
}
