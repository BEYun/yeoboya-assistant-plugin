const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

function tmpRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'yb-sync-links-')); }
function workFile(root, w) { return path.join(root, '.workflow', w, 'task.json'); }

function setupWork(root, w, workData) {
  const wf = workFile(root, w);
  fs.mkdirSync(path.dirname(wf), { recursive: true });
  fs.writeFileSync(wf, JSON.stringify({ work: w, links: {}, ...workData }));
  return wf;
}

function runCli(root, work, stdin) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'lib', 'sync-links.js'), work], {
    env: { ...process.env, DEV_ROOT: root, DEV_LOG_DIR: path.join(root, 'logs') },
    encoding: 'utf8',
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
  });
}

test('syncs child titles into task.json.links and prints resolved links', () => {
  const root = tmpRoot();
  const wf = setupWork(root, 'DCL-1', {});
  const r = runCli(root, 'DCL-1', [{ title: '정책서', id: 'p-pol' }, { title: '데이터 흐름도', id: 'p-df' }]);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out['write-policy'], 'p-pol');
  assert.deepEqual(out['draw-data-flow'], { '데이터 흐름도': 'p-df' });
  const after = JSON.parse(fs.readFileSync(wf, 'utf8'));
  assert.equal(after.links['write-policy'], 'p-pol');
});

test('prints {} and exits 0 when task.json absent', () => {
  const root = tmpRoot();
  const r = runCli(root, 'DCL-MISSING', [{ title: '정책서', id: 'p' }]);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '{}');
});

test('tolerates invalid JSON stdin', () => {
  const root = tmpRoot();
  setupWork(root, 'DCL-2', {});
  const r = runCli(root, 'DCL-2', 'not json');
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '{}');
});

test('exits non-zero when work arg missing', () => {
  const root = tmpRoot();
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'lib', 'sync-links.js')], {
    env: { ...process.env, DEV_ROOT: root },
    encoding: 'utf8',
    input: '[]',
  });
  assert.notEqual(r.status, 0);
});
