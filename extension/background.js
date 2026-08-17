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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clip-selection",
    title: "\u526a\u85cf\u9009\u4e2d\u6587\u672c\u5230 MarkVault",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || info.menuItemId !== "clip-selection") return;
  try {
    const page = await collectFromTab(tab.id);
    page.selection = info.selectionText || "";
    await sendClip(page);
    flashBadge("OK", "#2da44e");
  } catch (error) {
    console.error(error);
    flashBadge("ERR", "#cf222e");
  }
});

async function collectFromTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
      return {
        title: document.title,
        url: location.href,
        html: "<!doctype html>\n" + clone.outerHTML,
        selection: String(getSelection() || "")
      };
    }
  });
  return result;
}

async function getState() {
  const raw = await chrome.storage.sync.get({
    serverUrl: "",
    token: "",
    templates: [defaultTemplate],
    activeTemplateId: "default"
  });
  const templates = Array.isArray(raw.templates) && raw.templates.length ? raw.templates : [defaultTemplate];
  return {
    serverUrl: raw.serverUrl || "",
    token: raw.token || "",
    templates,
    activeTemplateId: raw.activeTemplateId || templates[0].id
  };
}

function activeTemplate(state) {
  return state.templates.find(item => item.id === state.activeTemplateId) || state.templates[0] || defaultTemplate;
}

function parseTags(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

async function sendClip(page) {
  const state = await getState();
  const template = activeTemplate(state);
  const payload = {
    ...page,
    vaultName: template.vaultName || "",
    folder: template.folder || "_webClipper",
    assetsFolder: template.assetsFolder || "_webClipper/assets",
    tags: parseTags(template.tags),
    template: "selection",
    selection: page.selection,
    localizeImages: Boolean(template.localizeImages),
    imageMode: template.localizeImages ? "local" : "remote"
  };
  const response = await api(state, "/api/clip", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(response.error || "Clip failed");
  return response;
}

async function api(state, path, options = {}) {
  const base = String(state.serverUrl || "").replace(/\/$/, "");
  if (!base) throw new Error("Server URL is not configured");
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token || ""}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2200);
}
