import { useEffect } from "react";
import { ProblemDetail } from "./ProblemDetail.jsx";
import { localizeCategoryLabel, localizeDifficultyLabel } from "./problemDisplayLabels.js";
import { useProblemsPageModel } from "./problemsHooks.js";
import { getPracticeBank, getPracticeCompanies, hasPracticeRecord } from "./practiceBanks.js";
import { useFreePractice } from "./useFreePractice.js";
import { useFreePracticeAttempt } from "./useFreePracticeAttempt.js";
import { skillDefs } from "../../skills.js";
import "./freePractice.css";

const name = (bank, en) => en ? bank.nameEn : bank.nameZh;
const number = value => Number(value || 0).toLocaleString("en-US");
const extraTopics = { systemDesign: "System design", dataEngineering: "Data engineering", systemsNetworking: "Systems & networking", aiEngineering: "AI engineering", enterpriseTools: "Enterprise tools", assessment: "Assessment" };
const topicLabel = (value, en) => en ? skillDefs[value]?.name || extraTopics[value] || value : localizeCategoryLabel(value, false);

function BankCard({ bank, practice: p }) {
  const en = p.isEnglish;
  const featured = bank.kind !== "companies";
  return <article className={`fp-bank-card fp-bank-${bank.id}${featured ? " fp-bank-featured" : ""}`} data-bank-card={bank.id}>
    <button className="fp-bank-open" type="button" onClick={() => p.selectBank(bank.id)} aria-label={`${en ? "Open " : "进入"}${name(bank, en)}`}>
      <span className="fp-bank-icon" aria-hidden="true"><i data-lucide={bank.icon} /></span>
      <span className="fp-bank-copy"><span className="fp-bank-kind">{en ? (featured ? "BY TOPIC" : "BY COMPANY") : (bank.kind === "chapters" ? "按原书章节" : bank.kind === "topics" ? "按原站主题" : "按公司整理")}</span><h3>{name(bank, en)}</h3><p>{en ? bank.descriptionEn : bank.descriptionZh}</p></span>
      <span className="fp-bank-arrow" aria-hidden="true">↗</span>
    </button>
    <div className="fp-bank-bottom">
      <div className="fp-bank-count"><strong data-bank-count>{number(bank.total)}</strong><span>{en ? "questions" : "道题"}</span></div>
      <div className="fp-bank-progress"><span>{en ? `${number(bank.completed)} practiced` : `已练 ${number(bank.completed)}`}</span><progress value={bank.completed} max={bank.total || 1} aria-label={en ? `${name(bank, en)} progress` : `${name(bank, en)}练习进度`} /></div>
      {bank.resumeId ? <button className="fp-resume" type="button" onClick={() => p.resumeBank(bank)}>{en ? "Continue" : "继续刷题"}<span aria-hidden="true"> →</span></button> : <button className="fp-resume" type="button" disabled={!bank.total} onClick={() => p.selectBank(bank.id)}>{bank.total ? (en ? "Review" : "回顾题目") : (en ? "Not loaded" : "暂未加载")}</button>}
    </div>
  </article>;
}

function BankHome({ practice: p }) {
  const en = p.isEnglish;
  return <>
    <div className="fp-home-section-title"><h2>{en ? "Books & curated questions" : "按知识体系练习"}</h2><p>{en ? "Follow the original chapters and topics." : "沿着原书章节和原站主题，逐步练习。"}</p></div>
    <div className="fp-book-grid">{p.summaries.filter(bank => bank.kind !== "companies").map(bank => <BankCard key={bank.id} bank={bank} practice={p} />)}</div>
    <div className="fp-home-section-title fp-interview-heading"><h2>{en ? "Interview question banks" : "按目标公司练习"}</h2><p>{en ? "Browse collected interviews by source and company." : "保留面经来源，集中练习目标公司的题目。"}</p></div>
    <div className="fp-interview-banks">{p.summaries.filter(bank => bank.kind === "companies").map(bank => <BankCard key={bank.id} bank={bank} practice={p} />)}</div>
  </>;
}

function BankDirectory({ practice: p }) {
  const { bank, isEnglish: en, groups } = p;
  const isCompany = bank.kind === "companies";
  const label = isCompany ? (en ? "Companies" : "公司目录") : bank.kind === "chapters" ? (en ? "Book contents" : "原书目录") : (en ? "Topics" : "主题目录");
  const visible = groups.filter(group => !isCompany || group.label.toLocaleLowerCase().includes(p.companySearch.trim().toLocaleLowerCase()));
  return <aside className="fp-directory" aria-label={label}>
    <div className="fp-directory-heading"><h2>{label}</h2><span>{groups.length}</span></div>
    {isCompany ? <label className="fp-company-search"><i data-lucide="search" aria-hidden="true" /><input type="search" aria-label={en ? "Search companies" : "搜索公司"} placeholder={en ? "Find a company" : "搜索公司"} value={p.companySearch} onChange={event => p.setCompanySearch(event.target.value)} /></label> : null}
    <nav className="fp-directory-list" aria-label={en ? "Question groups" : "题目分组"}>
      <button className={`fp-group${p.groupId === "all" ? " is-active" : ""}`} type="button" aria-current={p.groupId === "all" ? "true" : undefined} onClick={() => p.selectGroup("all")}><span>{en ? "All questions" : "全部题目"}</span><span>{p.bankProblems.length}</span></button>
      {visible.map(group => <div className="fp-group-section" key={group.id}>
        <button className={`fp-group${p.groupId === group.id ? " is-active" : ""}`} type="button" data-group-id={group.id} aria-current={p.groupId === group.id && p.sectionId === "all" ? "true" : undefined} onClick={() => p.selectGroup(group.id)}><span>{group.label}</span><span>{group.count}</span></button>
        {p.groupId === group.id && group.children?.length ? <div className="fp-subgroups">{group.children.map(section => <button key={section.id} type="button" data-section-id={section.id} className={p.sectionId === section.id ? "is-active" : ""} aria-current={p.sectionId === section.id ? "true" : undefined} onClick={() => p.selectSection(group.id, section.id)}><span>{section.label}</span><span>{section.count}</span></button>)}</div> : null}
      </div>)}
      {!visible.length && p.companySearch ? <p className="fp-directory-empty">{en ? "No matching company." : "没有找到这家公司。"}</p> : null}
    </nav>
    {isCompany ? <p className="fp-directory-note">{en ? "A question can appear under several companies. Progress is shared." : "同一题可归属多家公司，做题记录共用。"}</p> : null}
  </aside>;
}

function QuestionFilters({ practice: p }) {
  const en = p.isEnglish;
  return <div className="fp-filters">
    <label className="fp-question-search"><i data-lucide="search" aria-hidden="true" /><input id="problemSearch" type="search" aria-label={en ? "Search this bank" : "搜索当前题库"} placeholder={en ? "Search titles, questions or topics" : "搜索题目、题干或知识点"} value={p.query} onChange={event => p.setFilter("q", event.target.value)} /></label>
    <div className="fp-filter-controls">
      <label><span>{en ? "Difficulty" : "难度"}</span><select value={p.difficulty} onChange={event => p.setFilter("difficulty", event.target.value)} aria-label={en ? "Difficulty" : "难度"}><option value="all">{en ? "All difficulties" : "全部难度"}</option>{["Easy", "Medium", "Hard"].map(value => <option key={value} value={value}>{localizeDifficultyLabel(value, en)}</option>)}</select></label>
      <label><span>{en ? "Progress" : "进度"}</span><select value={p.status} onChange={event => p.setFilter("status", event.target.value)} aria-label={en ? "Progress" : "进度"}><option value="all">{en ? "All questions" : "全部进度"}</option><option value="unfinished">{en ? "Not practiced" : "未练"}</option><option value="completed">{en ? "Practiced" : "已练"}</option><option value="saved">{en ? "Saved" : "已收藏"}</option></select></label>
      {p.bank.kind === "companies" ? <label><span>{en ? "Topic" : "主题"}</span><select value={p.topic} onChange={event => p.setFilter("topic", event.target.value)} aria-label={en ? "Topic" : "主题"}><option value="all">{en ? "All topics" : "全部主题"}</option>{p.availableCategories.map(value => <option key={value} value={value}>{topicLabel(value, en)}</option>)}</select></label> : null}
    </div>
  </div>;
}

function QuestionList({ practice: p }) {
  const en = p.isEnglish;
  return <section className="fp-question-panel" aria-label={en ? "Questions" : "题目列表"}>
    <QuestionFilters practice={p} />
    <div className="fp-list-heading"><h2>{p.section?.label || p.group?.label || (en ? "All questions" : "全部题目")}</h2><span aria-live="polite">{en ? `${number(p.filtered.length)} questions` : `${number(p.filtered.length)} 道题`}</span></div>
    <div id="problemList" className="fp-question-list">
      {p.pageItems.map((problem, index) => {
        const state = p.personal.get(problem.id) || {};
        const practiced = hasPracticeRecord(state);
        const main = (en ? problem.titleEn || problem.titleZh : problem.titleZh || problem.titleEn) || (en ? "Question" : "题目");
        const sub = en ? problem.titleZh : problem.titleEn;
        return <button key={problem.id} type="button" className="fp-question-row" data-problem-id={problem.id} onClick={() => p.openQuestion(problem.id)}>
          <span className={`fp-row-number${practiced ? " is-practiced" : ""}`} aria-label={practiced ? (en ? "Practiced" : "已练") : undefined}>{practiced ? "•" : (p.page - 1) * p.pageSize + index + 1}</span>
          <span className="fp-question-title"><strong>{main}</strong>{sub && sub !== main ? <small>{sub}</small> : null}<span className="fp-row-topic">{problem.provenance?.originalNumber ? <span>{problem.provenance.originalNumber}</span> : null}{topicLabel(problem.category, en)}{state.favorite ? <i data-lucide="bookmark-check" aria-label={en ? "Saved" : "已收藏"} /> : null}</span></span>
          <span className={`fp-difficulty is-${String(problem.difficulty).toLowerCase()}`}>{localizeDifficultyLabel(problem.difficulty, en)}</span><span className="fp-row-arrow" aria-hidden="true">›</span>
        </button>;
      })}
      {!p.filtered.length ? <div className="fp-empty"><i data-lucide="search-x" /><h3>{en ? "No matching questions" : "没有符合条件的题目"}</h3><p>{p.bankProblems.length ? (en ? "Try a different group or adjust the filters." : "可以换一个分组，或调整搜索和筛选条件。") : (en ? "This bank has not loaded. Sign in and connect to the question service." : "当前题库尚未加载，请确认已登录并连接题库服务。")}</p><button type="button" onClick={p.clearFilters}>{en ? "Clear filters" : "清除筛选"}</button></div> : null}
    </div>
    <nav className="fp-pagination" aria-label={en ? "Question pages" : "题目分页"}><span>{en ? `Page ${p.page} of ${p.totalPages}` : `第 ${p.page} / ${p.totalPages} 页`}</span><div><button type="button" disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}>{en ? "Previous" : "上一页"}</button><select aria-label={en ? "Jump to page" : "跳转页码"} value={p.page} onChange={event => p.setPage(Number(event.target.value))}>{Array.from({ length: p.totalPages }, (_, index) => <option value={index + 1} key={index}>{index + 1}</option>)}</select><button type="button" disabled={p.page >= p.totalPages} onClick={() => p.setPage(p.page + 1)}>{en ? "Next" : "下一页"}</button></div></nav>
  </section>;
}

function QuestionDetail({ practice: p, model }) {
  const en = p.isEnglish;
  const problem = p.selectedProblem;
  const supportsPracticeAttempts = Boolean(getPracticeBank(problem));
  const attemptState = useFreePracticeAttempt(supportsPracticeAttempts ? p.selectedId : "", model);
  const practiceAttempt = supportsPracticeAttempts ? attemptState : null;
  const detail = model.view.detail?.id === p.selectedId ? { ...model.view.detail, navigation: p.navigation } : null;
  return <div className="fp-reading">
    <div className="fp-reading-nav"><button type="button" onClick={p.closeQuestion}>← {en ? "Back to questions" : "返回题目列表"}</button><div><button type="button" disabled={!p.navigation.previousId} onClick={() => p.openQuestion(p.navigation.previousId)}>{en ? "Previous" : "上一题"}</button><button type="button" disabled={!p.navigation.nextId} onClick={() => p.openQuestion(p.navigation.nextId)}>{en ? "Next" : "下一题"} →</button></div></div>
    <article id="problemDetail" className="problem-detail fp-detail">{detail ? <ProblemDetail key={detail.id} practiceAttempt={practiceAttempt} detail={detail} problem={problem} listItem={{ companies: getPracticeCompanies(problem), lastScore: p.personal.get(problem.id)?.lastScore }} t={model.t} isEnglish={en} renderInto={model.mountRichText} formatDate={model.formatDate} onBack={p.closeQuestion} onOpenProblem={p.openQuestion} onToggleCompleted={model.toggleCompleted} onToggleSaved={model.toggleSaved} onSelectInterview={model.selectForInterview} onRevealBlock={model.revealBlock} onToggleLike={model.toggleLike} onPostComment={model.postComment} onDeleteComment={model.deleteComment} /> : <p className="fp-empty">{en ? "Loading question…" : "正在加载题目…"}</p>}</article>
  </div>;
}

export function FreePracticeWorkspace() {
  const model = useProblemsPageModel();
  const p = useFreePractice(model);
  const en = p.isEnglish;
  const bank = p.bank;
  const summary = p.summary;
  const hasDirectory = bank && bank.kind !== "source";
  const total = p.summaries.reduce((sum, item) => sum + item.total, 0);
  const completed = p.summaries.reduce((sum, item) => sum + item.completed, 0);
  useEffect(() => { window.lucide?.createIcons?.(); }, [bank?.id, p.selectedId, p.groups, p.page, p.companySearch]);
  return <section className="problem-section qg-training-page qg-problems-page qg-free-practice" data-free-practice-root>
    {bank || p.selectedId ? <nav className="fp-breadcrumbs" aria-label={en ? "Breadcrumb" : "浏览路径"}><button type="button" onClick={p.goHome}>{en ? "All question banks" : "全部题库"}</button><span aria-hidden="true">/</span>{bank ? <button type="button" onClick={() => p.selectBank(bank.id)}>{name(bank, en)}</button> : <span>{en ? "Question" : "题目"}</span>}{p.group ? <><span aria-hidden="true">/</span><span>{p.group.label}</span></> : null}{p.section ? <><span aria-hidden="true">/</span><span>{p.section.label}</span></> : null}</nav> : null}
    <header className="fp-header"><div><h1>{bank ? name(bank, en) : (en ? "Free practice" : "自由刷题")}</h1><p>{bank ? (en ? bank.descriptionEn : bank.descriptionZh) : (en ? "Choose a bank. Follow a topic or prepare for a company." : "选一本题库，按知识点深入，或按目标公司练习。")}</p></div><div className="fp-header-stats"><span><strong>{number(summary?.total ?? total)}</strong>{en ? " questions" : " 道题"}</span><span><strong>{number(summary?.completed ?? completed)}</strong>{en ? " practiced" : " 已练"}</span></div></header>
    {!bank && !p.selectedId ? <BankHome practice={p} /> : <div className={`fp-workspace${!hasDirectory ? " fp-without-directory" : ""}`}><>{hasDirectory ? <BankDirectory practice={p} /> : null}</><main className="fp-main">{p.selectedId && p.selectedProblem ? <QuestionDetail practice={p} model={model} /> : p.selectedId ? <div className="fp-empty"><h2>{en ? "Question unavailable" : "暂时找不到这道题"}</h2><p>{en ? "The question may have moved or may require sign-in." : "这道题可能已调整，或需要登录后加载。"}</p><button type="button" onClick={p.closeQuestion}>{en ? "Back" : "返回题目列表"}</button></div> : <QuestionList practice={p} />}</main></div>}
  </section>;
}
