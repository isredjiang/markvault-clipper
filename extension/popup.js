import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const DEFAULT_FOLDER = "_webClipper";
const DEFAULT_ASSETS_FOLDER = "_webClipper/assets";

const defaultTemplate = {
  id: "default",
  name: "\u9ed8\u8ba4",
  vaultName: "",
  folder: "",
  assetsFolder: "",
  tags: "",
  useSelection: false,
  localizeImages: false
};

const defaults = {
  serverUrl: "",
  token: "",
  language: "zh-CN",
  templates: [defaultTemplate],
  activeTemplateId: "default"
};

const messages = {
  "zh-CN": {
    needServer: "\u8bf7\u5148\u586b\u5199 URL",
    requestFailed: "\u8bf7\u6c42\u5931\u8d25",
    serverNotReady: "\u670d\u52a1\u7aef\u672a\u8fde\u63a5",
    readyFull: "\u51c6\u5907\u526a\u85cf\u5b8c\u6574\u9875\u9762",
    readySelection: "\u68c0\u6d4b\u5230\u5df2\u9009\u4e2d\u6587\u672c",
    clipping: "\u6b63\u5728\u81ea\u52a8\u526a\u85cf...",
    saved: "\u5df2\u4fdd\u5b58",
    savedConnection: "\u8fde\u63a5\u5df2\u4fdd\u5b58",
    savedTemplate: "\u6a21\u677f\u5df2\u4fdd\u5b58",
    deletedTemplate: "\u6a21\u677f\u5df2\u5220\u9664",
    connected: "\u5df2\u8fde\u63a5\u5230\u670d\u52a1\u7aef",
    previewing: "\u6b63\u5728\u751f\u6210\u9884\u89c8...",
    previewReady: "\u9884\u89c8\u5b8c\u6210",
    downloading: "\u6b63\u5728\u751f\u6210\u672c\u5730 Markdown...",
    downloaded: "\u5df2\u4e0b\u8f7d Markdown",
    copied: "\u5df2\u590d\u5236 Markdown",
    copyFailed: "\u590d\u5236\u5931\u8d25",
    templateNameRequired: "\u8bf7\u586b\u5199\u6a21\u677f\u540d\u79f0",
    confirmDelete: "\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u6a21\u677f\u5417\uff1f",
    resetTemplate: "\u5df2\u56de\u5230\u521d\u59cb\u6a21\u677f",
    clipButton: "\u81ea\u52a8\u526a\u85cf",
    templateLabel: "\u6a21\u677f",
    templateNameLabel: "\u6a21\u677f\u540d\u79f0",
    templateNamePlaceholder: "\u9ed8\u8ba4",
    vaultNameLabel: "\u5e93\u540d\u79f0",
    folderLabel: "\u526a\u85cf\u8def\u5f84",
    assetsFolderLabel: "\u8d44\u6e90\u8def\u5f84",
    tagsLabel: "\u6807\u7b7e",
    tagsPlaceholder: "\u4f7f\u7528\u9017\u53f7\u5206\u9694\u591a\u4e2a\u6807\u7b7e",
    selectionLabel: "\u4ec5\u526a\u85cf\u9009\u4e2d\u6587\u672c",
    resourcesLabel: "\u4e0b\u8f7d\u8d44\u6e90",
    saveTemplateButton: "\u4fdd\u5b58\u6a21\u677f",
    deleteButton: "\u5220\u9664",
    previewButton: "\u9884\u89c8 Markdown",
    copyButton: "\u590d\u5236 Markdown",
    downloadButton: "\u4e0b\u8f7d Markdown",
    tokenLabel: "\u4ee4\u724c",
    languageLabel: "\u8bed\u8a00",
    saveConnectionButton: "\u4fdd\u5b58\u8fde\u63a5",
    testButton: "\u6d4b\u8bd5\u8fde\u63a5",
    appTagline: "\u7f51\u9875\u5230\u77e5\u8bc6\u5e93"
  },
  en: {
    needServer: "Please enter URL first",
    requestFailed: "Request failed",
    serverNotReady: "Server not connected",
    readyFull: "Ready to clip full page",
    readySelection: "Selected text detected",
    clipping: "Clipping...",
    saved: "Saved",
    savedConnection: "Connection saved",
    savedTemplate: "Template saved",
    deletedTemplate: "Template deleted",
    connected: "Connected to server",
    previewing: "Generating preview...",
    previewReady: "Preview ready",
    downloading: "Generating local Markdown...",
    downloaded: "Markdown downloaded",
    copied: "Markdown copied",
    copyFailed: "Copy failed",
    templateNameRequired: "Please enter a template name",
    confirmDelete: "Delete this template?",
    resetTemplate: "Reset to the initial template",
    clipButton: "Auto clip",
    templateLabel: "Template",
    templateNameLabel: "Template name",
    templateNamePlaceholder: "Default",
    vaultNameLabel: "Vault name",
    folderLabel: "Clip folder",
    assetsFolderLabel: "Assets folder",
    tagsLabel: "Tags",
    tagsPlaceholder: "Separate tags with commas",
    selectionLabel: "Clip selected text only",
    resourcesLabel: "Download resources",
    saveTemplateButton: "Save template",
    deleteButton: "Delete",
    previewButton: "Preview Markdown",
    copyButton: "Copy Markdown",
    downloadButton: "Download Markdown",
    tokenLabel: "Token",
    languageLabel: "Language",
    saveConnectionButton: "Save connection",
    testButton: "Test connection",
    appTagline: "Web to Vault"
  }
};

let text = messages["zh-CN"];

const $ = id => document.getElementById(id);
let page = null;
let state = { ...defaults };

async function getState() {
  const raw = await chrome.storage.sync.get({
    ...defaults,
    vaultName: "",
    defaultFolder: "",
    assetsFolder: "",
    defaultTags: "",
    useSelection: false,
    localizeImages: false
  });
  const templates = Array.isArray(raw.templates) && raw.templates.length
    ? raw.templates
    : [{
        ...defaultTemplate,
        vaultName: raw.vaultName || "",
        folder: raw.defaultFolder || "",
        assetsFolder: raw.assetsFolder || "",
        tags: raw.defaultTags || "",
        useSelection: Boolean(raw.useSelection),
        localizeImages: Boolean(raw.localizeImages)
      }];
  return {
    serverUrl: raw.serverUrl || "",
    token: raw.token || "",
    language: raw.language || "zh-CN",
    templates: templates.map(normalizeTemplate),
    activeTemplateId: raw.activeTemplateId || templates[0].id || "default"
  };
}

function normalizeTemplate(template) {
  return {
    id: template.id || crypto.randomUUID(),
    name: template.name || "\u672a\u547d\u540d",
    vaultName: template.vaultName || "",
    folder: template.folder || "",
    assetsFolder: template.assetsFolder || "",
    tags: template.tags || "",
    useSelection: Boolean(template.useSelection),
    localizeImages: Boolean(template.localizeImages)
  };
}

async function saveState(message) {
  readConnection();
  await chrome.storage.sync.set({
    serverUrl: state.serverUrl,
    token: state.token,
    language: state.language,
    templates: state.templates,
    activeTemplateId: state.activeTemplateId
  });
  setStatus(message);
}

async function collectPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const meta = name => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || "";
      const byline = meta("author") || meta("article:author") || document.querySelector("[rel='author']")?.textContent || "";
      return {
        title: document.title,
        articleTitle: document.querySelector("h1")?.textContent || "",
        url: location.href,
        html: "<!doctype html>\n" + document.documentElement.outerHTML,
        excerpt: meta("description") || meta("og:description") || "",
        author: byline,
        byline,
        keywords: meta("keywords") || meta("news_keywords") || "",
        selection: String(getSelection() || "")
      };
    }
  });
  return result;
}

function activeTemplate() {
  return state.templates.find(item => item.id === state.activeTemplateId) || state.templates[0] || defaultTemplate;
}

function endpoint(path) {
  const base = String(state.serverUrl || "").replace(/\/$/, "");
  if (!base) throw new Error(text.needServer);
  return `${base}${path}`;
}

async function api(path, options = {}) {
  const response = await fetch(endpoint(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token || ""}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `${text.requestFailed}: ${response.status}`);
  }
  return data;
}

function parseTags(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

function setStatus(message, error = false) {
  $("status").textContent = message;
  $("status").className = error ? "error" : "";
}

function applyLanguage() {
  text = messages[state.language] || messages["zh-CN"];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (text[key]) el.textContent = text[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (text[key]) el.placeholder = text[key];
  });
}

function renderTemplateSelect() {
  const select = $("templateSelect");
  select.innerHTML = "";
  for (const template of state.templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  }
  select.value = activeTemplate().id;
}

function fillEditor() {
  const template = activeTemplate();
  $("templateName").value = template.name;
  $("vaultName").value = template.vaultName;
  $("folder").value = valueOrBlankDefault(template.folder, DEFAULT_FOLDER);
  $("assetsFolder").value = valueOrBlankDefault(template.assetsFolder, DEFAULT_ASSETS_FOLDER);
  $("tags").value = template.tags;
  $("useSelection").checked = Boolean(template.useSelection && page?.selection);
  $("localizeImages").checked = Boolean(template.localizeImages);
}

function readConnection() {
  state.serverUrl = $("serverUrl").value.trim().replace(/\/$/, "");
  state.token = $("token").value;
  state.language = $("language").value;
}

function readEditor() {
  const name = $("templateName").value.trim();
  if (!name) throw new Error(text.templateNameRequired);
  return {
    id: activeTemplate().id,
    name,
    vaultName: $("vaultName").value.trim(),
    folder: $("folder").value.trim() || DEFAULT_FOLDER,
    assetsFolder: $("assetsFolder").value.trim() || DEFAULT_ASSETS_FOLDER,
    tags: $("tags").value.trim(),
    useSelection: $("useSelection").checked,
    localizeImages: $("localizeImages").checked
  };
}

async function init() {
  state = await getState();
  page = await collectPage();
  $("serverUrl").value = state.serverUrl;
  $("token").value = state.token;
  $("language").value = state.language;
  applyLanguage();
  renderTemplateSelect();
  fillEditor();

  try {
    await api("/api/config");
    setStatus(page.selection ? text.readySelection : text.readyFull);
  } catch (error) {
    setStatus(`${text.serverNotReady}: ${error.message}`, true);
  }
}

async function setActiveTemplate(id) {
  await persistCurrentTemplate("");
  state.activeTemplateId = id;
  await chrome.storage.sync.set({ activeTemplateId: id });
  fillEditor();
}

async function persistCurrentTemplate(message = text.savedTemplate) {
  const next = readEditor();
  const sameName = state.templates.find(item => item.name === next.name);
  if (sameName) {
    const target = { ...next, id: sameName.id };
    state.templates = state.templates.map(item => item.id === sameName.id ? target : item);
    state.activeTemplateId = sameName.id;
  } else if (next.id === activeTemplate().id && activeTemplate().name === next.name) {
    state.templates = state.templates.map(item => item.id === next.id ? next : item);
    state.activeTemplateId = next.id;
  } else {
    const created = { ...next, id: crypto.randomUUID() };
    state.templates.push(created);
    state.activeTemplateId = created.id;
  }
  renderTemplateSelect();
  await saveState(message);
}

async function saveTemplate() {
  await persistCurrentTemplate(text.savedTemplate);
}

async function deleteTemplate() {
  if (!confirm(text.confirmDelete)) return;
  const id = activeTemplate().id;
  state.templates = state.templates.filter(item => item.id !== id);
  if (!state.templates.length) {
    state.templates = [{ ...defaultTemplate }];
    state.activeTemplateId = "default";
  } else {
    state.activeTemplateId = state.templates[0].id;
  }
  renderTemplateSelect();
  fillEditor();
  await saveState(id === "default" && state.templates.length === 1 ? text.resetTemplate : text.deletedTemplate);
}

function buildPayload() {
  const template = readEditor();
  return {
    ...page,
    vaultName: template.vaultName,
    folder: template.folder,
    assetsFolder: template.assetsFolder,
    tags: parseTags(template.tags),
    template: template.useSelection ? "selection" : "default",
    selection: template.useSelection ? page.selection : "",
    localizeImages: template.localizeImages,
    imageMode: template.localizeImages ? "local" : "remote"
  };
}

function buildConvertedPayload() {
  const payload = buildPayload();
  const built = localMarkdownPayload(payload);
  return {
    ...payload,
    title: built.title,
    markdown: built.markdown,
    finalMarkdown: true
  };
}

async function clip() {
  readConnection();
  await persistCurrentTemplate("");
  setStatus(text.clipping);
  const response = await api("/api/clip", {
    method: "POST",
    body: JSON.stringify(buildConvertedPayload())
  });
  setStatus(`${text.saved}: ${response.clip.path}`);
}

async function preview() {
  readConnection();
  await persistCurrentTemplate("");
  setStatus(text.previewing);
  $("previewBox").hidden = false;
  $("previewBox").value = localMarkdownPayload().markdown;
  $("copyPreview").hidden = false;
  setStatus(text.previewReady);
}

async function copyPreview() {
  let markdown = $("previewBox").hidden ? "" : $("previewBox").value;
  if (!markdown) {
    markdown = localMarkdownPayload().markdown;
    $("previewBox").hidden = false;
    $("previewBox").value = markdown;
    $("copyPreview").hidden = false;
  }
  try {
    await navigator.clipboard.writeText(markdown);
    setStatus(text.copied);
  } catch (error) {
    setStatus(`${text.copyFailed}: ${error.message}`, true);
  }
}

async function testConnection() {
  readConnection();
  await saveState(text.savedConnection);
  await api("/api/config");
  setStatus(text.connected);
}

function localMarkdownPayload(existingPayload) {
  const payload = existingPayload || buildPayload();
  const article = extractReadableArticle(payload);
  const title = cleanText(article.title || payload.articleTitle || payload.title || getTitle(payload.html) || "Untitled");
  let content = payload.selection
    ? htmlToMarkdown(`<p>${escapeHtml(payload.selection).replace(/\n/g, "<br>")}</p>`, payload.url)
    : article.markdown;
  content = stripLeadingDuplicateTitle(content, title);
  const tags = payload.tags || [];
  return {
    title,
    markdown: renderLocalTemplate({
      title,
      pageTitle: cleanText(payload.title || title),
      url: payload.url || "",
      created: localDateTimeWithZone(),
      tags,
      author: cleanAuthor(article.byline || payload.byline || payload.author || ""),
      excerpt: cleanText(article.excerpt || payload.excerpt || content).slice(0, 260),
      content
    })
  };
}

function extractReadableArticle(payload) {
  const fallbackTitle = cleanText(payload.articleTitle || payload.title || getTitle(payload.html) || "Untitled");
  const fallbackHtml = extractArticleHtml(payload.html || "");
  try {
    const doc = new DOMParser().parseFromString(payload.html || "", "text/html");
    absolutizeDocumentUrls(doc, payload.url);
    const parsed = new Readability(doc, {
      keepClasses: false,
      charThreshold: 500
    }).parse();
    if (parsed?.content && cleanText(parsed.textContent || parsed.content).length > 80) {
      return {
        title: cleanText(parsed.title || fallbackTitle),
        byline: cleanText(parsed.byline || ""),
        excerpt: cleanText(parsed.excerpt || ""),
        markdown: htmlToMarkdown(parsed.content, payload.url)
      };
    }
  } catch (error) {
    console.warn(`Readability failed: ${error.message}`);
  }
  return {
    title: fallbackTitle,
    byline: cleanText(payload.byline || payload.author || ""),
    excerpt: cleanText(payload.excerpt || ""),
    markdown: htmlToMarkdown(fallbackHtml, payload.url)
  };
}

async function downloadMarkdown() {
  await persistCurrentTemplate("");
  setStatus(text.downloading);
  const built = localMarkdownPayload();
  const blob = new Blob([built.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url,
    filename: `${slugify(built.title)}.md`,
    saveAs: false
  });
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  setStatus(text.downloaded);
}

function renderLocalTemplate(data) {
  const tags = data.tags || [];
  const excerpt = data.excerpt
    ? ["> ## Excerpt", ...wrapText(data.excerpt, 100).map(line => `> ${line}`), ""]
    : [];
  const frontMatter = [
    "---",
    `created: ${data.created}`,
    `tags: [${tags.map(tag => String(tag).replace(/[\[\],]/g, " ")).join(", ")}]`,
    `source: ${data.url}`,
    `author: ${data.author || ""}`,
    "---"
  ];
  return [
    ...frontMatter,
    "",
    `# ${data.pageTitle || data.title}`,
    "",
    ...excerpt,
    "---",
    data.content
  ].filter((line, index, arr) => line || arr[index - 1] !== "").join("\n").trim() + "\n";
}

function localDateTime(now = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function localDateTimeWithZone(now = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const zone = `UTC ${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} (${zone})`;
}

function wrapText(value, width) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const lines = [];
  for (let index = 0; index < text.length; index += width) {
    lines.push(text.slice(index, index + width));
  }
  return lines;
}

function getTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]) : "";
}

function stripHtmlNoise(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function extractArticleHtml(html) {
  const clean = stripHtmlNoise(html);
  for (const re of [/<article\b[^>]*>([\s\S]*?)<\/article>/i, /<main\b[^>]*>([\s\S]*?)<\/main>/i]) {
    const match = clean.match(re);
    if (match && cleanText(match[1]).length > 20) return match[1];
  }
  const body = clean.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : clean;
}

function htmlToMarkdown(html, baseUrl) {
  const doc = new DOMParser().parseFromString(`<main>${stripHtmlNoise(html)}</main>`, "text/html");
  absolutizeDocumentUrls(doc, baseUrl);
  doc.querySelectorAll("script, style, noscript, iframe, nav, header, footer, aside, form, button, input, textarea, select, .hide, .hidden, [hidden], [aria-hidden='true']").forEach(el => el.remove());
  const turndown = createTurndownService();
  return cleanupMarkdown(turndown.turndown(doc.body));
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(re);
  return match ? decodeEntities(match[1]) : "";
}

function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
    br: "\n"
  });
  turndown.use(gfm);
  turndown.keep(["sub", "sup"]);
  turndown.addRule("dropEmptyLinks", {
    filter: node => node.nodeName === "A" && !(node.getAttribute("href") || "").trim(),
    replacement: content => content
  });
  turndown.addRule("dropDataImages", {
    filter: node => node.nodeName === "IMG" && (node.getAttribute("src") || "").startsWith("data:"),
    replacement: () => ""
  });
  return turndown;
}

function absolutizeDocumentUrls(doc, baseUrl) {
  doc.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");
    if (href && !href.startsWith("javascript:") && !href.startsWith("#")) {
      link.setAttribute("href", absolutizeUrl(href, baseUrl));
    }
  });
  doc.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-url");
    if (src) img.setAttribute("src", absolutizeUrl(src, baseUrl));
  });
}

function markdownFromChildren(node, context) {
  return Array.from(node.childNodes).map(child => markdownFromNode(child, context)).join("");
}

function markdownFromNode(node, context) {
  if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName.toLowerCase();
  const children = () => markdownFromChildren(node, context).trim();
  if (isHiddenNode(node)) return "";

  if (/^h[1-6]$/.test(tag)) return `\n\n${"#".repeat(Number(tag[1]))} ${children()}\n\n`;
  if (tag === "p") return `\n\n${children()}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "hr") return "\n\n---\n\n";
  if (tag === "strong" || tag === "b") return wrapInline(children(), "**");
  if (tag === "em" || tag === "i") return wrapInline(children(), "*");
  if (tag === "del" || tag === "s" || tag === "strike") return wrapInline(children(), "~~");
  if (tag === "sub") return `<sub>${children()}</sub>`;
  if (tag === "sup") return `<sup>${children()}</sup>`;
  if (tag === "code" && node.parentElement?.tagName?.toLowerCase() !== "pre") {
    return inlineCode(node.textContent || "");
  }
  if (tag === "pre") {
    const code = node.querySelector("code");
    const lang = code ? codeLanguage(code) : "";
    return `\n\n\`\`\`${lang}\n${(code || node).textContent.trim()}\n\`\`\`\n\n`;
  }
  if (tag === "blockquote") {
    const body = cleanupMarkdown(markdownFromChildren(node, context));
    return `\n\n${body.split("\n").map(line => line ? `> ${line}` : ">").join("\n")}\n\n`;
  }
  if (tag === "a") {
    const label = children() || cleanText(node.textContent || "");
    const href = node.getAttribute("href") || "";
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return label;
    return label ? `[${label}](${absolutizeUrl(href, context.baseUrl)})` : absolutizeUrl(href, context.baseUrl);
  }
  if (tag === "img" || tag === "picture") {
    const img = tag === "img" ? node : node.querySelector("img");
    if (!img) return "";
    const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-url");
    if (!src || src.startsWith("data:")) return "";
    const alt = cleanText(img.getAttribute("alt") || img.getAttribute("title") || "");
    return `\n\n![${alt}](${absolutizeUrl(src, context.baseUrl)})\n\n`;
  }
  if (tag === "ul" || tag === "ol") return markdownList(node, context, tag === "ol");
  if (tag === "table") return markdownTable(node, context);
  if (tag === "thead" || tag === "tbody" || tag === "tfoot" || tag === "tr" || tag === "td" || tag === "th") return children();
  if (["article", "main", "section", "div", "figure", "figcaption"].includes(tag)) return `\n\n${markdownFromChildren(node, context)}\n\n`;
  return markdownFromChildren(node, context);
}

function markdownList(node, context, ordered) {
  const items = Array.from(node.children).filter(child => child.tagName?.toLowerCase() === "li");
  const depth = context.listDepth || 0;
  return "\n" + items.map((item, index) => {
    const marker = ordered ? `${index + 1}. ` : "- ";
    const body = cleanupMarkdown(markdownFromChildren(item, { ...context, listDepth: depth + 1 }));
    const indent = "  ".repeat(depth);
    return `${indent}${marker}${body.replace(/\n/g, `\n${indent}  `)}`;
  }).join("\n") + "\n\n";
}

function markdownTable(table, context) {
  const rows = Array.from(table.querySelectorAll("tr"))
    .map(row => Array.from(row.children)
      .filter(cell => ["td", "th"].includes(cell.tagName.toLowerCase()))
      .map(cell => cleanupTableCell(markdownFromChildren(cell, context))));
  if (!rows.length || rows[0].length < 2) return `\n\n${markdownFromChildren(table, context)}\n\n`;
  const width = Math.max(...rows.map(row => row.length));
  const normalized = rows.map(row => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
  const header = normalized[0];
  const divider = Array(width).fill("---");
  const body = normalized.slice(1);
  return "\n\n" + [header, divider, ...body].map(row => `| ${row.join(" | ")} |`).join("\n") + "\n\n";
}

function cleanupMarkdown(markdown) {
  return decodeEntities(String(markdown || ""))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");
}

function cleanupTableCell(value) {
  return cleanupMarkdown(value).replace(/\|/g, "\\|").replace(/\n+/g, "<br>");
}

function wrapInline(value, marker) {
  const text = String(value || "").trim();
  return text ? `${marker}${text}${marker}` : "";
}

function inlineCode(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const ticks = text.includes("`") ? "``" : "`";
  return `${ticks}${text}${ticks}`;
}

function codeLanguage(code) {
  const className = code.getAttribute("class") || "";
  const match = className.match(/(?:language|lang)-([a-z0-9_-]+)/i);
  return match ? match[1] : "";
}

function isHiddenNode(node) {
  const style = node.getAttribute("style") || "";
  return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style);
}

function absolutizeUrl(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function decodeEntities(value) {
  const map = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return map[entity.toLowerCase()] || `&${entity};`;
  });
}

function cleanText(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function cleanAuthor(value) {
  return cleanText(value)
    .split(/\r?\n/)
    .map(part => part.trim())
    .filter(Boolean)[0]
    ?.replace(/\s+\d+\s*人浏览.*$/i, "")
    .replace(/\s*[·•|｜].*$/i, "")
    .replace(/\s+(发表于|发布于|更新于|浏览|阅读).*$/i, "")
    .replace(/\s+\d{4}[-/年]\d{1,2}[-/月]\d{1,2}.*$/i, "")
    .trim() || "";
}

function valueOrBlankDefault(value, defaultValue) {
  return value === defaultValue ? "" : value;
}

function stripLeadingDuplicateTitle(markdown, title) {
  const escaped = String(title || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return markdown;
  return String(markdown || "").replace(new RegExp(`^#\\s+${escaped}\\s*\\n+`, "i"), "");
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugify(value) {
  return String(value || "untitled")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#^[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "untitled";
}

$("templateSelect").addEventListener("change", event => setActiveTemplate(event.target.value));
$("saveTemplate").addEventListener("click", () => saveTemplate().catch(err => setStatus(err.message, true)));
$("deleteTemplate").addEventListener("click", () => deleteTemplate().catch(err => setStatus(err.message, true)));
$("saveConnection").addEventListener("click", () => saveState(text.savedConnection).catch(err => setStatus(err.message, true)));
$("test").addEventListener("click", () => testConnection().catch(err => setStatus(err.message, true)));
$("clip").addEventListener("click", () => clip().catch(err => setStatus(err.message, true)));
$("preview").addEventListener("click", () => preview().catch(err => setStatus(err.message, true)));
$("copyPreview").addEventListener("click", () => copyPreview().catch(err => setStatus(err.message, true)));
$("downloadMarkdown").addEventListener("click", () => downloadMarkdown().catch(err => setStatus(err.message, true)));
$("language").addEventListener("change", async () => {
  state.language = $("language").value;
  applyLanguage();
  await chrome.storage.sync.set({ language: state.language });
});
init().catch(err => setStatus(err.message, true));
