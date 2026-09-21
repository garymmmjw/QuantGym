export const ACCOUNT_SECTIONS = [
  { id: "profile", icon: "user-round", zh: "个人资料", en: "Profile", description: ["头像、昵称与备考方向", "Your identity and preparation goals"], keywords: "头像 昵称 毕业 简历 目标 avatar name graduation resume goal" },
  { id: "security", icon: "key-round", zh: "登录与安全", en: "Login & security", description: ["邮箱、密码与登录方式", "Email, password and sign-in method"], keywords: "修改密码 更改密码 邮箱 登录 password email login google" },
  { id: "preferences", icon: "sliders-horizontal", zh: "语言与偏好", en: "Preferences", description: ["语言、外观与所在地区", "Language, appearance and location"], keywords: "语言 国家 地区 主题 外观 language country region theme dark light" },
  { id: "connections", icon: "link", zh: "关联账户", en: "Connections", description: ["LeetCode 主页与训练记录", "LeetCode profile and practice records"], keywords: "leetcode 力扣 绑定 关联 第三方 hot100 connection bind" },
  { id: "guardian", icon: "users-round", zh: "监护人", en: "Guardian", description: ["监护码与访问权限", "Access codes and sharing permissions"], keywords: "监护人 监护码 家长 提醒 奖励 guardian parent reward sharing" },
  { id: "data", icon: "cloud", zh: "数据与同步", en: "Data & sync", description: ["同步状态、备份与恢复", "Sync status, backup and recovery"], keywords: "数据 云端 同步 备份 导入 导出 清空 cloud sync backup import export reset" },
  { id: "advanced", icon: "code-xml", zh: "高级设置", en: "Advanced", description: ["模型与服务连接", "Model and service connections"], keywords: "高级 接口 模型 API LLM endpoint model client config" }
];

export function findAccountSections(query = "", sections = ACCOUNT_SECTIONS) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sections.filter(section => words.every(word =>
    `${section.zh} ${section.en} ${section.description.join(" ")} ${section.keywords}`.toLowerCase().includes(word)));
}

export function validPassword(value = "") {
  return value.length >= 8 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function normalizeLeetcodeConnection(value) {
  if (!value) return null;
  const username = String(value.username || "").trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(username)) throw new Error("请输入有效的 LeetCode 用户名（1–40 位字母、数字、下划线或连字符）。 / Enter a valid LeetCode username.");
  if (!["leetcode.com", "leetcode.cn"].includes(value.site)) throw new Error("请选择 LeetCode 站点。 / Choose a LeetCode site.");
  return { username, site: value.site };
}

export function leetcodeProfileUrl(connection) {
  const value = normalizeLeetcodeConnection(connection);
  return value ? `https://${value.site}/u/${encodeURIComponent(value.username)}/` : "";
}
