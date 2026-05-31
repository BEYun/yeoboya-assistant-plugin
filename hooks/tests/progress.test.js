const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const progress = require('../lib/progress');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'yb-progress-'));
}
function workspaceFile(root) {
  return path.join(root, '.workflow', 'workspace.json');
}
function progressFile(root, task) {
  return path.join(root, '.workflow', task, 'progress.json');
}

test('readActiveTask returns null when workspace.json absent', () => {
  const root = tmpRoot();
  assert.equal(progress.readActiveTask(root), null);
});

test('readActiveTask returns activeTask value', () => {
  const root = tmpRoot();
  fs.mkdirSync(path.dirname(workspaceFile(root)), { recursive: true });
  fs.writeFileSync(workspaceFile(root), JSON.stringify({ activeTask: 'DCL-1234' }));
  assert.equal(progress.readActiveTask(root), 'DCL-1234');
});

test('readProgress returns null when progress.json absent', () => {
  const root = tmpRoot();
  assert.equal(progress.readProgress(root, 'DCL-X'), null);
});

test('readProgress parses progress.json', () => {
  const root = tmpRoot();
  const f = progressFile(root, 'DCL-1234');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ task: 'DCL-1234', stages: {} }));
  const p = progress.readProgress(root, 'DCL-1234');
  assert.equal(p.task, 'DCL-1234');
});

test('markStagePublished writes published + notionPageId when stage is done', () => {
  const root = tmpRoot();
  const f = progressFile(root, 'DCL-1234');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({
    task: 'DCL-1234',
    stages: { 'write-policy': { status: 'done' } }
  }));
  const ok = progress.markStagePublished(root, 'DCL-1234', 'write-policy', 'pageid-1');
  assert.equal(ok, true);
  const after = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(after.stages['write-policy'].status, 'published');
  assert.equal(after.stages['write-policy'].notionPageId, 'pageid-1');
});

test('markStagePublished returns false when stage is not done', () => {
  const root = tmpRoot();
  const f = progressFile(root, 'DCL-1234');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({
    task: 'DCL-1234',
    stages: { 'write-policy': { status: 'todo' } }
  }));
  assert.equal(progress.markStagePublished(root, 'DCL-1234', 'write-policy', 'pageid-1'), false);
});

test('markStagePublished returns false when stage absent', () => {
  const root = tmpRoot();
  const f = progressFile(root, 'DCL-1234');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ task: 'DCL-1234', stages: {} }));
  assert.equal(progress.markStagePublished(root, 'DCL-1234', 'write-policy', 'pageid-1'), false);
});
