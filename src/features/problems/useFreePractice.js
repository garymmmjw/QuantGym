import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PRACTICE_BANKS, getBankProblems, getBankGroups, getBankStats, getPracticeBank, getSourcePracticeBank, getPracticeBrowserProblems, matchesBankGroup, hasPracticeRecord } from "./practiceBanks.js";


const PAGE_SIZE = 20;
const SELECTION_KEYS = ["bank", "source", "group", "section", "q", "difficulty", "topic", "status", "page", "question"];
const clean = value => String(value || "").trim().toLocaleLowerCase();

export function useFreePractice(model, membership = { isMember: false }) {
  const [params, setParams] = useSearchParams();
  const [companySearch, setCompanySearch] = useState("");
  const catalog = useMemo(() => model.catalogProblems.filter(problem => !getPracticeBank(problem)?.membersOnly || membership.isMember), [model.catalogProblems, membership.isMember]);
  const personal = useMemo(() => new Map((Array.isArray(model.problemStates) ? model.problemStates : []).map(item => [item.problemId, item])), [model.problemStates]);
  const selectedId = params.get("question") || "";
  const selectedProblem = catalog.find(problem => problem.id === selectedId) || null;
  const requestedBankId = params.get("bank");
  const requestedSource = params.get("source");
  const requestedProblem = model.catalogProblems.find(problem => problem.id === selectedId);
  const bank = useMemo(() => (requestedProblem ? getPracticeBank(requestedProblem) : null)
    || PRACTICE_BANKS.find(item => item.id === requestedBankId)
    || getSourcePracticeBank(catalog, requestedSource), [catalog, requestedBankId, requestedSource, requestedProblem]);
  const membershipRequired = Boolean(bank?.membersOnly && !membership.isMember);
  const groupId = params.get("group") || "all";
  const sectionId = params.get("section") || "all";
  const query = params.get("q") || "";
  const difficulty = params.get("difficulty") || "all";
  const status = params.get("status") || "all";
  const topic = params.get("topic") || "all";
  const isEnglish = Boolean(model.view.isEnglish);

  const patch = useCallback((values, { replace = false, reset = false } = {}) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (reset) SELECTION_KEYS.forEach(key => next.delete(key));
      Object.entries(values).forEach(([key, value]) => {
        if (!value || value === "all" || (key === "page" && Number(value) === 1)) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace, preventScrollReset: true });
  }, [setParams]);

  const bankProblems = useMemo(() => getPracticeBrowserProblems(catalog, bank), [catalog, bank]);
  const groups = useMemo(() => bank ? getBankGroups(catalog, bank.id, { isEnglish, problemStates: model.problemStates }) : [], [catalog, bank, isEnglish, model.problemStates]);
  const group = groups.find(item => item.id === groupId);
  const section = group?.children?.find(item => item.id === sectionId);
  const directoryProblems = useMemo(() => bank?.kind === "source" ? bankProblems
    : bankProblems.filter(problem => matchesBankGroup(problem, bank?.id, groupId, sectionId)), [bankProblems, bank, groupId, sectionId]);
  const searchText = useMemo(() => new Map(bankProblems.map(problem => [problem.id, clean([
    problem.titleZh, problem.titleEn, problem.promptZh, problem.promptEn, problem.provenance?.originalNumber, ...(problem.tags || []), ...(problem.companies || [])
  ].join(" "))])), [bankProblems]);
  const filtered = useMemo(() => {
    const terms = clean(query).split(/\s+/).filter(Boolean);
    return directoryProblems.filter(problem => {
      const state = personal.get(problem.id) || {};
      return (difficulty === "all" || clean(problem.difficulty) === clean(difficulty))
        && (topic === "all" || problem.category === topic)
        && (status !== "completed" || hasPracticeRecord(state))
        && (status !== "unfinished" || !hasPracticeRecord(state))
        && (status !== "saved" || state.favorite)
        && terms.every(term => searchText.get(problem.id)?.includes(term));
    });
  }, [directoryProblems, searchText, personal, query, difficulty, status, topic]);
  const requestedPage = Math.floor(Number(params.get("page"))) || 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Only the current question is exempt from the progress filter. Inserting it
  // in its original position also preserves Next after a completed-page reload.
  const filteredIds = new Set(filtered.map(problem => problem.id));
  const sequence = directoryProblems.filter(problem => problem.id === selectedId || filteredIds.has(problem.id));
  const selectedIndex = sequence.findIndex(problem => problem.id === selectedId);
  const navigation = {
    index: selectedIndex,
    total: sequence.length,
    previousId: sequence[selectedIndex - 1]?.id || "",
    nextId: selectedIndex >= 0 ? sequence[selectedIndex + 1]?.id || "" : ""
  };

  const openQuestion = useCallback((problemId) => {
    const problem = catalog.find(item => item.id === problemId);
    if (!problem) return;
    const targetBank = getPracticeBank(problem) || getSourcePracticeBank(catalog, problem.source || problem.bookSlug);
    const changesBank = targetBank && targetBank.id !== bank?.id;
    const selection = targetBank?.kind === "source" ? { source: targetBank.source } : { bank: targetBank?.id || "" };
    patch({ question: problemId, ...(changesBank ? selection : {}) }, { reset: Boolean(changesBank) });
  }, [catalog, bank, patch]);

  const openRef = useRef(model.openProblem);
  const closeRef = useRef(model.returnToList);
  openRef.current = model.openProblem;
  closeRef.current = model.returnToList;
  useEffect(() => {
    if (selectedProblem) openRef.current(selectedProblem.id);
    else closeRef.current();
  }, [selectedProblem?.id, membership.isMember]);

  useEffect(() => {
    const handleOpen = event => {
      const problemId = String(event?.detail?.problemId || "");
      const problem = catalog.find(item => item.id === problemId);
      if (!problem) return;
      const targetBank = getPracticeBank(problem) || getSourcePracticeBank(catalog, problem.source || problem.bookSlug);
      const selection = targetBank?.kind === "source" ? { source: targetBank.source } : { bank: targetBank?.id || "" };
      patch({ ...selection, question: problemId }, { reset: true });
    };
    window.addEventListener("quantgym:problem-open", handleOpen);
    return () => window.removeEventListener("quantgym:problem-open", handleOpen);
  }, [catalog, patch]);

  // Legacy entry points (Library / global search) may set the detail before
  // React mounts. Preserve that explicit selection without auto-picking a row.
  const initialExternal = useRef(model.view.detail?.id || "");
  useEffect(() => {
    if (!initialExternal.current) return;
    if (selectedId) {
      initialExternal.current = "";
      return;
    }
    const id = initialExternal.current;
    if (catalog.some(problem => problem.id === id)) {
      initialExternal.current = "";
      openQuestion(id);
    }
  }, [catalog, selectedId, openQuestion]);

  useEffect(() => {
    setCompanySearch("");
  }, [bank?.id]);

  const resumeKey = `quantgym.practice.resume.${model.accountId}`;
  const [resumes, setResumes] = useState({});
  useEffect(() => {
    try { setResumes(JSON.parse(window.localStorage.getItem(resumeKey) || "{}")); }
    catch { setResumes({}); }
  }, [resumeKey]);
  useEffect(() => {
    if (!selectedProblem || !bank) return;
    setResumes(previous => {
      const next = { ...previous, [bank.id]: selectedProblem.id };
      try { window.localStorage.setItem(resumeKey, JSON.stringify(next)); } catch { /* Read-only storage still allows practice. */ }
      return next;
    });
  }, [selectedProblem?.id, bank?.id, resumeKey]);

  const summaries = useMemo(() => PRACTICE_BANKS.map(item => {
    const stats = getBankStats(catalog, model.problemStates, item.id);
    const lastId = resumes?.[item.id];
    const lastExists = lastId && getBankProblems(catalog, item.id).some(problem => problem.id === lastId);
    return { ...item, ...stats, resumeId: lastExists && !hasPracticeRecord(personal.get(lastId)) ? lastId : stats.nextProblemId };
  }), [catalog, model.problemStates, resumes, personal]);

  const summary = bank?.kind === "source" ? {
    total: bankProblems.length,
    completed: bankProblems.filter(problem => hasPracticeRecord(personal.get(problem.id))).length
  } : summaries.find(item => item.id === bank?.id);

  return {
    bank, groups, group, section, groupId, sectionId, summaries, summary, catalog, membership, membershipRequired,
    bankProblems, directoryProblems, filtered, pageItems, page, totalPages, pageSize: PAGE_SIZE,
    companySearch, setCompanySearch, query, difficulty, status, topic, isEnglish,
    selectedProblem, selectedId, navigation, personal,
    availableCategories: [...new Set(directoryProblems.map(problem => problem.category))],
    selectBank: id => patch(bank?.kind === "source" && id === bank.id ? { source: bank.source } : { bank: id }, { reset: true }),
    goHome: () => patch({}, { reset: true }),
    selectGroup: id => patch({ group: id, section: "", question: "", page: "", topic: "" }),
    selectSection: (parent, id) => patch({ group: parent, section: id, question: "", page: "", topic: "" }),
    setFilter: (key, value) => patch({ [key]: value, question: "", page: "" }, { replace: key === "q" }),
    clearFilters: () => patch({ q: "", difficulty: "", status: "", topic: "", question: "", page: "" }),
    setPage: value => patch({ page: value, question: "" }),
    openQuestion,
    closeQuestion: () => patch({ question: "" }),
    resumeBank: item => patch({ bank: item.id, question: item.resumeId }, { reset: true })
  };
}
