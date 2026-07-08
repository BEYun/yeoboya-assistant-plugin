'use strict';

const fs = require('node:fs');
const path = require('node:path');

// `.assistant/` 전체를 무시한다 — task.json(Notion 캐시)/plan.md(write-code 재생성)/
// workspace.json 모두 로컬 전용이며 각 개발자가 로컬에서 재구성한다.
const HEADER = '# solution-assistant (local-only)';
const GITIGNORE_ENTRIES = [
  '.assistant/',
];

// 대상 repo의 .gitignore에 누락된 엔트리만 idempotent하게 덧붙인다.
// 반환: { added: string[], file: string }
function ensureGitignore(root) {
  const file = path.join(root, '.gitignore');
  let existing = '';
  try { existing = fs.readFileSync(file, 'utf8'); } catch {}

  const present = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = GITIGNORE_ENTRIES.filter((e) => !present.has(e));
  if (!missing.length) return { added: [], file };

  let out = existing;
  if (out.length && !out.endsWith('\n')) out += '\n';
  if (!present.has(HEADER)) out += HEADER + '\n';
  out += missing.join('\n') + '\n';

  fs.writeFileSync(file, out);
  return { added: missing, file };
}

module.exports = { ensureGitignore, GITIGNORE_ENTRIES, HEADER };
