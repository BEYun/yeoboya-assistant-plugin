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

test('markStagePublished — multi-page stage: 첫 페이지는 done→done 유지 + notionPageIds[title] 부착', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { markStagePublished, readProgress } = require('../lib/progress');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-multi-page-'));
  const pg = path.join(root, '.workflow', 'DCL-1', 'progress.json');
  fs.mkdirSync(path.dirname(pg), { recursive: true });
  fs.writeFileSync(pg, JSON.stringify({
    task: 'DCL-1',
    stages: { 'draw-data-flow': { status: 'done' } }
  }));

  const ok = markStagePublished(root, 'DCL-1', 'draw-data-flow', 'p-1', {
    title: '데이터 흐름도',
    requiredTitles: ['데이터 흐름도', '통신 명세서'],
  });
  assert.equal(ok, true);

  const p = readProgress(root, 'DCL-1');
  assert.equal(p.stages['draw-data-flow'].status, 'done', '첫 페이지에서는 published로 flip 안 함');
  assert.deepEqual(p.stages['draw-data-flow'].notionPageIds, { '데이터 흐름도': 'p-1' });
  assert.equal(p.stages['draw-data-flow'].notionPageId, undefined, 'single field는 건드리지 않음');
});

test('markStagePublished — multi-page stage: 두 번째 페이지 도착 시 published로 flip', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { markStagePublished, readProgress } = require('../lib/progress');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-multi-page-2-'));
  const pg = path.join(root, '.workflow', 'DCL-1', 'progress.json');
  fs.mkdirSync(path.dirname(pg), { recursive: true });
  fs.writeFileSync(pg, JSON.stringify({
    task: 'DCL-1',
    stages: {
      'draw-data-flow': {
        status: 'done',
        notionPageIds: { '데이터 흐름도': 'p-1' }
      }
    }
  }));

  markStagePublished(root, 'DCL-1', 'draw-data-flow', 'p-2', {
    title: '통신 명세서',
    requiredTitles: ['데이터 흐름도', '통신 명세서'],
  });

  const p = readProgress(root, 'DCL-1');
  assert.equal(p.stages['draw-data-flow'].status, 'published');
  assert.deepEqual(p.stages['draw-data-flow'].notionPageIds, {
    '데이터 흐름도': 'p-1',
    '통신 명세서': 'p-2'
  });
});

test('markStagePublished — single-page stage: 기존 동작 유지 (notionPageId)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { markStagePublished, readProgress } = require('../lib/progress');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-single-'));
  const pg = path.join(root, '.workflow', 'DCL-1', 'progress.json');
  fs.mkdirSync(path.dirname(pg), { recursive: true });
  fs.writeFileSync(pg, JSON.stringify({
    task: 'DCL-1',
    stages: { 'write-policy': { status: 'done' } }
  }));

  markStagePublished(root, 'DCL-1', 'write-policy', 'p-1');

  const p = readProgress(root, 'DCL-1');
  assert.equal(p.stages['write-policy'].status, 'published');
  assert.equal(p.stages['write-policy'].notionPageId, 'p-1');
  assert.equal(p.stages['write-policy'].notionPageIds, undefined);
});
