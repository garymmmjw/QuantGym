import { useMemo } from "react";
import { ArrowUpRight, Backpack } from "lucide-react";
import { problemUrl } from "./leetcodeModel.js";

export function LeetcodeReviewBackpack({ entries = [], problems = [], language = "zh" }) {
  const en = language === "en";
  const lookup = useMemo(() => new Map(problems.map(problem => [problem.slug, problem])), [problems]);
  if (!entries.length) return null;
  const labels = en ? { 1: "Easy", 2: "Medium", 3: "Hard" } : { 1: "简单", 2: "中等", 3: "困难" };
  return <section className="lc-backpack" aria-labelledby="lc-backpack-title">
    <header className="lc-backpack-heading"><h2 id="lc-backpack-title"><Backpack size={17} aria-hidden="true" />{en ? "Review backpack" : "复习背包"}<span>{entries.length}</span></h2></header>
    <ul className="lc-backpack-cards" aria-label={en ? "Problems to revisit" : "待复习卡片"}>
      {entries.map(entry => {
        const problem = lookup.get(entry.problemSlug);
        const title = en ? problem?.titleEn || problem?.title || entry.problemSlug : problem?.title || problem?.titleEn || entry.problemSlug;
        const date = entry.baselineCompletedAt && Number.isFinite(Date.parse(entry.baselineCompletedAt)) ? entry.baselineCompletedAt : null;
        return <li key={entry.problemSlug}>
          <a className="lc-backpack-card" href={problemUrl(entry.problemSlug)} target="_blank" rel="noopener noreferrer" aria-label={`${en ? "Review" : "复习"} ${title}`}>
            <div className="lc-backpack-card-top"><span>#{problem?.frontendId || "—"}</span><span className={`lc-difficulty lc-difficulty-${problem?.difficulty || "unknown"}`}>{labels[problem?.difficulty] || "—"}</span></div>
            <h3>{title}</h3>
            {!en && problem?.titleEn && problem.titleEn !== title && <p>{problem.titleEn}</p>}
            <div className="lc-backpack-card-bottom"><div><span>{en ? "Last completed" : "上次完成"}</span>{date ? <time dateTime={date}>{new Date(date).toLocaleString(en ? "en-US" : "zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</time> : <span>{en ? "No time recorded" : "暂无时间记录"}</span>}</div><ArrowUpRight size={16} aria-hidden="true" /></div>
          </a>
        </li>;
      })}
    </ul>
  </section>;
}
