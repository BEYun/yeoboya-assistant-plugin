const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ensureGitignore, GITIGNORE_ENTRIES } = require('../lib/gitignore');

function tmpRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'yb-gitignore-')); }
function gi(root) { return path.join(root, '.gitignore'); }

test('GITIGNORE_ENTRIES ignores the whole .assistant folder', () => {
  assert.deepEqual(GITIGNORE_ENTRIES, [
    '.assistant/',
  ]);
});

test('creates .gitignore with all entries when none exists', () => {
  const root = tmpRoot();
  const res = ensureGitignore(root);
  assert.deepEqual(res.added, GITIGNORE_ENTRIES);
  const body = fs.readFileSync(gi(root), 'utf8');
  for (const e of GITIGNORE_ENTRIES) assert.ok(body.includes(e), `missing ${e}`);
});

test('appends only missing entries, preserving existing content', () => {
  const root = tmpRoot();
  fs.writeFileSync(gi(root), 'node_modules/\n.assistant/\n');
  const res = ensureGitignore(root);
  // .assistant/ already present → not re-added
  assert.ok(!res.added.includes('.assistant/'));
  assert.equal(res.added.length, 0);
  const body = fs.readFileSync(gi(root), 'utf8');
  assert.ok(body.includes('node_modules/'), 'preserves existing');
  // no duplicate of the pre-existing entry
  const occurrences = body.split('\n').filter((l) => l.trim() === '.assistant/').length;
  assert.equal(occurrences, 1);
});

test('is idempotent — second run adds nothing', () => {
  const root = tmpRoot();
  ensureGitignore(root);
  const first = fs.readFileSync(gi(root), 'utf8');
  const res = ensureGitignore(root);
  assert.deepEqual(res.added, []);
  const second = fs.readFileSync(gi(root), 'utf8');
  assert.equal(first, second, 'file unchanged on second run');
});

test('tolerates a file missing a trailing newline', () => {
  const root = tmpRoot();
  fs.writeFileSync(gi(root), 'dist/'); // no trailing newline
  ensureGitignore(root);
  const body = fs.readFileSync(gi(root), 'utf8');
  assert.ok(body.includes('dist/'));
  assert.ok(body.includes('.assistant/'));
  // dist/ must not have been merged onto the same line as an appended entry
  assert.ok(!/dist\/\S/.test(body), 'dist/ line stays intact');
});
