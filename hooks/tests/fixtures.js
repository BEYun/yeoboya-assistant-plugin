// hooks/tests/fixtures.js
// Shared builders for hook-input fixtures. Mirrors the shapes that the actual
// Notion MCP tools accept (Notion-flavored markdown via `content`/`new_str`,
// not Notion REST block JSON).
//
// MCP tool names are `mcp__<server>__<toolName>`. The server segment varies by
// how the Notion connector was registered (a readable name when locally
// configured, a UUID under the claude.ai connector). Builders accept an
// optional `server` so tests can exercise both — the plugin must key off the
// invariant tool-name suffix, not the variable server segment (PRB-01).

const NAMED_SERVER = 'claude_ai_Notion';
const UUID_SERVER = 'c2def5a7-0df8-40b9-949a-af579713a983';

function notionTool(shortName, server = NAMED_SERVER) {
  return `mcp__${server}__${shortName}`;
}

function paragraph(text) { return String(text); }
function heading(level, text) { return `${'#'.repeat(level)} ${text}`; }
function code(lang, content) { return `\`\`\`${lang}\n${content}\n\`\`\``; }
function bulleted(text) { return `- ${text}`; }

function table(rows) {
  if (!rows.length) return '';
  const header = `| ${rows[0].join(' | ')} |`;
  const sep = `| ${rows[0].map(() => '---').join(' | ')} |`;
  const body = rows.slice(1).map((r) => `| ${r.join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

// Join markdown fragments as separate blocks.
function md(...parts) {
  return parts.filter((p) => p != null && p !== '').join('\n\n');
}

// Accept either `markdown` (preferred) or `blocks` (array of markdown
// fragments, auto-joined) so existing call sites stay readable.
function toMarkdown(spec) {
  if (typeof spec?.markdown === 'string') return spec.markdown;
  if (Array.isArray(spec?.blocks)) return spec.blocks.filter(Boolean).join('\n\n');
  return '';
}

function createPagesPayload(pages, opts = {}) {
  const server = opts.server || NAMED_SERVER;
  return {
    tool_name: notionTool('notion-create-pages', server),
    tool_input: {
      parent: { data_source_id: 'fake-ds' },
      pages: pages.map((p) => ({
        properties: { title: p.title },
        content: toMarkdown(p),
      })),
    },
  };
}

function updatePagePayload(spec) {
  const { title, command = 'replace_content', server = NAMED_SERVER } = spec;
  const body = toMarkdown(spec);
  const tool_input = {
    page_id: 'fake-page-id',
    command,
    properties: title ? { title } : {},
    content_updates: [],
  };
  if (command === 'replace_content') tool_input.new_str = body;
  else if (command === 'update_content') {
    tool_input.content_updates = [{ old_str: 'placeholder', new_str: body }];
  }
  return { tool_name: notionTool('notion-update-page', server), tool_input };
}

function createPagesResponse(ids) {
  return { results: ids.map((id) => ({ id })) };
}

function updatePageResponse(id) {
  return { id };
}

module.exports = {
  paragraph,
  heading,
  code,
  table,
  bulleted,
  md,
  notionTool,
  NAMED_SERVER,
  UUID_SERVER,
  createPagesPayload,
  updatePagePayload,
  createPagesResponse,
  updatePageResponse,
};
