import { findAccountSections } from "../features/account/accountCenterData.js";
import {
  matchesNormalizedText,
  matchesQuery,
  normalizeSearchQuery
} from '../lib/text.js';
import { isModuleVisible } from '../modules/availability.js';

export function buildGlobalSearchResults(query, deps = {}) {
  const {
    state = {},
    t = (key) => key,
    getLanguage = () => "zh",
    getModuleSearchDefs: getDefs = () => getModuleSearchDefs(t),
    isCatalogProblem = () => true,
    createProblemSearchRecord = (problem) => ({ searchText: "", titleEn: problem.titleEn || "", titleZh: problem.titleZh || "" }),
    getProblemSearchOptions = () => ({}),
    formatCategoryLabel = (category) => category,
    scoreProblemSearchRecord = () => 40,
    quantCompanyDefs = [],
    getCompanyProblemStats = () => ({ total: 0 }),
    normalizeJobs = (jobs) => Array.isArray(jobs) ? jobs : [],
    normalizeCourses = (courses) => Array.isArray(courses) ? courses : [],
    skillDefs = {},
    sortNews = (news) => Array.isArray(news) ? news : [],
    inferSource = () => "",
    formatNewsDate = (date) => date || ""
  } = deps;
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  const results = findAccountSections(query).map(section => ({
    type: "setting", typeLabel: getLanguage() === "en" ? "Account & settings" : "账户与设置",
    title: getLanguage() === "en" ? section.en : section.zh,
    detail: section.description[getLanguage() === "en" ? 1 : 0],
    id: section.id, module: "account", rank: 0
  }));

  getDefs().forEach((item) => {
    if (!isModuleVisible(item.module)) return;
    if (!matchesQuery(item.fields, normalized)) return;
    results.push({
      type: "module",
      typeLabel: t("companyTypeModule"),
      title: item.label,
      detail: item.detail,
      module: item.module
    });
  });

  (state.problems || []).filter(isCatalogProblem).forEach((problem) => {
    const isEn = getLanguage() === "en";
    const searchRecord = createProblemSearchRecord(problem, getProblemSearchOptions());
    if (!matchesNormalizedText(searchRecord.searchText, normalized)) return;
    results.push({
      type: "problem",
      typeLabel: t("problems"),
      title: isEn ? searchRecord.titleEn : searchRecord.titleZh,
      detail: `${formatCategoryLabel(problem.category)} · ${problem.difficulty}`,
      id: problem.id,
      rank: scoreProblemSearchRecord(searchRecord, normalized)
    });
  });

  quantCompanyDefs.forEach((company) => {
    if (!isModuleVisible("companies")) return;
    const summary = getLanguage() === "en" ? company.summaryEn : company.summaryZh;
    const stats = getCompanyProblemStats(company);
    const fields = [
      company.name,
      company.short,
      company.tier,
      company.type,
      summary,
      (company.locations || []).join(" "),
      (company.focus || []).join(" "),
      (company.aliases || []).join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "company",
      typeLabel: t("companies"),
      title: company.name,
      detail: `Tier ${company.tier} · ${stats.total} ${t("companyQuestions")}`,
      id: company.slug,
      rank: company.name.toLowerCase().includes(normalized) ? 2 : 12
    });
  });

  normalizeJobs(state.jobs).forEach((job) => {
    if (!isModuleVisible("jobs")) return;
    const fields = [job.company, job.title, job.type, job.location, job.postedAt, (job.tags || []).join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "job",
      typeLabel: t("jobs"),
      title: `${job.company} · ${job.title}`,
      detail: `${job.location} · ${job.type}`,
      id: job.id,
      url: job.url
    });
  });

  normalizeCourses(state.courses).forEach((course) => {
    if (!isModuleVisible("courses")) return;
    const fields = [
      course.title,
      course.platform,
      course.provider,
      course.topic,
      course.level,
      course.summary,
      (course.tags || []).join(" "),
      (course.sources || []).map((source) => `${source.provider} ${source.title} ${source.url}`).join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "course",
      typeLabel: t("courses"),
      title: course.title,
      detail: `${course.platform} · ${course.topic}`,
      id: course.id,
      url: course.url
    });
  });

  Object.entries(skillDefs).forEach(([key, skill]) => {
    const fields = [skill.name, skill.short, skill.subtitle, (skill.keywords || []).join(" "), (skill.subskills || []).join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "skill",
      typeLabel: t("skills"),
      title: skill.name,
      detail: skill.subtitle,
      id: key
    });
  });

  sortNews(state.news || []).forEach((item) => {
    if (!isModuleVisible("news")) return;
    const fields = [item.title, item.titleZh, item.source, item.summary, item.insight, (item.tags || []).join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "news",
      typeLabel: t("news"),
      title: item.titleZh || item.title,
      detail: `${item.source || inferSource(item.sourceUrl)} · ${formatNewsDate(item.publishedAt || item.createdAt)}`,
      id: item.id
    });
  });

  return results
    .sort((a, b) => (a.rank ?? 40) - (b.rank ?? 40))
    .slice(0, 14);
}

export function getModuleSearchDefs(t = (key) => key) {
  return [
    { module: "overview", label: t("overview"), detail: "Dashboard / 总览", fields: [t("overview"), "overview", "dashboard", "总览", "首页", "home"] },
    { module: "plan", label: t("plan"), detail: "Interview prep plan / 备战计划", fields: [t("plan"), "plan", "计划", "备战", "schedule", "baseline"] },
    { module: "experiences", label: t("experiences"), detail: "Interview log / 面经", fields: [t("experiences"), "interview log", "面经", "复盘", "debrief", "experience"] },
    { module: "community", label: t("community"), detail: "Forum / 论坛", fields: [t("community"), "community", "forum", "论坛", "社区", "动态"] },
    { module: "messages", label: t("messages"), detail: "Messages / 聊天", fields: [t("messages"), "messages", "chat", "dm", "私信", "聊天"] },
    { module: "problems", label: t("problems"), detail: "Problem bank / 题库", fields: [t("problems"), "problems", "题目", "题库", "question bank", "problem bank", "概率题"] },
    { module: "interview", label: t("interview"), detail: "Mock interview / 模拟面试", fields: [t("interview"), "interview", "mock", "模拟面试", "面试", "oa"] },
    { module: "pk", label: t("pk"), detail: "PK", fields: [t("pk"), "pk", "对战", "battle"] },
    { module: "news", label: t("news"), detail: "Quant Wire / 新闻", fields: [t("news"), "news", "新闻", "wire", "market news"] },
    { module: "network", label: t("network"), detail: "Network / 人脉", fields: [t("network"), "network", "人脉", "networking"] },
    { module: "resume", label: t("resume"), detail: "Resume / 简历", fields: [t("resume"), "resume", "cv", "简历"] },
    { module: "jobs", label: t("jobs"), detail: "Jobs / 求职", fields: [t("jobs"), "jobs", "job", "求职", "岗位", "申请", "internship", "full-time"] },
    { module: "companies", label: t("companies"), detail: "Companies / 公司", fields: [t("companies"), "companies", "company", "firm", "公司", "tier", "quant firm", "jane street", "citadel", "optiver"] },
    { module: "courses", label: t("courses"), detail: "Courses / 课程", fields: [t("courses"), "course", "courses", "课程", "视频", "youtube", "bilibili", "b站"] },
    { module: "skills", label: t("skills"), detail: "Ability radar / 能力值", fields: [t("skills"), "skills", "ability", "能力值", "雷达", "知识点"] },
    { module: "calendar", label: "训练日历 / Calendar", detail: "个人每日完成记录", fields: ["calendar", "日历", "日期", "完成记录", "daily activity"] },
    { module: "leetcode", label: "LeetCode / 力扣", detail: "刷题进度 · 随机复习", fields: ["leetcode", "力扣", "刷题", "随机复习", "coding"] },
    { module: "technical-interview", label: "Technical Interview", detail: "从紫皮书抽一道技术面试题", fields: ["technical interview", "tech interview", "技术面试", "紫皮书", "purple book"] },
    { module: "behavioral-interview", label: t("behavioralInterview"), detail: "General questions · Bank of America · 回答草稿", fields: ["behavioral interview", "behavioural interview", "行为面试", "behavioral", "general", "company specific", "boa", "bofa", "bank of america", "自我介绍", "strength", "weakness", "conflict", "leadership"] },
    { module: "tracker", label: t("applicationTracker"), detail: "投递记录与求职阶段", fields: ["tracker", "application", "投递", "申请", "stage", "求职阶段"] },
    { module: "tools", label: t("tools"), detail: "Mental math / 速算", fields: [t("tools"), "tools", "drills", "速算", "mental math"] },
    { module: "memory", label: t("memory"), detail: "Memory / 资料笔记", fields: [t("memory"), "memory", "notes", "资料", "笔记"] },
    { module: "account", label: t("account"), detail: "Account & settings / 账户与设置", fields: [t("account"), "account", "账户", "账号", "settings", "设置", "config"] }
  ].filter((item) => isModuleVisible(item.module));
}
