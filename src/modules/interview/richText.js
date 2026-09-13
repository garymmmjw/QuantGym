import { clampNumber } from '../../lib/number.js';
import { parseInterviewFeedbackScore } from './format.js';

export function renderRichText(node, text, options = {}) {
  node.classList.add("rich-text");
  node.textContent = "";
  const normalized = normalizeRichTextContent(text).replace(/\r/g, "");
  if (renderInterviewQuestionCard(node, normalized, options)) return;
  if (renderInterviewFeedbackCard(node, normalized, options)) return;
  const lines = richTextLines(normalized);
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const block = document.createElement("p");
    appendInlineRichText(block, paragraph.join("\n"));
    node.appendChild(block);
    paragraph = [];
  };

  lines.forEach((line) => {
    if (typeof line !== "string") {
      flushParagraph();
      list = null;
      if (line.type === "code") appendFencedCode(node, line);
      else appendMathBlock(node, line.text);
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const hasInlineCode = /`[^`]+`/.test(line);
    const displayMathParts = hasInlineCode ? null : splitDisplayMathLine(line);
    if (!line.trim()) {
      flushParagraph();
      list = null;
      return;
    }
    if (displayMathParts) {
      flushParagraph();
      list = null;
      displayMathParts.forEach((part) => {
        if (!part.text) return;
        if (part.type === "math") {
          appendDisplayMath(node, part.text);
          return;
        }
        const block = document.createElement("p");
        appendInlineRichText(block, part.text);
        node.appendChild(block);
      });
      return;
    }
    if (!hasInlineCode && isStandaloneLatexLine(line)) {
      flushParagraph();
      list = null;
      appendDisplayMath(node, line);
      return;
    }
    if (heading) {
      flushParagraph();
      list = null;
      const level = Math.min(6, 3 + heading[1].length);
      const block = document.createElement(`h${level}`);
      appendInlineRichText(block, heading[2]);
      node.appendChild(block);
      return;
    }
    if (bullet) {
      flushParagraph();
      if (!list) {
        list = document.createElement("ul");
        node.appendChild(list);
      }
      const item = document.createElement("li");
      appendInlineRichText(item, bullet[1]);
      list.appendChild(item);
      return;
    }
    list = null;
    paragraph.push(line);
  });
  flushParagraph();
}

export function renderRichTextBlocks(node, text) {
  const lines = richTextLines(text);
  let paragraph = [];
  let list = null;
  const flush = () => {
    if (!paragraph.length) return;
    const block = document.createElement("p");
    appendInlineRichText(block, paragraph.join("\n"));
    node.appendChild(block);
    paragraph = [];
  };
  lines.forEach((line) => {
    if (typeof line !== "string") {
      flush();
      list = null;
      if (line.type === "code") appendFencedCode(node, line);
      else appendMathBlock(node, line.text);
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (!line.trim()) {
      flush();
      list = null;
      return;
    }
    if (bullet) {
      flush();
      if (!list) {
        list = document.createElement("ul");
        node.appendChild(list);
      }
      const item = document.createElement("li");
      appendInlineRichText(item, bullet[1]);
      list.appendChild(item);
      return;
    }
    list = null;
    paragraph.push(line);
  });
  flush();
}

export function appendInlineRichText(node, text) {
  const value = String(text || "");
  const pattern = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s)]*)?|`[^`]+`|\*\*[^*]+\*\*)/gi;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) node.appendChild(document.createTextNode(value.slice(cursor, match.index)));
    const token = match[0];
    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (imageMatch && isSafeRichMediaUrl(imageMatch[2])) {
      node.appendChild(createRichImage(imageMatch[2], imageMatch[1] || "Interview image"));
    } else if (linkMatch && isSafeRichMediaUrl(linkMatch[2], { allowData: false })) {
      const link = document.createElement("a");
      link.href = linkMatch[2];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = linkMatch[1];
      node.appendChild(link);
    } else if (/^https?:\/\//i.test(token) && isSafeRichMediaUrl(token)) {
      node.appendChild(createRichImage(token, "Interview image"));
    } else {
      const inline = document.createElement(token.startsWith("`") ? "code" : "strong");
      inline.textContent = token.slice(token.startsWith("`") ? 1 : 2, token.startsWith("`") ? -1 : -2);
      node.appendChild(inline);
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) node.appendChild(document.createTextNode(value.slice(cursor)));
}

export function normalizeRichTextContent(text) {
  // Formula cleanup applies to prose only: code may contain literal TeX,
  // nonbreaking spaces, or operators whose spelling must remain unchanged.
  return splitFencedCodeBlocks(text).map((part) => part.type === "code"
    ? part.raw
    : normalizeLatexSource(part.text)
      .replace(/\u00a0/g, " ")
      .replace(/\\\[/g, "\\[")
      .replace(/\\\]/g, "\\]")
      .replace(/\\\(/g, "\\(")
      .replace(/\\\)/g, "\\)")
  ).join("");
}

function richTextLines(text) {
  return splitFencedCodeBlocks(text).flatMap((part) => {
    if (part.type === "code") return [part];
    const lines = [];
    let cursor = 0;
    // Keep a delimited display expression in one DOM node, including every
    // aligned/cases row. Inline code is consumed first so its delimiters stay
    // literal. The existing line heuristics only receive the remaining prose.
    const pattern = /(`+)[\s\S]*?\1|(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]|(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g;
    for (const match of part.text.matchAll(pattern)) {
      if (match[1]) continue;
      lines.push(...part.text.slice(cursor, match.index).split("\n"));
      lines.push({ type: "math", text: match[2] ?? match[3] });
      cursor = match.index + match[0].length;
    }
    lines.push(...part.text.slice(cursor).split("\n"));
    return lines;
  });
}

function splitFencedCodeBlocks(text) {
  const source = String(text || "").replace(/\r\n?/g, "\n");
  const lines = source.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line !== "") || [];
  const parts = [];
  let prose = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].replace(/\n$/, "").match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!opening || (opening[1][0] === "`" && opening[2].includes("`"))) {
      prose.push(lines[index]);
      continue;
    }
    if (prose.length) {
      parts.push({ type: "text", text: prose.join("") });
      prose = [];
    }
    const start = index;
    const closing = new RegExp(`^ {0,3}${opening[1][0]}{${opening[1].length},}[ \\t]*$`);
    const code = [];
    index += 1;
    while (index < lines.length && !closing.test(lines[index].replace(/\n$/, ""))) {
      code.push(lines[index]);
      index += 1;
    }
    const language = opening[2].trim().split(/\s+/)[0] || "";
    parts.push({
      type: "code",
      text: code.join(""),
      raw: lines.slice(start, index + 1).join(""),
      language: /^[a-z0-9_+.#-]{1,40}$/i.test(language) ? language.toLowerCase() : ""
    });
  }
  if (prose.length) parts.push({ type: "text", text: prose.join("") });
  return parts;
}

function appendFencedCode(node, part) {
  const pre = document.createElement("pre");
  // MathJax also skips pre/code by default; this explicit ignore class keeps
  // literal dollar signs and backslashes safe if the global tag list changes.
  pre.className = "rich-code-block tex2jax_ignore";
  pre.tabIndex = 0;
  const code = document.createElement("code");
  if (part.language) code.className = `language-${part.language}`;
  code.textContent = part.text;
  pre.appendChild(code);
  node.appendChild(pre);
}

export function isSafeRichMediaUrl(url, options = {}) {
  const allowData = options.allowData !== false;
  const value = String(url || "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (allowData && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value)) return true;
  return /^(?:\.{0,2}\/|assets\/|data\/)[\w./%-]+\.(?:png|jpe?g|gif|webp|svg)(?:\?.*)?$/i.test(value);
}

export function createRichImage(src, alt = "") {
  const image = document.createElement("img");
  image.className = "rich-media";
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  return image;
}

export function appendMessageAttachments(node, attachments = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const safeAttachments = attachments.filter(Boolean);
  if (!safeAttachments.length) return;
  const tray = document.createElement("div");
  tray.className = "message-attachments";
  safeAttachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "message-attachment";
    if (isImageAttachment(attachment) && attachment.dataUrl) {
      item.appendChild(createRichImage(attachment.dataUrl, attachment.name || "Uploaded image"));
    }
    const label = document.createElement("span");
    label.textContent = [
      attachment.name || (language === "zh" ? "附件" : "Attachment"),
      attachment.size ? `${Math.max(1, Math.round(Number(attachment.size) / 1024))} KB` : ""
    ].filter(Boolean).join(" · ");
    item.appendChild(label);
    tray.appendChild(item);
  });
  node.appendChild(tray);
}

export function appendInterviewActions(node, actions = [], actionStep = "", options = {}) {
  const safeActions = actions.filter((action) => action && action.label);
  if (!safeActions.length) return;
  if (actionStep && !options.isCurrentOnboardingStep?.(actionStep)) return;
  const tray = document.createElement("div");
  tray.className = "interview-action-chips";
  safeActions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interview-action-chip";
    button.dataset.interviewAction = actionStep || "choice";
    button.dataset.interviewActionValue = action.value || action.label;
    button.textContent = action.label;
    if (action.description) button.title = action.description;
    tray.appendChild(button);
  });
  node.appendChild(tray);
}

export function isImageAttachment(attachment) {
  return Boolean(attachment && (String(attachment.type || "").startsWith("image/") || /^data:image\//i.test(attachment.dataUrl || "") || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.name || "")));
}

function renderInterviewQuestionCard(node, text, options = {}) {
  const lines = String(text || "").split("\n");
  const heading = lines[0]?.match(/^#\s+(Q\d+\/\d+)\s+·\s+(.+)$/);
  if (!heading) return false;
  const language = options.language === "en" ? "en" : "zh";
  const titleLineIndex = lines.findIndex((line, index) => index > 0 && /^\*\*.+\*\*$/.test(line.trim()));
  const title = titleLineIndex >= 0 ? lines[titleLineIndex].trim().replace(/^\*\*|\*\*$/g, "") : heading[1];
  const prompt = lines.slice(titleLineIndex >= 0 ? titleLineIndex + 1 : 1).join("\n").trim();

  const card = document.createElement("section");
  card.className = "interview-prompt-card";
  const top = document.createElement("div");
  top.className = "interview-prompt-top";
  const badge = document.createElement("span");
  badge.textContent = heading[1];
  const meta = document.createElement("small");
  meta.textContent = heading[2];
  top.append(badge, meta);

  const titleNode = document.createElement("strong");
  titleNode.className = "interview-prompt-title";
  titleNode.textContent = title || heading[1];
  const body = document.createElement("div");
  body.className = "interview-prompt-body";
  renderRichTextBlocks(body, prompt || (language === "zh" ? "暂无题干。" : "No prompt."));
  card.append(top, titleNode, body);
  node.appendChild(card);
  return true;
}

function renderInterviewFeedbackCard(node, text, options = {}) {
  const data = parseInterviewFeedbackCardText(text);
  if (!data) return false;
  const useZh = options.language !== "en";
  const card = document.createElement("section");
  card.className = "interview-feedback-card";

  const hero = document.createElement("div");
  hero.className = "interview-feedback-hero";
  const score = document.createElement("div");
  score.className = "interview-feedback-score";
  const scoreValue = document.createElement("strong");
  scoreValue.textContent = String(data.score);
  const scoreMeta = document.createElement("span");
  scoreMeta.textContent = "/100";
  score.append(scoreValue, scoreMeta);
  hero.appendChild(score);

  if (data.dimensions.length) {
    const dims = document.createElement("div");
    dims.className = "interview-feedback-dims-inline";
    data.dimensions.forEach((item) => {
      const row = document.createElement("div");
      row.className = "interview-feedback-dim-inline";
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("em");
      value.textContent = `${item.score}/5`;
      row.append(label, value);
      dims.appendChild(row);
    });
    hero.appendChild(dims);
  }
  card.appendChild(hero);

  if (data.summary) {
    const main = document.createElement("div");
    main.className = "interview-feedback-main";
    const title = document.createElement("h5");
    title.textContent = useZh ? "主要反馈" : "Key feedback";
    const copy = document.createElement("p");
    appendInlineRichText(copy, data.summary);
    main.append(title, copy);
    card.appendChild(main);
  }

  if (data.missing.length) {
    const section = document.createElement("section");
    section.className = "interview-feedback-missing";
    const title = document.createElement("h5");
    title.textContent = useZh ? "缺失要点" : "Missing pieces";
    section.appendChild(title);
    const list = document.createElement("ul");
    data.missing.forEach((item) => {
      const li = document.createElement("li");
      appendInlineRichText(li, item);
      list.appendChild(li);
    });
    section.appendChild(list);
    card.appendChild(section);
  }

  node.appendChild(card);
  return true;
}

function parseInterviewFeedbackCardText(text) {
  const source = String(text || "").trim();
  const score = parseInterviewFeedbackScore(source);
  if (score == null || !/(维度分|Dimensions|缺失要点|Missing pieces|真实面试风险|Interview risk)/i.test(source)) return null;
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const findValue = (patterns) => {
    const line = lines.find((item) => patterns.some((pattern) => pattern.test(item)));
    if (!line) return "";
    return line.replace(/^(主要反馈|Key feedback|评价|Evaluation|真实面试风险|Interview risk|参考差距|Reference delta)\s*[:：]\s*/i, "").trim();
  };
  const collectListAfter = (patterns) => {
    const start = lines.findIndex((item) => patterns.some((pattern) => pattern.test(item)));
    if (start < 0) return [];
    const items = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^(维度分|Dimensions|缺失要点|Missing pieces|真实面试风险|Interview risk|参考差距|Reference delta|下一步|Next step)\s*[:：]?$/i.test(line)) break;
      if (/^(真实面试风险|Interview risk|参考差距|Reference delta)\s*[:：]/i.test(line)) break;
      const item = line.replace(/^[-*]\s*/, "").trim();
      if (item) items.push(item);
    }
    return items;
  };
  const dimensions = lines
    .map((line) => line.match(/^[-*]\s*([^:：]+)\s*[:：]\s*(\d(?:\.\d+)?)\s*\/\s*5(?:\s*[-–]\s*(.+))?$/))
    .filter(Boolean)
    .map((match) => ({
      label: match[1].trim(),
      score: Math.round(clampNumber(match[2], 0, 5)),
      comment: String(match[3] || "").trim()
    }));
  return {
    score,
    summary: findValue([/^主要反馈\s*[:：]/i, /^Key feedback\s*:/i, /^评价\s*[:：]/i, /^Evaluation\s*:/i]),
    dimensions,
    missing: collectListAfter([/^缺失要点/i, /^Missing pieces/i])
  };
}

function normalizeLatexSource(text) {
  return String(text || "")
    .replace(/\$\$\$(?=\\)/g, () => "$$\n\n$")
    .replace(/\\(sum|prod|int)_\{([^{}]+)\}\s+\^\{([^{}]+)\}/g, "\\$1_{$2}^{$3}")
    .replace(/\\(sum|prod|int)_\{([^{}]+)\}\s+\^([A-Za-z0-9+-]+)/g, "\\$1_{$2}^{$3}")
    .replace(/\\(sum|prod|int)_([A-Za-z0-9+-]+)\s+\^\{([^{}]+)\}/g, "\\$1_{$2}^{$3}")
    .replace(/\\(sum|prod|int)_([A-Za-z0-9+-]+)\s+\^([A-Za-z0-9+-]+)/g, "\\$1_{$2}^{$3}")
    .replace(/\$\$\s*(?=\\?(?:sum|prod|int|frac|sqrt|lim|begin|left|right|[A-Za-z]\b))/g, () => "$$");
}

function splitDisplayMathLine(line) {
  const raw = String(line || "");
  if (!/(?<!\\)\$\$/.test(raw)) {
    const dollarMatches = Array.from(raw.matchAll(/(?<!\\)\$/g));
    if (dollarMatches.length !== 1) return null;
    const markerIndex = dollarMatches[0].index;
    const before = raw.slice(0, markerIndex).trim();
    const after = raw.slice(markerIndex + 1).trim();
    if (!/[：:]\s*$/.test(before) || !looksLikeLatex(after)) return null;
    return [
      { type: "text", text: before },
      { type: "math", text: after }
    ];
  }
  const parts = raw.split(/(?<!\\)\$\$/);
  const result = [];
  parts.forEach((part, index) => {
    const value = part.trim();
    if (!value) return;
    const isMathSlot = index % 2 === 1;
    if (isMathSlot) {
      result.push({ type: "math", text: value });
      return;
    }
    if (isStandaloneLatexLine(value)) {
      result.push({ type: "math", text: value });
    } else {
      result.push({ type: "text", text: value });
    }
  });
  return result.length ? result : null;
}

function isStandaloneLatexLine(line) {
  const value = String(line || "").trim().replace(/^\${2,}|\${2,}$/g, "").trim();
  if (!value || value.length < 3 || !looksLikeLatex(value)) return false;
  const cjkMatches = value.match(/[\u3400-\u9fff]/g) || [];
  if (cjkMatches.length > 4) return false;
  const proseWords = value
    .replace(/\\[A-Za-z]+/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .match(/[A-Za-z]{3,}/g) || [];
  if (proseWords.length > 4) return false;
  if (value.length > 180 && proseWords.length > 1) return false;
  return true;
}

function looksLikeLatex(value) {
  return /\\(?:sum|prod|int|frac|sqrt|lim|begin|end|left|right|cdot|times|leq|geq|neq|approx|Rightarrow|rightarrow|to|infty|mathbb|mathrm|operatorname|alpha|beta|gamma|theta|sigma|mu|rho|lambda|Delta)|[_^]\{|[=<>≤≥≈]\s*\\/.test(String(value || ""));
}

function appendDisplayMath(node, text) {
  appendMathBlock(node, cleanDisplayLatex(text));
}

function appendMathBlock(node, latex) {
  const block = document.createElement("div");
  block.className = "rich-math-display";
  block.textContent = `\\[${latex}\\]`;
  node.appendChild(block);
}

function cleanDisplayLatex(text) {
  return normalizeLatexSource(String(text || ""))
    .replace(/\${2,}/g, " ")
    .replace(/^\$|\$$/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .trim();
}
