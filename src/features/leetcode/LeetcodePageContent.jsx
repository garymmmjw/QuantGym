import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, RefreshCw, Search, Shuffle, Upload } from "lucide-react";
import { LeetCodeConnection } from "./LeetCodeConnection.jsx";
import { useLeetCode } from "./useLeetCode.js";
import { leetcodeError, prepareHistory, problemUrl, reviewPool } from "./leetcodeModel.js";
import { getReviewCardHistories } from "./leetcodeCardDrawModel.js";
import { LeetcodeReviewPanel } from "./LeetcodeReviewPanel.jsx";
import { LeetcodeReviewBackpack } from "./LeetcodeReviewBackpack.jsx";
import "./leetcode.css";
import "./leetcodeRefined.css";

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
  const [drawSession, setDrawSession] = useState(null);
  const [reviewLocked, setReviewLocked] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [pendingWarning, setPendingWarning] = useState("");
  const [importNote, setImportNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef(null);
  const seenTransfers = useRef(new Set());
  const savingDraw = useRef(null);
  const matchingProblems = useMemo(() => reviewPool(problems, "all", search), [problems, search]);
  const pool = useMemo(() => reviewPool(matchingProblems, difficulty), [matchingProblems, difficulty]);
  const filterCounts = useMemo(() => matchingProblems.reduce((counts, problem) => {
    if ([1, 2, 3].includes(problem.difficulty)) counts[problem.difficulty] += 1;
    return counts;
  }, { all: matchingProblems.length, 1: 0, 2: 0, 3: 0 }), [matchingProblems]);
  const allProblems = useMemo(() => reviewPool(problems), [problems]);
  const completionHistory = useMemo(() => new Map([...getReviewCardHistories(allProblems, {
    now, submissions: lc.data.submissions, practiceSessions, connection,
  })].map(([slug, history]) => [slug, history.lastPracticedAt])), [allProblems, now, lc.data.submissions, practiceSessions, connection]);
  const difficultyTotal = [stats?.easy, stats?.medium, stats?.hard].reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const connectionKey = JSON.stringify([lc.ownerId, connection?.username, connection?.linkedAt]);
  const activeDraw = drawSession?.connectionKey === connectionKey ? drawSession : null;
  const selectedProblem = activeDraw?.problem || null;
  const backpack = Array.isArray(lc.data.reviewBackpack) ? lc.data.reviewBackpack : [];
  const packedSlugs = useMemo(() => new Set(backpack.map(item => item.problemSlug)), [backpack]);
  const availableCards = useMemo(() => allProblems.filter(problem => !packedSlugs.has(problem.slug)), [allProblems, packedSlugs]);
  const labels = difficultyLabels[en ? "en" : "zh"];
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(pool.length / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => { setDrawSession(null); savingDraw.current = null; setReviewLocked(false); setPage(1); setSearch(""); setDifficulty("all"); }, [connection?.username, connection?.linkedAt]);
  useEffect(() => { setPage(1); }, [search, difficulty]);
  useEffect(() => { if (pending) setHistoryOpen(true); }, [pending]);
  useEffect(() => {
    const refreshTime = () => setNow(Date.now());
    const timer = window.setInterval(refreshTime, 30000);
    window.addEventListener("focus", refreshTime);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshTime); };
  }, []);
  const openReview = () => {
    if (reviewLocked || lc.busy || activeDraw || !availableCards.length) return;
    setDrawSession({ eventId: crypto.randomUUID(), connectionKey, pool: availableCards,
      problem: null, phase: "idle", message: "" });
  };
  const saveReviewCard = async (problem, session = activeDraw) => {
    if (!problem || !session || session.connectionKey !== connectionKey || savingDraw.current === session.eventId) return;
    savingDraw.current = session.eventId;
    setDrawSession(current => current?.eventId === session.eventId ? { ...current, problem, phase: "saving", message: "" } : current);
    let result;
    try {
      result = await lc.addReviewCard?.({ username: connection.username, linkedAt: connection.linkedAt,
        problemSlug: problem.slug, eventId: session.eventId });
    } catch (error) { result = { error }; }
    if (savingDraw.current === session.eventId) savingDraw.current = null;
    setDrawSession(current => current?.eventId === session.eventId ? { ...current,
      phase: result?.data ? "saved" : "error",
      message: result?.data ? "" : t("卡片未能存入背包，请重试。", "Could not save this card. Please try again."),
    } : current);
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
      } catch { setHistoryOpen(true); setImportNote(t("无法读取这份历史记录，请更新扩展后重试。", "Could not read this history. Update the extension and try again.")); }
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
    if (result) { setPending(null); setImportNote(t("历史已导入，题库、日历和 Stage 已更新。", "History imported. Your review pool, calendar and Stage counts are updated.")); }
  };
  const importSection = <details className="lc-history-import" id="lc-import" open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}>
    <summary><span><Upload size={16} aria-hidden="true" /><span id="lc-import-title">{t("历史记录", "History")}</span></span><span className="lc-import-summary-action">{t("导入与补充", "Import history")}<ChevronDown size={15} aria-hidden="true" /></span></summary>
    <div className="lc-history-content">
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
    </div>
  </details>;

  return <main className="lc-page lc-refined" lang={en ? "en" : "zh-CN"} aria-labelledby="lc-title">
    <header className="lc-header">
      <h1 id="lc-title">LeetCode<span className="lc-heading-dot" aria-hidden="true">.</span></h1>
      {connection && <div className="lc-actions lc-header-actions"><button type="button" className="lc-button lc-review-entry" disabled={lc.busy || reviewLocked || !availableCards.length} onClick={() => openReview()} title={!availableCards.length ? allProblems.length ? t("所有可复习题目都已在背包中", "All available problems are already in your backpack") : t("暂无可复习题目", "No problems available to review") : undefined}><Shuffle size={15} aria-hidden="true" />{t("复习一下", "Review")}</button><button type="button" className="lc-button is-primary" disabled={lc.busy || reviewLocked} onClick={() => lc.sync?.()}><RefreshCw size={15} aria-hidden="true" />{lc.phase === "syncing" ? t("同步中…", "Syncing…") : t("刷新同步", "Sync now")}</button></div>}
    </header>
    {connection && lc.error && lc.error.status !== 401 && <div className="lc-feedback is-error" role="alert">{leetcodeError(lc.error, en)} <button type="button" className="lc-text-button" disabled={lc.busy} onClick={() => lc.retry?.()}>{t("重试", "Retry")}</button></div>}
    {!connection ? <><LeetCodeConnection connectionState={lc} />{pending && importSection}</> : <>
      <section className="lc-overview lc-stat-strip" aria-label={t("力扣整体进度", "LeetCode overview")}>
        <dl className="lc-stat-primary"><div><dt>{t("已通过题目", "Problems solved")}</dt><dd>{stats?.solved?.toLocaleString(locale) ?? "—"}</dd></div></dl>
        <div className="lc-stat-difficulty-group">
          <div className="lc-difficulty-progress" aria-hidden="true">{[[1, "easy"], [2, "medium"], [3, "hard"]].map(([level, key]) => <span key={key} className={`lc-level-${level}`} style={{ width: `${difficultyTotal ? Math.max(0, Number(stats?.[key]) || 0) / difficultyTotal * 100 : 0}%` }} />)}</div>
          <dl>{[[1, "easy"], [2, "medium"], [3, "hard"]].map(([level, key]) => <div key={key} className={`lc-stat-difficulty lc-stat-${level}`}><dt><span className={`lc-level-dot lc-level-${level}`} aria-hidden="true" />{labels[level]}</dt><dd>{stats?.[key]?.toLocaleString(locale) ?? "—"}</dd></div>)}</dl>
        </div>
        <dl className="lc-stat-totals"><div><dt>{t("总提交次数", "Submissions")}</dt><dd>{stats?.totalSubmissions?.toLocaleString(locale) ?? "—"}</dd></div><div><dt>{t("可复习题目", "Review pool")}</dt><dd>{allProblems.length.toLocaleString(locale)}<small> / {stats?.solved ?? "—"}</small></dd></div></dl>
      </section>
      <LeetcodeReviewBackpack entries={backpack} problems={allProblems} language={lc.language} />
      {activeDraw && <LeetcodeReviewPanel key={activeDraw.eventId} lc={lc} practiceSessions={practiceSessions} pool={activeDraw.pool}
        selectedProblem={selectedProblem} onSelect={problem => saveReviewCard(problem, activeDraw)} now={now} onLockChange={setReviewLocked}
        onClose={() => setDrawSession(null)} autoDraw saveState={{ phase: activeDraw.phase, message: activeDraw.message, onRetry: () => saveReviewCard(activeDraw.problem, activeDraw) }} />}
      <section className="lc-problems lc-library" aria-labelledby="lc-problems-title">
        <h2 id="lc-problems-title" className="lc-sr-only">{t("我的复习题库", "My review pool")}</h2>
        <div className="lc-library-toolbar">
          <label className="lc-difficulty-dropdown"><select className="lc-difficulty-filter" value={difficulty} onChange={event => setDifficulty(event.target.value)} aria-label={t("按难度筛选", "Filter difficulty")}>{["all", "1", "2", "3"].map(value => <option key={value} value={value}>{value === "all" ? t("全部", "All") : labels[value]} {filterCounts[value]}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label>
          <div className="lc-library-tools">
          <label className="lc-search-wrap"><Search size={16} aria-hidden="true" /><input className="lc-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t("搜索题名或编号…", "Search title or number…")} aria-label={t("搜索已通过题目", "Search solved problems")} /></label></div>
        </div>
        {pool.length ? <>
          <div className="lc-library-columns" aria-hidden="true"><span>#</span><span>{t("题目", "Problem")}</span><span>{t("难度", "Difficulty")}</span><span>{t("上次完成", "Last completed")}</span><span /></div>
          <ul className="lc-library-list" aria-label={t("已通过题目与完成时间", "Solved problems and completion times")}>{pool.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(problem => {
            const title = en ? problem.titleEn || problem.title || problem.slug : problem.title || problem.titleEn || problem.slug;
            const secondary = en ? problem.title : problem.titleEn;
            const completedAt = completionHistory.get(problem.slug);
            const fullDate = completedAt ? new Date(completedAt).toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
            const compactDate = completedAt ? new Date(completedAt).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
            return <li key={problem.slug}><a className="lc-problem-row" href={problemUrl(problem.slug)} target="_blank" rel="noopener noreferrer" title={`${problem.frontendId || ""} · ${title}${secondary && secondary !== title ? ` · ${secondary}` : ""}`}>
              <span className="lc-problem-id">{problem.frontendId || "—"}</span>
              <span className="lc-problem-name"><strong>{title}</strong>{secondary && secondary !== title && <span>{secondary}</span>}</span>
              <span className={`lc-difficulty lc-difficulty-${problem.difficulty || "unknown"}`}>{labels[problem.difficulty] || t("已通过", "Solved")}</span>
              <span className="lc-last-completed"><span className="lc-sr-only">{t("上次完成", "Last completed")} </span>{completedAt ? <time dateTime={completedAt} title={fullDate} aria-label={fullDate}><span className="lc-date-wide">{fullDate}</span><span className="lc-date-compact" aria-hidden="true">{compactDate}</span></time> : <span title={t("暂无时间记录", "No completion time recorded")}>{t("暂无时间记录", "No record")}</span>}</span>
              <ArrowUpRight className="lc-row-arrow" size={14} aria-hidden="true" />
            </a></li>;
          })}</ul>
        </> : <div className="lc-list-empty">{t("没有符合条件的题目", "No matching problems")}<button type="button" className="lc-text-button" onClick={() => { setSearch(""); setDifficulty("all"); }}>{t("重置筛选", "Reset filters")}</button></div>}
        <div className="lc-library-footer">{pages > 1 && <nav className="lc-pagination" aria-label={t("题目分页", "Problem pages")}><button type="button" className="lc-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t("上一页", "Previous")}</button><span>{currentPage} / {pages}</span><button type="button" className="lc-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>{t("下一页", "Next")}</button></nav>}
          <details className="lc-pool-help"><summary>{t("题库说明", "About this pool")}</summary><p className="lc-data-note">{coverage.problemPoolComplete ? t("题库数量已与力扣通过题数对齐。", "Your review pool matches the solved count on LeetCode.") : t("题库仅包含已同步的通过题目。公开记录范围有限，历史导入后会补充到这里。", "This pool contains synced solved problems. Public history is limited; import older records to expand it.")}{t(" 难度未知的题目会保留在「全部」中。完成时间按本地时区显示。", " Problems without difficulty data remain under All. Completion times use your local timezone.")}</p></details>
        </div>
      </section>
      {importSection}
    </>}
  </main>;
}
