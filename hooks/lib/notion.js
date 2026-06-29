'use strict';

const {
  NOTION_TOOL_NAMES, TITLE_TO_KEY: TITLE_TO_KEY_OBJ, KEY_TO_TITLE,
} = require('./constants.json');
const TITLE_TO_KEY = new Map(Object.entries(TITLE_TO_KEY_OBJ));

// Notion MCP tools are named `mcp__<server>__<toolName>`. The server segment
// varies by how the connector was registered (readable name vs claude.ai's
// UUID), but the tool-name suffix is invariant. Match by the suffix so links
// recording works under any server (PRB-01). The single source for these
// suffixes is constants.json `NOTION_TOOL_NAMES`.
function notionToolRegExp(shortName) {
  const escaped = shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^mcp__.+__${escaped}$`);
}

const CREATE_RE = notionToolRegExp(NOTION_TOOL_NAMES.createPages);
const UPDATE_RE = notionToolRegExp(NOTION_TOOL_NAMES.updatePage);

function notionToolKind(toolName) {
  if (typeof toolName !== 'string') return null;
  if (CREATE_RE.test(toolName)) return 'create';
  if (UPDATE_RE.test(toolName)) return 'update';
  return null;
}

function isNotionWriteTool(toolName) {
  return notionToolKind(toolName) !== null;
}

function resolveKey(title) {
  if (typeof title !== 'string') return undefined;
  return TITLE_TO_KEY.get(title.trim());
}

function normalizeTitle(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function pickTitle(p) {
  return normalizeTitle(p?.properties?.title ?? p?.title ?? p?.name ?? '');
}

function extractPagesFromInput(toolName, toolInput) {
  if (!toolInput) return [];
  const kind = notionToolKind(toolName);
  if (kind === 'create') {
    const raw = Array.isArray(toolInput.pages)
      ? toolInput.pages
      : toolInput.page ? [toolInput.page] : [];
    return raw.map((p) => ({
      title: pickTitle(p),
      markdown: typeof p?.content === 'string' ? p.content : '',
    }));
  }
  if (kind === 'update') {
    const cmd = toolInput?.command;
    let markdown = null;
    if (cmd === 'replace_content' && typeof toolInput?.new_str === 'string') {
      markdown = toolInput.new_str;
    } else if (cmd === 'update_content' && Array.isArray(toolInput?.content_updates)) {
      markdown = toolInput.content_updates
        .map((u) => (typeof u?.new_str === 'string' ? u.new_str : ''))
        .join('\n');
    }
    const title = normalizeTitle(toolInput?.properties?.title ?? toolInput?.title ?? '');
    return [{ title, markdown }];
  }
  return [];
}

function extractPageIds(toolResponse) {
  let r = toolResponse;
  if (typeof r === 'string') {
    try { r = JSON.parse(r); } catch { return []; }
  }
  if (!r || typeof r !== 'object') return [];
  if (Array.isArray(r.results) && r.results.length) {
    return r.results.map((x) => x?.id).filter(Boolean);
  }
  const single = r.id ?? r.page_id;
  return single ? [single] : [];
}

module.exports = {
  NOTION_TOOL_NAMES,
  isNotionWriteTool,
  notionToolKind,
  TITLE_TO_KEY,
  KEY_TO_TITLE,
  resolveKey,
  extractPagesFromInput,
  extractPageIds,
};
