const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = process.env.CLIPPER_CONFIG || path.join(__dirname, "config.json");
const SERVICE_NAME = "MarkVault Clipper";
const DEFAULT_CONFIG = {
  host: "0.0.0.0",
  port: 3217,
  token: "change-me",
  vaultPath: path.resolve(process.cwd(), "vault"),
  vaultsRoot: "",
  defaultVaultName: "",
  defaultFolder: "_webClipper",
  assetsFolder: "_webClipper/assets",
  corsOrigins: ["*"],
  defaultTags: [],
  localizeImages: true,
  imageLinkMode: "wikilink",
  maxBodyBytes: 8 * 1024 * 1024,
  filenameDatePrefix: true,
  templates: {
    default: "---\ntitle: \"{{title}}\"\nurl: {{url}}\ncreated: {{created}}\ntags:\n{{tagsYaml}}\n---\n\n# {{title}}\n\n> Source: {{url}}\n\n{{content}}\n",
    selection: "---\ntitle: \"{{title}}\"\nurl: {{url}}\ncreated: {{created}}\ntags:\n{{tagsYaml}}\nclip_type: selection\n---\n\n# {{title}}\n\n> Source: {{url}}\n\n{{content}}\n"
  },
  siteRules: []
};

function configHelp(extra = "") {
  const sample = {
    host: "0.0.0.0",
    port: 3217,
    token: "change-this-token",
    vaultPath: "/vault",
    vaultsRoot: "/vaults",
    defaultVaultName: "",
    defaultFolder: "_webClipper",
    assetsFolder: "_webClipper/assets"
  };
  return [
    "",
    `[config] ${extra}`,
    `[config] Expected a JSON file at: ${CONFIG_PATH}`,
    "[config] Example:",
    JSON.stringify(sample, null, 2),
    ""
  ].join("\n");
}

function envBool(value) {
  if (value == null || value === "") return undefined;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function envList(value) {
  if (value == null || value === "") return undefined;
  return String(value).split(",").map(item => item.trim()).filter(Boolean);
}

function envNumber(value) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function envConfig() {
  const env = process.env;
  const result = {};
  const entries = [
    ["MARKVAULT_HOST", "host"],
    ["MARKVAULT_PORT", "port", envNumber],
    ["MARKVAULT_TOKEN", "token"],
    ["MARKVAULT_VAULT_PATH", "vaultPath"],
    ["MARKVAULT_VAULTS_ROOT", "vaultsRoot"],
    ["MARKVAULT_DEFAULT_VAULT", "defaultVaultName"],
    ["MARKVAULT_DEFAULT_FOLDER", "defaultFolder"],
    ["MARKVAULT_ASSETS_FOLDER", "assetsFolder"],
    ["MARKVAULT_CORS_ORIGINS", "corsOrigins", envList],
    ["MARKVAULT_DEFAULT_TAGS", "defaultTags", envList],
    ["MARKVAULT_LOCALIZE_IMAGES", "localizeImages", envBool],
    ["MARKVAULT_IMAGE_LINK_MODE", "imageLinkMode"],
    ["MARKVAULT_MAX_BODY_BYTES", "maxBodyBytes", envNumber],
    ["MARKVAULT_FILENAME_DATE_PREFIX", "filenameDatePrefix", envBool]
  ];

  for (const [envName, key, transform] of entries) {
    const raw = env[envName];
    const value = transform ? transform(raw) : raw;
    if (value !== undefined && value !== "") result[key] = value;
  }
  return result;
}

function normalizeConfig(user, envOverrides = {}) {
  const normalized = { ...user, ...envOverrides };
  if (normalized.vaultRoot && !normalized.vaultsRoot) {
    normalized.vaultsRoot = normalized.vaultRoot;
  }
  return {
    ...DEFAULT_CONFIG,
    ...normalized,
    templates: { ...DEFAULT_CONFIG.templates, ...(normalized.templates || {}) }
  };
}

function loadConfig() {
  let user = {};
  const envOverrides = envConfig();
  const usingEnvOnly = !fs.existsSync(CONFIG_PATH) && Object.keys(envOverrides).length > 0;

  if (fs.existsSync(CONFIG_PATH)) {
    const stat = fs.statSync(CONFIG_PATH);
    if (stat.isDirectory()) {
      throw new Error(configHelp("The config path is a directory, not a file. Delete that directory and create config.json as a real JSON file, or remove the CLIPPER_CONFIG mount and use MARKVAULT_* environment variables."));
    }
    if (!stat.isFile()) {
      throw new Error(configHelp("The config path exists, but it is not a regular file."));
    }

    try {
      user = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new Error(configHelp(`Failed to parse config JSON: ${error.message}`));
    }
  } else if (!usingEnvOnly) {
    console.warn(configHelp("Config file was not found. Starting with defaults. For Docker, set MARKVAULT_TOKEN and MARKVAULT_VAULTS_ROOT in environment, or mount a JSON config file."));
  }

  return normalizeConfig(user, envOverrides);
}

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function send(res, status, data, origin) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin(origin),
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Clipper-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(body);
}

function connectionInfo() {
  return {
    ok: true,
    name: SERVICE_NAME,
    message: "MarkVault Clipper API connected successfully.",
    messageZh: "MarkVault Clipper API 连接成功。",
    endpoints: ["/api/health", "/api/config", "/api/clip", "/api/preview"]
  };
}

function allowedOrigin(origin) {
  if (!origin) return "*";
  if ((config.corsOrigins || []).includes("*")) return "*";
  return config.corsOrigins.includes(origin) ? origin : "null";
}

function requireAuth(req) {
  if (!config.token || config.token === "change-me") return true;
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerToken = req.headers["x-clipper-token"];
  return bearer === config.token || headerToken === config.token;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeJoin(base, rel) {
  const target = path.resolve(base, rel || ".");
  const root = path.resolve(base);
  if (!target.startsWith(root + path.sep) && target !== root) {
    throw new Error("Path escapes vault");
  }
  return target;
}

function slugify(name) {
  return String(name || "untitled")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#^[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "untitled";
}

function isoLocalDate(now = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isoLocalDateTime(now = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function uniqueFilePath(folder, baseName, ext = ".md") {
  let candidate = path.join(folder, `${baseName}${ext}`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(folder, `${baseName}-${index}${ext}`);
    index += 1;
  }
  return candidate;
}

function stripHtmlNoise(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function getTitle(html, fallback) {
  if (fallback) return cleanText(fallback);
  const m = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(m ? decodeEntities(m[1]) : "Untitled");
}

function extractArticleHtml(html) {
  const clean = stripHtmlNoise(html);
  for (const re of [/<article\b[^>]*>([\s\S]*?)<\/article>/i, /<main\b[^>]*>([\s\S]*?)<\/main>/i]) {
    const m = clean.match(re);
    if (m && cleanText(m[1]).length > 20) return m[1];
  }
  const candidates = [
    /<div\b[^>]+(?:id|class)=["'][^"']*(?:content|article|post|entry)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<body\b[^>]*>([\s\S]*?)<\/body>/i
  ];
  for (const re of candidates) {
    const m = clean.match(re);
    if (m && cleanText(m[1]).length > 200) return m[1];
  }
  return clean;
}

function decodeEntities(text) {
  const map = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return String(text || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return map[entity.toLowerCase()] || `&${entity};`;
  });
}

function cleanText(text) {
  return decodeEntities(String(text || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absolutizeUrl(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function htmlToMarkdown(html, baseUrl) {
  let out = stripHtmlNoise(html);
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/p>/gi, "\n\n");
  out = out.replace(/<p\b[^>]*>/gi, "");
  out = out.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => `\n\n${"#".repeat(Number(level))} ${cleanText(body)}\n\n`);
  out = out.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, body) => {
    const md = htmlToMarkdown(body, baseUrl).trim();
    return `\n\n${md.split(/\n/).map(line => `> ${line}`).join("\n")}\n\n`;
  });
  out = out.replace(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, body) => `\n\n\`\`\`\n${decodeEntities(body).trim()}\n\`\`\`\n\n`);
  out = out.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, body) => `\`${decodeEntities(body).trim()}\``);
  out = out.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  out = out.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  out = out.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  out = out.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  out = out.replace(/<img\b[^>]*>/gi, tag => {
    const src = attr(tag, "src") || attr(tag, "data-src");
    const alt = attr(tag, "alt") || "";
    if (!src) return "";
    return `![${cleanText(alt)}](${absolutizeUrl(src, baseUrl)})`;
  });
  out = out.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, body) => {
    const text = cleanText(body);
    const full = absolutizeUrl(decodeEntities(href), baseUrl);
    return text ? `[${text}](${full})` : full;
  });
  out = out.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => `\n- ${htmlToMarkdown(body, baseUrl).trim().replace(/\n+/g, "\n  ")}`);
  out = out.replace(/<\/?(ul|ol)\b[^>]*>/gi, "\n");
  out = out.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
  out = out.replace(/<[^>]+>/g, "");
  out = decodeEntities(out);
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const m = tag.match(re);
  return m ? decodeEntities(m[1]) : "";
}

function findRule(url) {
  const rules = config.siteRules || [];
  return rules.find(rule => {
    if (!rule.match) return false;
    if (rule.match.startsWith("/") && rule.match.endsWith("/")) {
      return new RegExp(rule.match.slice(1, -1)).test(url);
    }
    return String(url || "").includes(rule.match);
  }) || {};
}

function tagsYaml(tags) {
  return (tags || []).map(tag => `  - ${String(tag).replace(/"/g, '\\"')}`).join("\n");
}

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function stripLeadingDuplicateTitle(markdown, title) {
  const escaped = escapeRegExp(String(title || "").trim());
  if (!escaped) return markdown;
  const re = new RegExp(`^#\\s+${escaped}\\s*\\n+`, "i");
  return String(markdown || "").replace(re, "");
}

function parseImageLinks(markdown) {
  const links = [];
  markdown.replace(/!\[[^\]]*]\((https?:\/\/[^)]+)\)/g, (_, url) => {
    links.push(url);
    return "";
  });
  return [...new Set(links)];
}

function download(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "MarkVaultClipper/0.1" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(download(absolutizeUrl(res.headers.location, url)));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Image download failed ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "" }));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Image download timeout"));
    });
  });
}

function extFromContentType(contentType, url) {
  const lower = String(contentType || "").toLowerCase();
  if (lower.includes("jpeg")) return ".jpg";
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  try {
    const ext = path.extname(new URL(url).pathname);
    if (/^\.(jpg|jpeg|png|webp|gif|svg)$/i.test(ext)) return ext;
  } catch {}
  return ".img";
}

async function processImages(markdown, noteBaseName, vaultPath, assetsFolderRel) {
  const urls = parseImageLinks(markdown);
  if (!urls.length) return markdown;
  const assetRelFolder = path.posix.join(assetsFolderRel, noteBaseName);
  const assetFolder = safeJoin(vaultPath, assetRelFolder);
  fs.mkdirSync(assetFolder, { recursive: true });

  let next = markdown;
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    try {
      const { buffer, contentType } = await download(url);
      const ext = extFromContentType(contentType, url);
      const name = `${String(index + 1).padStart(2, "0")}-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 10)}${ext}`;
      fs.writeFileSync(path.join(assetFolder, name), buffer);
      const replacementUrl = `${assetRelFolder}/${name}`;
      const escaped = escapeRegExp(url);
      if (config.imageLinkMode === "wikilink") {
        next = next.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, "g"), `![[${replacementUrl}]]`);
      } else {
        next = next.replace(new RegExp(`(!\\[[^\\]]*\\])\\(${escaped}\\)`, "g"), `$1(${replacementUrl})`);
      }
    } catch (error) {
      console.warn(`Could not process image ${url}: ${error.message}`);
    }
  }
  return next;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveVault(input = {}) {
  const vaultName = String(input.vaultName || config.defaultVaultName || "").trim();
  if (!vaultName) {
    return {
      vaultName: "",
      vaultPath: path.resolve(config.vaultPath)
    };
  }
  const root = path.resolve(config.vaultsRoot || config.vaultPath);
  const vaultPath = safeJoin(root, vaultName);
  if (!fs.existsSync(vaultPath) || !fs.statSync(vaultPath).isDirectory()) {
    throw new Error(`Vault does not exist: ${vaultName}`);
  }
  return { vaultName, vaultPath };
}

function publicConfig() {
  return {
    defaultVaultName: config.defaultVaultName || "",
    defaultFolder: config.defaultFolder,
    assetsFolder: config.assetsFolder,
    defaultTags: config.defaultTags || [],
    localizeImages: config.localizeImages,
    templates: Object.keys(config.templates || {}),
    siteRules: (config.siteRules || []).map(rule => ({
      match: rule.match,
      folder: rule.folder,
      tags: rule.tags || [],
      template: rule.template || "",
      localizeImages: rule.localizeImages
    }))
  };
}

async function buildClip(input, options = {}) {
  const vault = resolveVault(input);
  const url = input.url || "";
  const rule = findRule(url);
  const title = getTitle(input.html, input.title);
  const folderRel = input.folder || rule.folder || config.defaultFolder;
  const assetsFolderRel = input.assetsFolder || config.assetsFolder;
  const folderAbs = safeJoin(vault.vaultPath, folderRel);
  const datePrefix = config.filenameDatePrefix ? `${isoLocalDate()}-` : "";
  const noteBaseName = `${datePrefix}${slugify(title)}`;

  if (input.finalMarkdown && typeof input.markdown === "string") {
    const shouldProcessImages = input.localizeImages ?? rule.localizeImages ?? config.localizeImages;
    let note = input.markdown;
    if (shouldProcessImages && !options.preview) {
      note = await processImages(note, noteBaseName, vault.vaultPath, assetsFolderRel);
    }
    return {
      note,
      title,
      url,
      tags: unique([...(config.defaultTags || []), ...(rule.tags || []), ...(input.tags || [])]),
      folderAbs,
      folderRel,
      noteBaseName,
      mode: input.selection ? "selection" : "page",
      rule,
      vault
    };
  }

  const selected = input.selection && String(input.selection).trim();
  const html = selected ? `<p>${escapeHtml(selected).replace(/\n/g, "<br>")}</p>` : extractArticleHtml(input.html || "");
  let content = input.markdown || htmlToMarkdown(html, url);
  content = stripLeadingDuplicateTitle(content, title);
  if (input.highlights && input.highlights.length) {
    content += "\n\n## Highlights\n\n" + input.highlights.map(h => `> ${String(h).trim()}`).join("\n\n");
  }

  const shouldProcessImages = input.localizeImages ?? rule.localizeImages ?? config.localizeImages;
  if (shouldProcessImages && !options.preview) {
    content = await processImages(content, noteBaseName, vault.vaultPath, assetsFolderRel);
  }

  const tags = unique([...(config.defaultTags || []), ...(rule.tags || []), ...(input.tags || [])]);
  const templateName = input.template || rule.template || (selected ? "selection" : "default");
  const template = config.templates[templateName] || config.templates.default;
  const note = renderTemplate(template, {
    title: title.replace(/"/g, '\\"'),
    url,
    created: isoLocalDateTime(),
    date: isoLocalDate(),
    tags: tags.join(", "),
    tagsYaml: tagsYaml(tags),
    excerpt: cleanText(content).slice(0, 240),
    content
  });
  return { note, title, url, tags, folderAbs, folderRel, noteBaseName, mode: selected ? "selection" : "page", rule, vault };
}

async function handlePreview(req, res, origin) {
  if (!requireAuth(req)) return send(res, 401, { ok: false, error: "Unauthorized" }, origin);
  const raw = await readBody(req);
  const input = JSON.parse(raw || "{}");
  const built = await buildClip(input, { preview: true });
  send(res, 200, {
    ok: true,
    markdown: built.note,
    title: built.title,
    folder: built.folderRel,
    tags: built.tags,
    matchedRule: built.rule.match || ""
  }, origin);
}

async function handleClip(req, res, origin) {
  if (!requireAuth(req)) return send(res, 401, { ok: false, error: "Unauthorized" }, origin);
  const raw = await readBody(req);
  const input = JSON.parse(raw || "{}");
  const built = await buildClip(input);

  fs.mkdirSync(built.folderAbs, { recursive: true });
  const filePath = uniqueFilePath(built.folderAbs, built.noteBaseName);
  fs.writeFileSync(filePath, built.note, "utf8");
  const relPath = path.relative(built.vault.vaultPath, filePath).replace(/\\/g, "/");
  const entry = {
    title: built.title,
    url: built.url,
    path: relPath,
    vaultName: built.vault.vaultName,
    created: new Date().toISOString(),
    tags: built.tags,
    mode: built.mode,
    matchedRule: built.rule.match || ""
  };
  send(res, 200, { ok: true, clip: entry }, origin);
}

function unique(values) {
  return [...new Set(values.map(v => String(v).trim()).filter(Boolean))];
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function route(req, res) {
  const origin = req.headers.origin;
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin(origin),
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Clipper-Token",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    res.end();
    return;
  }
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/api" || u.pathname === "/api/health")) {
      return send(res, 200, { ...connectionInfo(), vaultPath: config.vaultPath, vaultsRoot: config.vaultsRoot || "" }, origin);
    }
    if (req.method === "GET" && u.pathname === "/api/config") {
      if (!requireAuth(req)) return send(res, 401, { ok: false, error: "Unauthorized" }, origin);
      return send(res, 200, { ok: true, config: publicConfig() }, origin);
    }
    if (req.method === "POST" && u.pathname === "/api/reload") {
      if (!requireAuth(req)) return send(res, 401, { ok: false, error: "Unauthorized" }, origin);
      config = loadConfig();
      return send(res, 200, { ok: true }, origin);
    }
    if (req.method === "POST" && u.pathname === "/api/clip") {
      return await handleClip(req, res, origin);
    }
    if (req.method === "POST" && u.pathname === "/api/preview") {
      return await handlePreview(req, res, origin);
    }
    send(res, 404, { ok: false, error: "Not found" }, origin);
  } catch (error) {
    send(res, 500, { ok: false, error: error.message }, origin);
  }
}

const server = http.createServer(route);
server.listen(config.port, config.host, () => {
  console.log(`${SERVICE_NAME} listening on http://${config.host}:${config.port}`);
});
