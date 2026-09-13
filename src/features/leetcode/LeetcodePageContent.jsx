import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LeetCodeConnection } from "./LeetCodeConnection.jsx";
import { useLeetCode } from "./useLeetCode.js";
import { leetcodeError, prepareHistory, problemUrl, reviewPool } from "./leetcodeModel.js";
import { filterReviewProblems } from "./leetcodeReviewModel.js";
import { LeetcodeReviewPanel, ReviewDueDate } from "./LeetcodeReviewPanel.jsx";
import "./leetcode.css";

const difficultyLabels = { zh: { 1: "简单", 2: "中等", 3: "困难" }, en: { 1: "Easy", 2: "Medium", 3: "Hard" } };

export function LeetcodePageContent({ practiceSessions = [] }) {
  const lc = useLeetCode();
  return <LeetcodeWorkspace key={lc.ownerId || "signed-out"} lc={lc} practiceSessions={practiceSessions} />;
}

function LeetcodeWorkspace({ lc, practiceSessions }) {
  const en = lc.language === "en";
  const t = (zh, english) => en ? english : zh;
  const locale = en ? "en-US" : "zh-CN";
  const { connection, stats, coverage = {}, problems = [] } = lc.data;
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewLocked, setReviewLocked] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [pendingWarning, setPendingWarning] = useState("");
  const [importNote, setImportNote] = useState("");
  const fileRef = useRef(null);
  const seenTransfers = useRef(new Set());
  const pool = useMemo(() => filterReviewProblems(reviewPool(problems, difficulty, search), reviewFilter, now), [problems, difficulty, search, reviewFilter, now]);
  const allProblems = useMemo(() => reviewPool(problems), [problems]);
  const connectionKey = JSON.stringify([lc.ownerId, connection?.username, connection?.linkedAt]);
  const selectedProblem = selected?.connectionKey === connectionKey ? allProblems.find((item) => item.slug === selected.slug) : null;
  const labels = difficultyLabels[en ? "en" : "zh"];
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(pool.length / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => { setSelected(null); setReviewLocked(false); setPage(1); setSearch(""); setDifficulty("all"); setReviewFilter("all"); }, [connection?.username, connection?.linkedAt]);
  useEffect(() => { setPage(1); }, [search, difficulty, reviewFilter]);
  useEffect(() => {
    const refreshTime = () => setNow(Date.now());
    const timer = window.setInterval(refreshTime, 30000);
    window.addEventListener("focus", refreshTime);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshTime); };
  }, []);
  const selectReview = problem => setSelected(problem ? { slug: problem.slug, connectionKey } : null);
  const openReview = problem => {
    if (reviewLocked || lc.busy) return;
    selectReview(problem);
    document.getElementById("lc-review-title")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  useEffect(() => {
    const receive = (event) => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.source !== "quantgym-collector-extension") return;
      if (event.data.type === "quantgym:leetcode-awaiting") {
        window.postMessage({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ready" }, window.location.origin);
        return;
      }
      if (event.data.type !== "quantgym:leetcode-history") return;
      const transferId = String(event.data.transferId || "").slice(0, 160);
      if (seenTransfers.current.has(transferId)) return;
      try {
        const payload = prepareHistory(event.data.payload);
        setPending(payload);
        setPendingWarning(event.data.payload?.coverage?.complete === false ? (typeof event.data.payload.coverage.reason === "string" ? event.data.payload.coverage.reason.slice(0, 300) : t("本次仅获取了部分历史记录。", "Only part of your history was retrieved.")) : "");
        setImportNote("");
        seenTransfers.current.add(transferId);
        window.postMessage({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ack", transferId }, window.location.origin);
        document.getElementById("lc-import")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch { setImportNote(t("无法读取这份历史记录，请更新扩展后重试。", "Could not read this history. Update the extension and try again.")); }
    };
    window.addEventListener("message", receive);
    window.postMessage({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [en]);

  const readHistory = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("too_large");
      const value = JSON.parse(await file.text());
      setPending(prepareHistory(value));
      setPendingWarning(value?.coverage?.complete === false ? (typeof value.coverage.reason === "string" ? value.coverage.reason.slice(0, 300) : t("本次仅获取了部分历史记录。", "Only part of your history was retrieved.")) : "");
      setImportNote("");
    } catch { setImportNote(t("请选择扩展导出的有效历史 JSON 文件（不超过 5 MB）。", "Choose a valid history JSON file exported by the extension (up to 5 MB).")); }
  };
  const importHistory = async () => {
    if (!pending || pending.username !== connection?.username) return;
    const result = await lc.importRecords?.(pending);
    if (result) { setPending(null); setImportNote(t("历史已导入，复习题库和训练日历已更新。", "History imported. Your review pool and training calendar are updated.")); }
  };
  const importSection = <section className="lc-history-import" id="lc-import" aria-labelledby="lc-import-title">
    <div className="lc-section-title"><div><p className="lc-eyebrow">YOUR HISTORY</p><h2 id="lc-import-title">{t("补齐历史记录", "Bring your history")}</h2></div><span className="lc-status">{t("通过记录 · 不包含代码", "Accepted history · no code")}</span></div>
    <p className="lc-muted">{t("公开同步只返回近期通过记录。用 QuantGym Collector 补充之前的题目，日历和随机复习便能使用这些历史记录。", "Public sync returns recent accepted submissions. Use QuantGym Collector to add older problems to your calendar and review pool.")}</p>
    <details className="lc-import-guide"><summary>{t("如何同步以前做过的题？", "How do I sync older problems?")}</summary>
      <ol><li>{t("安装或更新 QuantGym Collector。下载后解压，在 Chrome 扩展程序的开发者模式中选择「加载已解压的扩展程序」。", "Install or update QuantGym Collector. Unzip the download, then choose Load unpacked in Chrome Extensions with Developer mode enabled.")} <a href="/downloads/quantgym-collector.zip" download>{t("下载扩展", "Download extension")} ↗</a></li><li>{t("在浏览器中登录力扣中国站，打开扩展，点击「同步力扣记录」。", "Sign in to LeetCode China, open the extension, and choose Sync LeetCode history.")}</li><li>{t("回到此页，核对力扣用户名后导入。密码、登录 Cookie 和提交代码不会传给 QuantGym。", "Return here, check the LeetCode username, and import. Passwords, login cookies, and submitted code are not sent to QuantGym.")}</li></ol>
    </details>
    <button type="button" className="lc-button" onClick={() => fileRef.current?.click()} disabled={lc.busy}>{t("导入扩展导出的历史文件", "Import exported history file")}</button><input type="file" ref={fileRef} hidden accept=".json,application/json" onChange={readHistory} />
    {pending && <div className="lc-import-preview" role="region" aria-label={t("待导入记录", "History ready to import")}><strong>{pending.username}</strong><p>{t(`${pending.problems.length} 道已通过题目 · ${pending.submissions.length} 条通过记录`, `${pending.problems.length} solved problems · ${pending.submissions.length} accepted submissions`)}</p>
      {pendingWarning && <p className="lc-muted">{t("部分历史 · ", "Partial history · ")}{pendingWarning}</p>}
      {pending.username !== connection?.username && <p className="lc-feedback is-error">{t("请先在账户中关联这份记录对应的力扣用户名，再导入。", "First connect this LeetCode username in your account settings.")}</p>}
      <div className="lc-actions"><button className="lc-button is-primary" type="button" disabled={lc.busy || pending.username !== connection?.username} onClick={importHistory}>{lc.phase === "importing" ? t("导入中…", "Importing…") : t("导入到当前关联账号", "Import to connected account")}</button><button className="lc-text-button" type="button" disabled={lc.busy} onClick={() => setPending(null)}>{t("取消", "Cancel")}</button></div>
    </div>}
    {importNote && <p className="lc-feedback" role="status">{importNote}</p>}
  </section>;

  return <main className="lc-page" aria-labelledby="lc-title">
    <header className="lc-header"><div><p className="lc-eyebrow">CODING PRACTICE</p><h1 id="lc-title">LeetCode</h1><p className="lc-muted">{t("记录刷题进度，回顾已经掌握的题目。", "Track your progress. Revisit the problems you have solved.")}</p></div><div className="lc-actions"><Link className="lc-button" to="/calendar">{t("训练日历", "Training calendar")} ↗</Link><Link className="lc-text-button" to="/account">{t("账户关联", "Account settings")}</Link></div></header>
    {connection && lc.error && lc.error.status !== 401 && <div className="lc-feedback is-error" role="alert">{leetcodeError(lc.error, en)} <button type="button" className="lc-text-button" disabled={lc.busy} onClick={() => lc.reload?.()}>{t("重试", "Retry")}</button></div>}
    {!connection ? <><LeetCodeConnection connectionState={lc} />{pending && importSection}</> : <>
      <div className="lc-profile-bar"><div><span className="lc-account-mark" aria-hidden="true">&lt;/&gt;</span><a href={connection.profileUrl} target="_blank" rel="noopener noreferrer"><strong>{connection.displayName || connection.username}</strong><span>{connection.username} · {t("力扣中国站", "LeetCode China")} ↗</span></a></div><div className="lc-profile-sync"><span className="lc-updated">{connection.lastSyncedAt && `${t("同步于", "Synced")} ${new Date(connection.lastSyncedAt).toLocaleString(locale)}`}</span><button type="button" className="lc-button" disabled={lc.busy} onClick={() => lc.sync?.()}>{lc.busy ? t("同步中…", "Syncing…") : t("刷新同步", "Sync now")}</button></div></div>
      <section className="lc-overview" aria-label={t("力扣整体进度", "LeetCode overview")}>
        <div className="lc-solved-total"><span className="lc-stat-label">{t("已通过题目", "Problems solved")}</span><strong>{stats?.solved?.toLocaleString(locale) ?? "—"}</strong><span className="lc-muted">{t("按不同题目统计", "Distinct solved problems")}</span></div>
        <div className="lc-difficulty-overview"><div className="lc-difficulty-bar" aria-hidden="true">{[1, 2, 3].map((level) => <span key={level} className={`lc-level-${level}`} style={{ flex: stats?.[["", "easy", "medium", "hard"][level]] || 0 }} />)}</div><dl>{[[1, "easy"], [2, "medium"], [3, "hard"]].map(([level, key]) => <div key={key}><dt><span className={`lc-level-dot lc-level-${level}`} />{labels[level]}</dt><dd>{stats?.[key]?.toLocaleString(locale) ?? "—"}</dd></div>)}</dl></div>
        <dl className="lc-extra-stats"><div><dt>{t("总提交次数", "Total submissions")}</dt><dd>{stats?.totalSubmissions?.toLocaleString(locale) ?? "—"}</dd></div><div><dt>{t("可复习题目", "Review pool")}</dt><dd>{allProblems.length.toLocaleString(locale)}<small> / {stats?.solved ?? "—"}</small></dd></div></dl>
      </section>
      <LeetcodeReviewPanel key={connectionKey} lc={lc} practiceSessions={practiceSessions} pool={pool} allProblems={allProblems} selectedProblem={selectedProblem} onSelect={selectReview} now={now} onLockChange={setReviewLocked} />
      <section className="lc-problems" aria-labelledby="lc-problems-title"><div className="lc-section-title"><div><p className="lc-eyebrow">SOLVED PROBLEMS</p><h2 id="lc-problems-title">{t("我的复习题库", "My review pool")}</h2></div><span className="lc-muted">{t(`已同步 ${allProblems.length} / ${stats?.solved ?? "—"} 题`, `${allProblems.length} / ${stats?.solved ?? "—"} problems synced`)}</span></div>
        <div className="lc-problem-controls"><div className="lc-filter-group" role="group" aria-label={t("按难度筛选", "Filter difficulty")}>{["all", "1", "2", "3"].map((value) => <button key={value} type="button" aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}>{value === "all" ? t("全部", "All") : labels[value]}</button>)}</div><input className="lc-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("搜索题名或编号", "Search title or number")} aria-label={t("搜索已通过题目", "Search solved problems")} /></div>
        <div className="lc-review-filters"><div className="lc-filter-group" role="group" aria-label={t("按复习状态筛选", "Filter review status")}>{[["all", "全部", "All"], ["due", "待复习", "Due"], ["upcoming", "未到期", "Upcoming"], ["uninitialized", "待首次复习", "First review"]].map(([value, zh, english]) => <button key={value} type="button" aria-pressed={reviewFilter === value} onClick={() => setReviewFilter(value)}>{t(zh, english)}</button>)}</div><span>{t("建议复习时间 · 本地时区", "Suggested review time · local timezone")}</span></div>
        {pool.length ? <ul className="lc-problem-list lc-scheduled-problems">{pool.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((problem) => <li key={problem.slug}>
          <span className="lc-problem-id">{problem.frontendId || "—"}</span>
          <a className="lc-problem-name" href={problemUrl(problem.slug)} target="_blank" rel="noopener noreferrer"><strong>{en ? problem.titleEn || problem.title : problem.title || problem.titleEn || problem.slug}</strong><span>{en ? problem.title || problem.slug : problem.titleEn || problem.slug}</span></a>
          <span className={`lc-difficulty lc-difficulty-${problem.difficulty || "unknown"}`}>{labels[problem.difficulty] || t("已通过", "Solved")}</span>
          <ReviewDueDate problem={problem} language={lc.language} now={now} />
          <button type="button" className="lc-row-review" disabled={reviewLocked || lc.busy} onClick={() => openReview(problem)} aria-label={`${t("复习", "Review")} ${problem.title || problem.titleEn || problem.slug}`}>{t("复习", "Review")}</button>
          <a className="lc-problem-launch" href={problemUrl(problem.slug)} target="_blank" rel="noopener noreferrer" aria-label={`${t("去力扣练习", "Practice on LeetCode")} ${problem.title || problem.slug}`}>↗</a>
        </li>)}</ul> : <div className="lc-list-empty">{t("没有符合条件的题目。试试其他筛选，或导入以前的通过记录。", "No matching problems. Change the filter or import older accepted history.")}</div>}
        {pages > 1 && <nav className="lc-pagination" aria-label={t("题目分页", "Problem pages")}><button type="button" className="lc-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t("上一页", "Previous")}</button><span>{currentPage} / {pages}</span><button type="button" className="lc-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>{t("下一页", "Next")}</button></nav>}
        <p className="lc-data-note">{coverage.problemPoolComplete ? t("题库数量已与力扣通过题数对齐。", "Your review pool matches the solved count on LeetCode.") : t("题库仅包含已同步的通过题目。公开记录范围有限，历史导入后会补充到这里。", "This pool contains synced solved problems. Public history is limited; import older records to expand it.")}{t(" 难度未知的题目会保留在「全部」中。", " Problems without difficulty data remain under All.")}</p>
      </section>
      {importSection}
    </>}
  </main>;
}
