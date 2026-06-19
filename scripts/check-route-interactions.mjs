#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || defaultRoot);
const src = path.join(root, "src");
const failures = [];
const warnings = [];

const { MODULE_MANIFEST } = await import(pathToFileURL(path.join(src, "modules", "manifest.js")));
const manifestIds = MODULE_MANIFEST.map((entry) => entry.id);
const contracts = [
  {
    route: "overview",
    files: [
      {
        path: "src/features/overview/OverviewPageContent.jsx",
        checks: [
          ["study plan CTA dispatches", /id="generateStudyPlanBtn"[\s\S]*?onClick=\{model\.generateTodayStudyPlan\}/],
          ["problem progress CTA routes to Problems", /onClick=\{\(\) => model\.openModule\("problems"\)\}/],
          ["leaderboard metric select updates on change/input", all("id=\"leaderboardMetricSelect\"", "onChange={updateLeaderboardMetric}", "onInput={updateLeaderboardMetric}")],
          ["leaderboard scope/country/region selects update", all("id=\"leaderboardScopeSelect\"", "onChange={updateLeaderboardScope}", "id=\"leaderboardCountrySelect\"", "onChange={updateLeaderboardCountry}", "id=\"leaderboardRegionSelect\"", "onChange={updateLeaderboardRegion}")]
        ]
      },
      {
        path: "src/features/overview/overviewHooks.js",
        checks: [
          ["leaderboard setting changes persist through page API", all("api?.updateLeaderboardSettings?.(patch)", "api?.switchModule?.(moduleId)")]
        ]
      },
      {
        path: "src/lib/date.js",
        checks: [
          ["date formatting helpers reject invalid dates without throwing", all("export function dateOrNull(value)", "if (!d) return \"\"", "if (!parsed) return String(date || \"\")", "if (!parsed) return \"\"")],
          ["shared timestamp and ISO helpers use the same finite-date parser", all("export function timestampOrZero(value)", "return dateOrNull(value)?.getTime() || 0", "export function isoOrNow(value", "dateOrNull(value) || dateOrNull(fallback) || new Date()")]
        ]
      }
    ]
  },
  {
    route: "plan",
    files: [
      {
        path: "src/features/plan/PlanPageContent.jsx",
        checks: [
          ["setup form creates plans", /id="prepPlanSetupForm"[\s\S]*?onSubmit=\{createPlan\}/],
          ["baseline diagnostic can submit and restart", all("id=\"prepDiagnosticForm\"", "onSubmit={submitDiagnostic}", "data-prep-start-test=\"true\"", "startDiagnostic(\"pending\")")],
          ["task rows toggle and open target modules", all("data-prep-toggle-task={task.id}", "onClick={() => toggleTask(task.id)}", "data-prep-open={task.action}", "onClick={() => openTask(task.action, task.query || \"\")}")],
          ["external prep links stay safe", all("safeExternalUrl?.(source.url)", "target=\"_blank\"", "rel=\"noopener noreferrer\"")]
        ]
      },
      {
        path: "src/features/plan/planHooks.js",
        checks: [
          ["plan handlers prevent submit defaults and call API", all("event?.preventDefault?.()", "api?.create?.(setup)", "api?.submitDiagnostic?.(diagnosticAnswers)", "api?.openTask?.(action, query)")]
        ]
      },
      {
        path: "src/modules/plan/data.js",
        checks: [
          ["plan week calculations use safe finite timestamps", all("import { timestampOrZero } from '../../lib/date.js'", "const target = timestampOrZero(`${dateText}T12:00:00`)", "const current = timestampOrZero(now)")]
        ]
      },
      {
        path: "src/modules/plan/setup.js",
        checks: [
          ["prep plan setup uses safe ISO fallback for injected dates", all("import { isoOrNow } from '../../lib/date.js'", "return isoOrNow(now)")]
        ]
      },
      {
        path: "src/modules/plan/diagnostic.js",
        checks: [
          ["prep diagnostic updates use safe ISO fallback for injected dates", all("import { isoOrNow } from '../../lib/date.js'", "return isoOrNow(now)")]
        ]
      },
      {
        path: "src/modules/plan/todo.js",
        checks: [
          ["todo plan updates use safe ISO fallback for injected dates", all("import { isoOrNow } from '../../lib/date.js'", "return isoOrNow(now)")]
        ]
      }
    ]
  },
  {
    route: "skills",
    files: [
      {
        path: "src/features/skills/SkillsPageContent.jsx",
        checks: [
          ["radar canvas is interactive", all("id=\"skillRadar\"", "onMouseMove={model.handleRadarMove}", "onMouseLeave={model.clearHover}")],
          ["legend and cards update hover focus state", all("data-skill-radar-key={key}", "onClick={(event) => model.setHover(key, event)}", "data-skill-key={key}", "onFocus={() => model.setHover(key)}")]
        ]
      },
      {
        path: "src/modules/skills/data.js",
        checks: [
          ["skill recency stats use safe finite timestamps", all("import { dayKey, timestampOrZero } from '../../lib/date.js'", "timestampOrZero(entry.date) >= cutoff", "timestampOrZero(b.date) - timestampOrZero(a.date)")]
        ]
      }
    ]
  },
  {
    route: "interview",
    files: [
      {
        path: "src/features/interview/InterviewPageContent.jsx",
        checks: [
          ["language and mode buttons dispatch setup changes", all("data-interview-lang=\"zh\"", "model.selectLanguage(\"zh\")", "data-interview-mode=\"live\"", "model.selectMode(\"live\")")],
          ["advanced setup controls call setup handlers", all("id=\"interviewTypeSelect\"", "model.handleSetupChange(\"type\",", "id=\"interviewSourceSelect\"", "model.handleSetupChange(\"source\",")],
          ["PDF source input keeps file handler", all("id=\"interviewPdfInput\"", "type=\"file\"", "onChange={model.updatePdfMeta}")],
          ["start and resume actions are wired", all("id=\"startInterviewBtn\"", "onClick={model.start}", "id=\"resumeInterviewBtn\"", "onClick={model.resume}")]
        ]
      },
      {
        path: "src/features/interview/InterviewConsole.jsx",
        checks: [
          ["answer form submits and supports keyboard/file input", all("id=\"interviewForm\"", "onSubmit={model.submitAnswer}", "id=\"interviewAnswerFile\"", "onChange={model.updateAnswerFileMeta}", "onKeyDown={model.handleAnswerKeydown}")],
          ["hint/reveal/next/favorite actions remain wired", all("id=\"hintInterviewBtn\"", "onClick={model.requestHint}", "id=\"revealAnswerBtn\"", "onClick={model.revealAnswer}", "id=\"nextInterviewQuestionBtn\"", "onClick={model.nextQuestion}", "id=\"saveInterviewFavoriteBtn\"", "onClick={model.saveFavorite}")]
        ]
      },
      {
        path: "src/modules/interview/viewController.js",
        checks: [
          ["legacy interview favorites use safe finite timestamp sorting", all("import { timestampOrZero } from '../../lib/date.js'", "timestampOrZero(a.createdAt) - timestampOrZero(b.createdAt)")]
        ]
      }
    ]
  },
  {
    route: "problems",
    files: [
      {
        path: "src/features/problems/ProblemsPageContent.jsx",
        checks: [
          ["search input updates query and keyboard open behavior", all("id=\"problemSearch\"", "onChange={(event) => model.setSearchQuery(event.target.value)}", "onKeyDown={model.handleSearchKeydown}")],
          ["view tabs and source clear apply filters", all("data-problem-view=\"saved\"", "model.applyFilter({ type: \"viewMode\"", "id=\"problemSourceFilterClearBtn\"", "model.applyFilter({ type: \"clearSource\" })")],
          ["cards and pagination call page-model actions", all("onOpen={model.openProblem}", "onToggleCompleted={model.toggleCompleted}", "onToggleSaved={model.toggleSaved}", "onNavigate={model.handlePagination}")],
          ["detail reveal/social/comment actions remain wired", all("onRevealBlock={model.revealBlock}", "onToggleLike={model.toggleLike}", "onPostComment={model.postComment}", "onDeleteComment={model.deleteComment}")],
          ["LeetCode collection toggles use React state handler", all("id=\"leetcodeHotList\"", "onCollectionClick={model.handleCollectionClick}", "onToggleDone={model.toggleLeetcodeHotDone}")]
        ]
      },
      {
        path: "src/app/services/problemsPageApi.js",
        checks: [
          ["problem interaction API persists state and pagination", all("setSearchQuery(value)", "applyFilterAction(action)", "openDetail(problemId)", "toggleCompleted(problemId)", "toggleSaved(problemId)", "handlePagination(event)", "deps.saveState?.()")]
        ]
      }
    ]
  },
  {
    route: "tools",
    files: [
      {
        path: "src/features/tools/ToolsPageContent.jsx",
        checks: [
          ["drill setup controls update mode/count/time", all("data-drill={mode}", "model.setMode(mode)", "id=\"drillCountSelect\"", "model.setDrillCount", "id=\"drillTimeSelect\"", "model.setDrillDuration")],
          ["drill answer controls call session actions", all("id=\"startDrillSessionBtn\"", "onClick={model.startSession}", "data-drill-answer={option.value}", "model.checkAnswer(option.value)", "id=\"skipDrillBtn\"", "onClick={model.skip}", "id=\"nextDrillBtn\"", "onClick={model.advance}")],
          ["market game inputs and quote/new actions are wired", all("id=\"marketBidInput\"", "model.setMarketField(\"bid\"", "id=\"submitMarketQuoteBtn\"", "onClick={model.submitMarket}", "id=\"nextMarketGameBtn\"", "onClick={model.newMarket}")]
        ]
      }
    ]
  },
  {
    route: "poker",
    files: [
      {
        path: "src/features/poker/PokerPageContent.jsx",
        checks: [
          ["table/lobby/action/preflop components receive action bundle", all("<PokerTable table={game?.table} actions={model.actions}", "<PokerLobbyPanel game={game} actions={model.actions}", "<PokerActionBar table={game?.table} actions={model.actions}", "onPositionChange={model.actions.setPreflopPosition}", "onHandSelect={model.actions.setPreflopHand}")],
          ["visible leave-table action routes back to tools", all("id=\"pokerLeaveTableBtn\"", "className=\"poker-leave-table-button\"", "model.openModule(\"tools\")")]
        ]
      },
      {
        path: "src/features/poker/PokerActionBar.jsx",
        checks: [
          ["bet actions and quick bets submit through actions", all("data-poker-action=\"call\"", "actions.submitAction?.(\"call\")", "data-poker-action=\"raise\"", "actions.submitAction?.(\"raise\")", "data-poker-quick-bet=\"pot\"", "actions.applyQuickBet?.(\"pot\")", "id=\"nextPokerGameBtn\"", "actions.nextHand?.()")]
        ]
      },
      {
        path: "src/features/poker/PokerTable.jsx",
        checks: [
          ["seat grid can sit/add/remove players", all("onSit={actions.sitAtSeat}", "onAddBot={actions.addBotAtSeat}", "onRemove={actions.removePlayer}")]
        ]
      },
      {
        path: "src/features/poker/PokerPreflopMatrix.jsx",
        checks: [
          ["preflop position and hand cells update selection", all("id=\"pokerPreflopPositionSelect\"", "onChange={(event) => onPositionChange?.(event.target.value)}", "data-hand={handKey}", "onClick={() => onHandSelect?.(handKey)}")]
        ]
      }
    ]
  },
  {
    route: "experiences",
    files: [
      {
        path: "src/features/experiences/ExperiencesPageContent.jsx",
        checks: [
          ["experience record sorting uses safe finite timestamps", all("import { timestampOrZero } from \"../../lib/date.js\"", "timestampOrZero(b.updatedAt) - timestampOrZero(a.updatedAt)")],
          ["experience form creates/edits records", all("id=\"newExperienceBtn\"", "onClick={resetForm}", "id=\"experienceForm\"", "onSubmit={save}", "id=\"experienceFirm\"", "onChange={(e) => update(\"firm\", e.target.value)}")],
          ["filter/edit/delete/share interactions remain wired", all("id=\"experienceFilter\"", "onChange={(e) => setFilter(e.target.value)}", "onClick={() => edit(record)}", "onClick={() => remove(record.id)}", "onClick={() => setPendingShareId(record.id)}", "onClick={() => confirmShare(record.id)}")],
          ["community jump is wired", all("id=\"openCommunityExperiencesBtn\"", "data-jump-module=\"community\"", "onClick={openCommunityExperiences}")]
        ]
      }
    ]
  },
  {
    route: "news",
    files: [
      {
        path: "src/features/news/NewsPageContent.jsx",
        checks: [
          ["add/refresh and form/detail actions are wired", all("id=\"addNewsBtn\"", "model.setShowForm((v) => !v)", "id=\"refreshNewsBtn\"", "onClick={model.refreshNews}", "onSubmit={handleAdd}", "onCancel={() => model.setShowForm(false)}", "onBack={model.closeDetail}", "onOpen={model.openDetail}")]
        ]
      },
      {
        path: "src/features/news/NewsFilters.jsx",
        checks: [
          ["topic/source filter buttons dispatch changes", all("id=\"newsTopicFilter\"", "data-news-topic={topic}", "onClick={() => onTopicChange(topic)}", "id=\"newsSourceFilter\"", "data-news-source-filter={source}", "onClick={() => onSourceChange(source)}")]
        ]
      },
      {
        path: "src/features/news/NewsList.jsx",
        checks: [
          ["news cards open detail without hijacking external links", all("role=\"button\"", "onOpen(item.id)", "if (event.target.closest(\"a\")) return", "onKeyDown={(event)", "target=\"_blank\"", "rel=\"noreferrer\"", "event.stopPropagation()")]
        ]
      },
      {
        path: "src/features/news/NewsDetail.jsx",
        checks: [
          ["detail back and source link are safe", all("id=\"newsBackBtn\"", "onClick={onBack}", "id=\"newsDetailLink\"", "target=\"_blank\"", "rel=\"noreferrer\"")]
        ]
      },
      {
        path: "src/modules/news/data.js",
        checks: [
          ["news sorting uses safe finite timestamps", all("import { timestampOrZero } from '../../lib/date.js'", "return timestampOrZero(item?.publishedAt || item?.createdAt)")]
        ]
      }
    ]
  },
  {
    route: "community",
    files: [
      {
        path: "src/features/community/CommunityPageContent.jsx",
        checks: [
          ["post form submits and media file attaches", all("id=\"communityForm\"", "onSubmit={handleSubmit}", "model.submitPost()", "id=\"communityMedia\"", "type=\"file\"", "model.attachMedia(file)")],
          ["feed filters, like, DM, and comments are wired", all("data-community-filter=\"all\"", "model.setFilter(\"all\")", "data-community-filter=\"experience\"", "model.setFilter(\"experience\")", "model.toggleLike(post.id)", "model.startDirectMessage?.", "model.addComment(post.id, value)")]
        ]
      },
      {
        path: "src/features/community/communityHooks.js",
        checks: [
          ["community hook delegates mutating actions to page API", all("api?.setFilter?.(value)", "api?.addPost?.({ text, media: mediaPreview })", "api?.toggleLike?.(id)", "api?.addComment?.(id, value)", "api?.startDirectMessage?.(user)")]
        ]
      },
      {
        path: "src/modules/community/data.js",
        checks: [
          ["community merge/message sorting uses safe finite timestamps", all("import { timestampOrZero } from '../../lib/date.js'", "timestampOrZero(b.updatedAt) - timestampOrZero(a.updatedAt)", "timestampOrZero(a.createdAt) - timestampOrZero(b.createdAt)", "timestampOrZero(b.createdAt) - timestampOrZero(a.createdAt)")]
        ]
      }
    ]
  },
  {
    route: "messages",
    files: [
      {
        path: "src/features/messages/MessagesPageContent.jsx",
        checks: [
          ["thread selection marks messages read and saves community", all("data-message-thread={thread.id}", "onClick={() => selectThread(thread.id)}", "api.setSelected(threadId)", "api.saveCommunity?.()", "api.updateUnreadBadge?.()")],
          ["composer sends messages and clears draft", all("id=\"messageComposerForm\"", "onSubmit={send}", "id=\"messageComposerInput\"", "onChange={(e) => setDraft(e.target.value)}", "setDraft(\"\")")]
        ]
      }
    ]
  },
  {
    route: "network",
    files: [
      {
        path: "src/features/network/NetworkPageContent.jsx",
        checks: [
          ["network contact sorting uses safe finite timestamps", all("import { timestampOrZero } from \"../../lib/date.js\"", "timestampOrZero(b.updatedAt || b.createdAt) - timestampOrZero(a.updatedAt || a.createdAt)")],
          ["network form can add/edit contacts", all("id=\"addNetworkBtn\"", "setShowForm((v) => !v)", "id=\"networkForm\"", "onSubmit={submit}", "api.setContacts([contact", "pageApi.saveState?.()")],
          ["network cards expose edit/delete interactions", all("data-network-id={contact.id}", "setForm(contact)", "setShowForm(true)", "onClick={() => remove(contact.id)}")]
        ]
      }
    ]
  },
  {
    route: "resume",
    files: [
      {
        path: "src/features/resume/ResumePageContent.jsx",
        checks: [
          ["resume textarea saves text and review form submits", all("id=\"resumeForm\"", "onSubmit={runReview}", "id=\"resumeText\"", "onChange={(event) => setText(event.target.value)}", "id=\"saveResumeBtn\"", "onClick={save}")],
          ["LLM review persists returned items", all("const items = await api.review(text)", "setReview(items || [])", "api.setResume({ ...api.getResume(), review: items || [] })", "pageApi.saveState?.()")]
        ]
      }
    ]
  },
  {
    route: "jobs",
    files: [
      {
        path: "src/features/jobs/JobsPageContent.jsx",
        checks: [
          ["job sorting uses safe finite timestamp helper", all("import { getJobTimestamp } from \"./jobDates.js\"", ".sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a))")],
          ["job filters and refresh are wired", all("data-job-filter={value}", "onClick={() => setFilter(value)}", "id=\"refreshJobsBtn\"", "onClick={() => api.refresh(true)}")],
          ["job application links stay safe", all("href={pageApi.safeExternalUrl?.(job.url) || \"#\"}", "target=\"_blank\"", "rel=\"noreferrer\"")]
        ]
      },
      {
        path: "src/features/jobs/jobDates.js",
        checks: [
          ["job timestamp rejects invalid postedAt values", all("import { timestampOrZero } from \"../../lib/date.js\"", "return timestampOrZero(job.postedAt || job.createdAt)")]
        ]
      }
    ]
  },
  {
    route: "companies",
    files: [
      {
        path: "src/features/companies/CompaniesPageContent.jsx",
        checks: [
          ["tier filter, practice, and careers actions are wired", all("id=\"companyTierFilter\"", "data-company-tier={tier}", "model.setTierFilter(tier)", "data-company-practice={company.slug}", "model.practiceCompany?.(company.slug)", "data-company-careers={company.website}", "model.openCareers?.(company.website)")]
        ]
      },
      {
        path: "src/features/companies/companiesHooks.js",
        checks: [
          ["companies hook uses persistent tier state and external-url opener", all("appServices.companyTierFilterState?.getTier?.()", "appServices.companyTierFilterState?.setTier?.(value)", "practiceCompany: appServices.practiceCompanyProblems", "openCareers: appServices.openExternalUrl")]
        ]
      }
    ]
  },
  {
    route: "library",
    files: [
      {
        path: "src/features/library/LibraryPageContent.jsx",
        checks: [
          ["search/kind filters update model", all("id=\"librarySearch\"", "onChange={(event) => model.setQuery(event.target.value)}", "id=\"libraryKindTabs\"", "data-library-kind={kind}", "onClick={() => model.setKindFilter(kind)}")],
          ["cards support click and keyboard activation", all("role=\"button\"", "onKeyDown={handleKeyDown}", "onClick={() => onAction(entry.id, entry.defaultAction)}", "onClick={() => onAction(entry.id, \"read\")}", "onClick={() => onAction(entry.id, \"practice\")}")],
          ["reader overlay closes and external open is safe", all("id=\"libraryReaderOverlay\"", "model.closeReader()", "id=\"libraryReaderOpenNew\"", "target=\"_blank\"", "rel=\"noreferrer\"", "id=\"libraryReaderClose\"", "onClick={model.closeReader}")]
        ]
      },
      {
        path: "src/features/library/libraryHooks.js",
        checks: [
          ["library hook delegates filters/actions to API", all("api?.getViewModel?.()", "api?.setKindFilter?.(value)", "api?.handleCardAction?.(entryId, action)")]
        ]
      }
    ]
  },
  {
    route: "courses",
    files: [
      {
        path: "src/features/courses/CoursesPageContent.jsx",
        checks: [
          ["learning path sorting uses safe finite timestamps", all("import { timestampOrZero } from \"../../lib/date.js\"", "timestampOrZero(a.pathAddedAt || a.updatedAt) - timestampOrZero(b.pathAddedAt || b.updatedAt)")],
          ["course actions update saved/path/done/source state", all("data-course-action=\"source\"", "handleAction(course.id, \"source\"", "data-course-action=\"save\"", "handleAction(course.id, \"save\")", "data-course-action=\"path\"", "handleAction(course.id, \"path\")", "data-course-action=\"done\"", "handleAction(course.id, \"done\")")],
          ["notes and original links are safe", all("data-course-note={course.id}", "api.updateCourseState(course.id, { note: event.target.value })", "pageApi.safeExternalUrl?.(selected?.url || course.url)", "target=\"_blank\"", "rel=\"noreferrer\"")]
        ]
      }
    ]
  },
  {
    route: "memory",
    files: [
      {
        path: "src/features/memory/MemoryPageContent.jsx",
        checks: [
          ["resource form accepts files/text/sources and saves", all("id=\"addResourceBtn\"", "setShowForm((v) => !v)", "id=\"resourceForm\"", "onSubmit={addResource}", "id=\"resourceFile\"", "onChange={handleResourceFile}", "pageApi.saveState?.()")],
          ["resource links and undo latest are wired", all("pageApi.safeExternalUrl?.(source.url)", "target=\"_blank\"", "rel=\"noreferrer\"", "id=\"clearTodayBtn\"", "api.undoLatestEntry?.()")]
        ]
      }
    ]
  },
  {
    route: "settings",
    files: [
      {
        path: "src/features/settings/SettingsPageContent.jsx",
        checks: [
          ["settings form saves language/location/endpoints", all("id=\"settingsForm\"", "onSubmit={handleSubmit}", "readCurrentSettingsForm(event.currentTarget, form)", "model.save(nextForm)", "id=\"settingsLanguageSelect\"", "model.setLanguage?.(event.target.value)", "id=\"settingsGoogleClientIdInput\"")],
          ["export/import/reset/sync/logout actions are wired", all("id=\"exportBtn\"", "model.exportState?.()", "id=\"importInput\"", "type=\"file\"", "model.importState?.", "id=\"resetBtn\"", "model.resetState?.()", "id=\"syncCloudBtn\"", "onClick={handleSyncCloud}", "id=\"logoutBtn\"", "model.logout?.()")]
        ]
      },
      {
        path: "src/state/data.js",
        checks: [
          ["cloud/import record merge uses safe finite timestamp sorting", all("import { timestampOrZero } from '../lib/date.js'", "timestampOrZero(a.date || a.createdAt) - timestampOrZero(b.date || b.createdAt)")]
        ]
      }
    ]
  },
  {
    route: "account",
    files: [
      {
        path: "src/features/account/AccountPageContent.jsx",
        checks: [
          ["account form saves profile and password fields", all("id=\"accountForm\"", "onSubmit={handleSubmit}", "await model.save()", "id=\"accountNameInput\"", "model.update(\"name\"", "id=\"accountCurrentPassword\"", "model.update(\"currentPassword\"")],
          ["avatar and resume file flows are wired", all("id=\"accountAvatarFile\"", "type=\"file\"", "model.uploadAvatar(file)", "id=\"accountClearAvatarBtn\"", "onClick={model.clearAvatar}", "id=\"accountResumeFile\"", "model.uploadResume(file)")],
          ["admin refresh and logout actions remain wired", all("onClick={model.refreshAdminOverview}", "onClick={model.logout}")]
        ]
      },
      {
        path: "src/app/services/accountPageApi.js",
        checks: [
          ["account API persists save/upload operations", all("async save(values = {})", "deps.saveState?.()", "async uploadResume(file)", "buildResumeUploadState", "formatResumeUploadMeta")]
        ]
      }
    ]
  },
  {
    route: "pk",
    files: [
      {
        path: "src/features/pk/PkPageContent.jsx",
        checks: [
          ["PK start, answer submit, and reveal actions are wired", all("id=\"startPkBtn\"", "onClick={model.start}", "id=\"pkForm\"", "onSubmit={model.submit}", "id=\"pkAnswer\"", "onChange={(event) => model.setAnswer(event.target.value)}", "id=\"pkRevealBtn\"", "onClick={model.reveal}")]
        ]
      },
      {
        path: "src/app/services/pkPageApi.js",
        checks: [
          ["PK API persists answer/reveal flow", all("start()", "submit(answer = \"\")", "deps.saveState?.()", "reveal()")]
        ]
      }
    ]
  }
];

checkContractCoverage();
checkContracts();

const checkCount = contracts.flatMap((contract) => contract.files).reduce((total, file) => total + file.checks.length, 0);
const summary = {
  status: failures.length ? "fail" : "pass",
  routes: manifestIds.length,
  contracts: contracts.length,
  checks: checkCount,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

function checkContractCoverage() {
  const contractIds = contracts.map((contract) => contract.route);
  const missing = manifestIds.filter((id) => !contractIds.includes(id));
  const extra = contractIds.filter((id) => !manifestIds.includes(id));
  if (missing.length) failures.push(`Missing interaction contracts for routes: ${missing.join(", ")}`);
  if (extra.length) failures.push(`Interaction contracts reference unknown routes: ${extra.join(", ")}`);
  const duplicates = [...new Set(contractIds.filter((id, index) => contractIds.indexOf(id) !== index))];
  if (duplicates.length) failures.push(`Duplicate interaction contracts: ${duplicates.join(", ")}`);
}

function checkContracts() {
  for (const contract of contracts) {
    for (const file of contract.files) {
      const absolutePath = path.join(root, file.path);
      let text = "";
      try {
        text = fs.readFileSync(absolutePath, "utf8");
      } catch (error) {
        failures.push(`${contract.route}: missing ${file.path}: ${error.message}`);
        continue;
      }
      for (const [label, matcher] of file.checks) {
        const passed = matcher instanceof RegExp ? matcher.test(text) : matcher(text);
        if (!passed) {
          failures.push(`${contract.route}: ${file.path}: ${label}`);
        }
      }
    }
  }
}

function all(...tokens) {
  return (text) => tokens.every((token) => text.includes(token));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}
