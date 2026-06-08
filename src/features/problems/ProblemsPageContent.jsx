import { EmptyState } from "../../components/common/EmptyState.jsx";
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
import { useProblemsPageModel } from "./problemsHooks.js";

export function ProblemsPageContent() {
  const model = useProblemsPageModel();
  const { view } = model;
  const list = view.list;
  const chrome = view.chrome;
  const viewMode = view.filters?.viewMode || "all";

  return (
    <section className="problem-section">
      <div className="problem-workspace-grid">
        <main className="problem-main-column">
          <div className="problem-page-header">
            <div className="problem-page-copy">
              <span className="rank-label">题库</span>
              <h2>题目</h2>
              <p>系统练习概率、期望、博弈和 quant 面试基础题。</p>
            </div>
            <img src="/assets/generated/mascot-calculator.webp?v=premium-system-2" alt="" loading="lazy" />
            <div className="problem-actions">
              <i data-lucide="search" />
              <input
                id="problemSearch"
                type="search"
                placeholder="搜索题目"
                value={model.searchQuery}
                onChange={(event) => model.setSearchQuery(event.target.value)}
                onKeyDown={model.handleSearchKeydown}
              />
              <button className="icon-button ghost hidden" id="addProblemBtn" type="button" title="添加题目" aria-label="添加题目">
                <i data-lucide="book-plus" />
              </button>
            </div>
          </div>
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
          <section
            className={`leetcode-hot-panel problem-collections-panel${chrome?.collections?.leetcodeExpanded ? " is-expanded" : ""}`}
            aria-labelledby="problemCollectionsTitle"
          >
            <div className="problem-collections-heading">
              <div>
                <span className="rank-label">PLAYLISTS</span>
                <h3 id="problemCollectionsTitle">题单集合</h3>
              </div>
              <p>从常刷集合直接进入题库；LeetCode 会展开原题清单并记录完成状态。</p>
            </div>
            <div id="problemCollectionGrid" className="problem-collection-grid" aria-label="题单集合">
              <ProblemCollectionGrid
                entries={chrome?.collections?.entries || []}
                filters={view.filters || {}}
                leetcodeExpanded={chrome?.collections?.leetcodeExpanded}
                isEnglish={view.isEnglish}
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
                isEnglish={view.isEnglish}
                t={model.t}
                emptyText={chrome?.collections?.leetcode?.emptyText}
                onToggleDone={model.toggleLeetcodeHotDone}
              />
            </div>
          </section>
          <section className="problem-practice-zone" aria-label="刷题列表">
            <div className="problem-browser-toolbar">
              <div
                className="problem-view-tabs"
                role="tablist"
                aria-label="题目浏览方式"
                onClick={(event) => {
                  const button = event.target.closest("[data-problem-view]");
                  if (button) model.applyFilter({ type: "viewMode", value: button.dataset.problemView });
                }}
              >
                <button className={`segment${viewMode === "all" ? " active" : ""}`} type="button" data-problem-view="all">全部题目</button>
                <button className={`segment${viewMode === "saved" ? " active" : ""}`} type="button" data-problem-view="saved">我的收藏</button>
                <button className={`segment${viewMode === "ranking" ? " active" : ""}`} type="button" data-problem-view="ranking">热门排行</button>
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
                全部题源
              </button>
            </div>
            <section className="problem-theme-panel" aria-label="标签筛选">
              <ProblemFilterPanel chrome={chrome} onApplyFilter={model.applyFilter} />
            </section>
            <section id="problemRanking" className={`problem-ranking${view.mode === "ranking" ? "" : " hidden"}`} aria-label="题目排行榜">
              <div className="problem-ranking-header">
                <div>
                  <h3>题目排行榜</h3>
                  <p>按点赞与讨论热度排序，找到值得优先复习的题目。</p>
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
            <div
              id="problemList"
              className={`problem-list${view.mode === "list" ? "" : " hidden"}`}
            >
              {view.mode === "list" && list?.emptyText ? <EmptyState title={list.emptyText} /> : null}
              {view.mode === "list" && list?.items?.map((item) => (
                <ProblemCard
                  key={item.id}
                  item={item}
                  isEnglish={view.isEnglish}
                  t={model.t}
                  onOpen={model.openProblem}
                  onToggleCompleted={model.toggleCompleted}
                  onToggleSaved={model.toggleSaved}
                />
              ))}
            </div>
            <nav
              id="problemPagination"
              className={`problem-pagination${view.mode === "list" && list?.pagination?.visible ? "" : " hidden"}`}
              aria-label="题目分页"
            >
              <ProblemPaginationNav
                pagination={list?.pagination}
                isEnglish={view.isEnglish}
                onNavigate={model.handlePagination}
              />
            </nav>
            <article id="problemDetail" className={`problem-detail${view.mode === "detail" ? "" : " hidden"}`} aria-live="polite">
              {view.mode === "detail" ? (
                <ProblemDetail
                  detail={view.detail}
                  t={model.t}
                  isEnglish={view.isEnglish}
                  renderInto={model.mountRichText}
                  formatDate={model.formatDate}
                  onBack={model.returnToList}
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
        <aside className="problem-side-rail">
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
