import { useEffect, useRef } from "react";
import { ProblemCard } from "./ProblemCard.jsx";
import {
  ProblemCollectionGrid,
  ProblemCompanyPanel,
  ProblemCompletionPanel,
  ProblemFilterPanel,
  ProblemLeetcodeHotList,
  ProblemPaginationNav
} from "./ProblemChromePanels.jsx";
import { ProblemDetail } from "./ProblemDetail.jsx";
import { ProblemRankingList } from "./ProblemRankingList.jsx";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";
import { getProblemCatalogStats } from "./problemDisplayLabels.js";
import { useProblemsPageModel } from "./problemsHooks.js";

export function ProblemsPageContent() {
  const model = useProblemsPageModel();
  const { view } = model;
  const chrome = view.chrome;
  const viewMode = view.filters?.viewMode || "all";
  const isEnglish = Boolean(view.isEnglish);

  // Keep the latest list snapshot so the split layout can render the list
  // beside the detail panel (the view model swaps to detail-only mode).
  const lastListRef = useRef(null);
  if (view.mode === "list" && view.list) lastListRef.current = view.list;
  const listData = view.mode === "list" ? view.list : lastListRef.current;
  const detail = view.mode === "detail" ? view.detail : null;
  const activeId = detail?.id || "";

  // Patch the cached rows with live completed/favorite state from the detail.
  const listItems = (listData?.items || []).map((item) => (
    detail && item.id === detail.id
      ? { ...item, completed: detail.completed, favorite: detail.favorite }
      : item
  ));
  const activeListItem = listItems.find((item) => item.id === activeId) || null;
  const shownCount = listData?.totalProblems ?? listItems.length;

  // Design keeps a problem selected at all times: auto-open the first row
  // whenever the browser is in plain list mode.
  const autoOpenRef = useRef("");
  useEffect(() => {
    if (view.mode !== "list") {
      autoOpenRef.current = "";
      return;
    }
    const first = view.list?.items?.[0];
    if (!first || autoOpenRef.current === first.id) return;
    autoOpenRef.current = first.id;
    model.openProblem(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const returnToListFromDetail = () => {
    // Explicit Back must win over the automatic first-row selection.
    autoOpenRef.current = listData?.items?.[0]?.id || "";
    model.returnToList();
  };

  const openProblemFromList = (problemId) => {
    model.openProblem(problemId);
    if (typeof window !== "undefined" && window.innerWidth <= 760) {
      window.setTimeout(() => {
        const node = document.getElementById("problemDetail");
        if (!node) return;
        window.scrollTo({
          top: node.getBoundingClientRect().top + window.scrollY - 70,
          behavior: "smooth"
        });
      }, 120);
    }
  };

  const handlePaginationEvent = (event) => {
    model.handlePagination(event);
    // Pagination lives beside an always-open detail: surface the new page.
    if (event?.type !== "keydown" || event?.key === "Enter") {
      model.returnToList();
    }
  };

  const resetAllFilters = () => {
    model.setSearchQuery("");
    model.applyFilter({
      type: "navigation",
      filters: { source: "all", company: "all", theme: "all", difficulty: "all", viewMode: "all", detailId: "" }
    });
    model.returnToList();
  };

  // "navigation" filter actions keep the current detail open, which would
  // leave the cached list column stale — force a fresh list afterwards.
  const applyFilterFromPanel = (action) => {
    model.applyFilter(action);
    if (action?.type === "navigation") model.returnToList();
  };

  const catalogStats = getProblemCatalogStats();
  const subtitle = catalogStats.total > 0
    ? (isEnglish
      ? `${catalogStats.total.toLocaleString("en-US")} problems · ${catalogStats.banks} question banks · mental math / probability / calculus / derivatives & coding`
      : `${catalogStats.total.toLocaleString("en-US")} 道题 · ${catalogStats.banks} 个题库 · 覆盖速算 / 概率 / 微积分 / 衍生品与编程`)
    : (isEnglish
      ? "Practice probability, expectation, games and quant interview fundamentals."
      : "系统练习概率、期望、博弈和 quant 面试基础题。");
  const stats = model.headerStats || { solved: 0, accuracy: null, streak: 0 };

  return (
    <section className="problem-section qg-training-page qg-problems-page">
      <div className="problem-workspace-grid qg-problem-browser">
        <main className="problem-main-column">
          <div className="problem-page-header qg-problems-header">
            <div className="problem-page-copy">
              <span className="rank-label">TRAINING · 题库</span>
              <h2>题目 <span className="qg-problems-title-en">Problems</span></h2>
              <p>{subtitle}</p>
            </div>
            <div className="qg-problems-stats" aria-label={isEnglish ? "Practice stats" : "刷题统计"}>
              <div className="qg-problems-stat">
                <span>{isEnglish ? "Solved" : "已解"}</span>
                <b>{stats.solved}</b>
              </div>
              <div className="qg-problems-stat is-acc">
                <span>{isEnglish ? "Accuracy" : "正确率"}</span>
                <b>{stats.accuracy != null ? <>{stats.accuracy}<i>%</i></> : "--"}</b>
              </div>
              <div className="qg-problems-stat is-streak">
                <span>{isEnglish ? "Streak" : "连续达标"}</span>
                <b>{isEnglish ? `${stats.streak} d` : `${stats.streak} 天`}</b>
              </div>
            </div>
          </div>

          <section className="problem-theme-panel qg-problems-filter-card" aria-label={isEnglish ? "Search and filters" : "搜索与筛选"}>
            <div className="problem-actions qg-problems-search-row">
              <i data-lucide="search" />
              <input
                id="problemSearch"
                type="search"
                placeholder="搜索题目名称 / 知识点…"
                value={model.searchQuery}
                onChange={(event) => model.setSearchQuery(event.target.value)}
                onKeyDown={model.handleSearchKeydown}
              />
              {model.searchQuery ? (
                <button
                  type="button"
                  className="qg-search-clear"
                  aria-label={isEnglish ? "Clear search" : "清除搜索"}
                  onClick={() => model.setSearchQuery("")}
                >
                  ×
                </button>
              ) : null}
              <button className="icon-button ghost hidden" id="addProblemBtn" type="button" title="添加题目" aria-label="添加题目">
                <i data-lucide="book-plus" />
              </button>
            </div>
            <ProblemFilterPanel
              chrome={chrome}
              filters={view.filters || {}}
              isEnglish={isEnglish}
              onApplyFilter={applyFilterFromPanel}
            />
          </section>

          <form id="problemForm" className={`problem-form${model.showProblemForm ? "" : " hidden"}`} onSubmit={model.submitProblemForm}>
            <input id="problemTitleEn" type="text" placeholder="English title" value={model.problemForm.titleEn} onChange={(e) => model.setProblemForm({ ...model.problemForm, titleEn: e.target.value })} />
            <input id="problemTitleZh" type="text" placeholder="中文标题" value={model.problemForm.titleZh} onChange={(e) => model.setProblemForm({ ...model.problemForm, titleZh: e.target.value })} />
            <select id="problemCategory" aria-label="题目类别" value={model.problemForm.category} onChange={(e) => model.setProblemForm({ ...model.problemForm, category: e.target.value })}>
              <option value="leetcode">LeetCode</option>
              <option value="pandasNumpy">Pandas/NumPy</option>
              <option value="probabilityExpectation">Probability/Expectation</option>
              <option value="statistics">Statistics</option>
              <option value="machineLearning">Machine Learning</option>
              <option value="deepLearning">Deep Learning</option>
              <option value="market">Market</option>
              <option value="option">Option</option>
              <option value="mentalMath">Mental Math</option>
            </select>
            <select id="problemDifficulty" aria-label="题目难度" value={model.problemForm.difficulty} onChange={(e) => model.setProblemForm({ ...model.problemForm, difficulty: e.target.value })}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <input id="problemTags" type="text" placeholder="tags: dp, bayes, market-making" value={model.problemForm.tags} onChange={(e) => model.setProblemForm({ ...model.problemForm, tags: e.target.value })} />
            <input id="problemSourceUrl" type="url" placeholder="source url" value={model.problemForm.sourceUrl} onChange={(e) => model.setProblemForm({ ...model.problemForm, sourceUrl: e.target.value })} />
            <textarea id="problemPromptEn" rows={4} placeholder="English prompt" value={model.problemForm.promptEn} onChange={(e) => model.setProblemForm({ ...model.problemForm, promptEn: e.target.value })} />
            <textarea id="problemPromptZh" rows={4} placeholder="中文题干" value={model.problemForm.promptZh} onChange={(e) => model.setProblemForm({ ...model.problemForm, promptZh: e.target.value })} />
            <textarea id="problemAnswer" rows={4} placeholder="答案" value={model.problemForm.answer} onChange={(e) => model.setProblemForm({ ...model.problemForm, answer: e.target.value })} />
            <textarea id="problemExplanation" rows={5} placeholder="解答 / reasoning" value={model.problemForm.explanation} onChange={(e) => model.setProblemForm({ ...model.problemForm, explanation: e.target.value })} />
            <button className="secondary-button" type="submit">
              <i data-lucide="save" />
              保存题目
            </button>
          </form>
          <form id="problemImportForm" className={`problem-import${model.showImportForm ? "" : " hidden"}`} onSubmit={model.submitImportJson}>
            <textarea id="problemJsonInput" rows={3} placeholder="插件 JSON" value={model.importJson} onChange={(e) => model.setImportJson(e.target.value)} />
            <button className="secondary-button" type="submit">
              <i data-lucide="file-json" />
              导入
            </button>
          </form>

          {/* Discovery controls retain the existing collection and Hot 100 behavior. */}
          <section
            className={`leetcode-hot-panel problem-collections-panel${chrome?.collections?.leetcodeExpanded ? " is-expanded" : ""}`}
            aria-labelledby="problemCollectionsTitle"
          >
            <div className="problem-collections-heading">
              <div>
                <span className="rank-label">PLAYLISTS</span>
                <h3 id="problemCollectionsTitle">{model.t("problemCollectionsTitle")}</h3>
              </div>
              <p>{model.t("problemCollectionsHint")}</p>
            </div>
            <div id="problemCollectionGrid" className="problem-collection-grid" aria-label={model.t("problemCollectionsTitle")}>
              <ProblemCollectionGrid
                entries={chrome?.collections?.entries || []}
                filters={view.filters || {}}
                leetcodeExpanded={chrome?.collections?.leetcodeExpanded}
                isEnglish={isEnglish}
                onCollectionClick={model.handleCollectionClick}
              />
            </div>
            <div
              id="leetcodeHotList"
              className={`leetcode-hot-list${chrome?.collections?.leetcodeExpanded ? "" : " hidden"}`}
              aria-live="polite"
            >
              <ProblemLeetcodeHotList
                items={chrome?.collections?.leetcode?.items || []}
                doneIds={chrome?.collections?.leetcode?.doneIds || []}
                expanded={chrome?.collections?.leetcodeExpanded}
                isEnglish={isEnglish}
                t={model.t}
                emptyText={chrome?.collections?.leetcode?.emptyText}
                onToggleDone={model.toggleLeetcodeHotDone}
              />
            </div>
          </section>

          <section className="problem-practice-zone qg-problem-split" aria-label={isEnglish ? "Problem practice list" : "刷题列表"}>
            <div className="problem-browser-toolbar">
              <div
                className="problem-view-tabs"
                role="group"
                aria-label={isEnglish ? "Problem view" : "题目浏览方式"}
                onClick={(event) => {
                  const button = event.target.closest("[data-problem-view]");
                  if (button) model.applyFilter({ type: "viewMode", value: button.dataset.problemView });
                }}
              >
                <button
                  className={`segment${viewMode === "all" ? " active" : ""}`}
                  type="button"
                  data-problem-view="all"
                  aria-pressed={viewMode === "all"}
                >
                  <span className="qg-active-check" aria-hidden="true"><i data-lucide="check" /></span>
                  {model.t("allProblems")}
                </button>
                <button
                  className={`segment${viewMode === "saved" ? " active" : ""}`}
                  type="button"
                  data-problem-view="saved"
                  aria-pressed={viewMode === "saved"}
                >
                  <span className="qg-active-check" aria-hidden="true"><i data-lucide="check" /></span>
                  {model.t("savedProblems")}
                </button>
                <button
                  className={`segment${viewMode === "ranking" ? " active" : ""}`}
                  type="button"
                  data-problem-view="ranking"
                  aria-pressed={viewMode === "ranking"}
                >
                  <span className="qg-active-check" aria-hidden="true"><i data-lucide="check" /></span>
                  {model.t("popularProblems")}
                </button>
              </div>
              <span id="problemInteractionStatus" className="problem-interaction-status" aria-live="polite">
                {chrome?.toolbar?.interactionStatus || ""}
              </span>
              <button
                id="problemSourceFilterClearBtn"
                className={`secondary-button compact${chrome?.toolbar?.showSourceClear ? "" : " hidden"}`}
                type="button"
                onClick={() => model.applyFilter({ type: "clearSource" })}
              >
                <i data-lucide="rotate-ccw" />
                {isEnglish ? "All sources" : "全部题源"}
              </button>
            </div>
            <section id="problemRanking" className={`problem-ranking${view.mode === "ranking" ? "" : " hidden"}`} aria-label={model.t("problemRankingTitle")}>
              <div className="problem-ranking-header">
                <div>
                  <h3>{model.t("problemRankingTitle")}</h3>
                  <p>{model.t("problemRankingHint")}</p>
                </div>
              </div>
              <div id="problemRankingList" className="problem-ranking-list">
                {view.mode === "ranking" ? (
                  <ProblemRankingList
                    items={view.ranking?.items || []}
                    emptyText={view.ranking?.emptyText}
                    t={model.t}
                    onOpen={model.openProblem}
                  />
                ) : null}
              </div>
            </section>
            <div className={`qg-problem-list-card${view.mode === "ranking" ? " hidden" : ""}`}>
              <div className="qg-problem-list-head">
                <div className="qg-problem-list-count">
                  {isEnglish ? "Showing " : "显示 "}
                  <b>{shownCount}</b>
                  {isEnglish ? " problems" : " 题"}
                </div>
                <div className="qg-problem-list-sort">
                  <i data-lucide="arrow-up-down" />
                  {isEnglish ? "Default order" : "默认排序"}
                </div>
              </div>
              <div id="problemList" className={`problem-list${view.mode === "ranking" ? " hidden" : ""}`}>
                {listData?.emptyText ? (
                  <div className="qg-problems-empty">
                    <QuantyImage asset="oops" size="small" />
                    <strong>{listData.emptyText}</strong>
                    <p>{isEnglish ? "Try another difficulty or topic, or clear the filters to browse everything." : "换个难度或主题试试，或清除筛选看全部题库。"}</p>
                    <button type="button" onClick={resetAllFilters}>{isEnglish ? "Clear filters" : "清除筛选"}</button>
                  </div>
                ) : null}
                {listItems.map((item, index) => (
                  <ProblemCard
                    key={item.id}
                    item={item}
                    index={((listData?.page || 1) - 1) * (listData?.pageSize || 24) + index + 1}
                    isActive={item.id === activeId}
                    isEnglish={isEnglish}
                    t={model.t}
                    onOpen={openProblemFromList}
                    onToggleCompleted={model.toggleCompleted}
                    onToggleSaved={model.toggleSaved}
                  />
                ))}
              </div>
              <nav
                id="problemPagination"
                className={`problem-pagination${view.mode !== "ranking" && listData?.pagination?.visible ? "" : " hidden"}`}
                aria-label="题目分页"
              >
                <ProblemPaginationNav
                  pagination={listData?.pagination}
                  isEnglish={isEnglish}
                  onNavigate={handlePaginationEvent}
                />
              </nav>
            </div>
            <article id="problemDetail" className={`problem-detail${view.mode === "detail" ? "" : " hidden"}`} aria-live="polite">
              {view.mode === "detail" ? (
                <ProblemDetail
                  detail={view.detail}
                  listItem={activeListItem}
                  t={model.t}
                  isEnglish={isEnglish}
                  renderInto={model.mountRichText}
                  formatDate={model.formatDate}
                      onBack={returnToListFromDetail}
                  onOpenProblem={model.openProblem}
                  onToggleCompleted={model.toggleCompleted}
                  onToggleSaved={model.toggleSaved}
                  onSelectInterview={model.selectForInterview}
                  onRevealBlock={model.revealBlock}
                  onToggleLike={model.toggleLike}
                  onPostComment={model.postComment}
                  onDeleteComment={model.deleteComment}
                />
              ) : null}
            </article>
          </section>
        </main>
        <aside className="problem-side-rail" hidden>
          <section className="problem-completion-panel" aria-label="题目完成进度">
            <div className="effect-panel-heading">
              <div>
                <span className="rank-label">COMPLETION</span>
                <h2>题目完成进度</h2>
              </div>
            </div>
            <div id="problemCompletionProgress" className="effect-progress-group compact">
              <ProblemCompletionPanel items={chrome?.progress || []} />
            </div>
          </section>
          <section id="problemCompanyPanel" className="problem-company-panel" aria-labelledby="problemCompanyTitle">
            <ProblemCompanyPanel
              chrome={chrome?.companies}
              getInitials={model.getInitials}
              t={model.t}
              onApplyFilter={model.applyFilter}
            />
          </section>
        </aside>
      </div>
    </section>
  );
}
