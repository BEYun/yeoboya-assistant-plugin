const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const { createPagesPayload, createPagesResponse } = require('./fixtures');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'yb-page-record-'));
}

function setupTask(root, stagesPatch) {
  const ws = path.join(root, '.workflow', 'workspace.json');
  fs.mkdirSync(path.dirname(ws), { recursive: true });
  fs.writeFileSync(ws, JSON.stringify({ activeTask: 'DCL-1234' }));
  const pg = path.join(root, '.workflow', 'DCL-1234', 'progress.json');
  fs.mkdirSync(path.dirname(pg), { recursive: true });
  fs.writeFileSync(pg, JSON.stringify({
    task: 'DCL-1234', workType: 'feature', stages: stagesPatch
  }));
  return pg;
}

function runHook(root, payload) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'notion-page-record.js')], {
    env: { ...process.env, DEV_ROOT: root, DEV_LOG_DIR: path.join(root, 'logs') },
    encoding: 'utf8',
    input: JSON.stringify(payload),
  });
}

test('flips stage from done → published with notionPageId on matching title', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'write-policy': { status: 'done' } });

  const inp = createPagesPayload([{ title: '정책서', markdown: '...' }]);
  const result = runHook(root, {
    ...inp,
    tool_response: createPagesResponse(['notion-page-abc']),
  });

  assert.equal(result.status, 0);
  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['write-policy'].status, 'published');
  assert.equal(after.stages['write-policy'].notionPageId, 'notion-page-abc');
});

test('does not flip stage when title is unknown', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'write-policy': { status: 'done' } });

  const inp = createPagesPayload([{ title: '미지의 페이지', markdown: '...' }]);
  runHook(root, { ...inp, tool_response: createPagesResponse(['p-x']) });

  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['write-policy'].status, 'done');
  assert.equal(after.stages['write-policy'].notionPageId, undefined);
});

test('skips silently when no activeTask', () => {
  const root = tmpRoot();
  const inp = createPagesPayload([{ title: '정책서', markdown: '...' }]);
  const result = runHook(root, { ...inp, tool_response: createPagesResponse(['p-x']) });
  assert.equal(result.status, 0);
});

test('skips silently when tool_name is unrelated', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'write-policy': { status: 'done' } });
  const result = runHook(root, {
    tool_name: 'mcp__some-other-tool',
    tool_input: {},
    tool_response: {},
  });
  assert.equal(result.status, 0);
  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['write-policy'].status, 'done');
});

test('does not flip when current stage status is not done (e.g., still todo)', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'write-policy': { status: 'todo' } });

  const inp = createPagesPayload([{ title: '정책서', markdown: '...' }]);
  runHook(root, { ...inp, tool_response: createPagesResponse(['p-x']) });

  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['write-policy'].status, 'todo');
});

test('multi-page stage — 첫 페이지(데이터 흐름도) publish → done 유지 + notionPageIds 부착', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'draw-data-flow': { status: 'done' } });

  const inp = createPagesPayload([{ title: '데이터 흐름도', markdown: '...' }]);
  const result = runHook(root, {
    ...inp,
    tool_response: createPagesResponse(['p-dataflow']),
  });

  assert.equal(result.status, 0);
  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['draw-data-flow'].status, 'done');
  assert.deepEqual(after.stages['draw-data-flow'].notionPageIds, { '데이터 흐름도': 'p-dataflow' });
});

test('multi-page stage — 두 번째 페이지(통신 명세서) publish → published flip', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, {
    'draw-data-flow': {
      status: 'done',
      notionPageIds: { '데이터 흐름도': 'p-dataflow' }
    }
  });

  const inp = createPagesPayload([{ title: '통신 명세서', markdown: '...' }]);
  runHook(root, {
    ...inp,
    tool_response: createPagesResponse(['p-comm']),
  });

  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['draw-data-flow'].status, 'published');
  assert.deepEqual(after.stages['draw-data-flow'].notionPageIds, {
    '데이터 흐름도': 'p-dataflow',
    '통신 명세서': 'p-comm',
  });
});

test('기획서 검토 page → write-policy-feedback published', () => {
  const root = tmpRoot();
  const pgFile = setupTask(root, { 'write-policy-feedback': { status: 'done' } });

  const inp = createPagesPayload([{ title: '기획서 검토', markdown: '...' }]);
  runHook(root, {
    ...inp,
    tool_response: createPagesResponse(['p-fb']),
  });

  const after = JSON.parse(fs.readFileSync(pgFile, 'utf8'));
  assert.equal(after.stages['write-policy-feedback'].status, 'published');
  assert.equal(after.stages['write-policy-feedback'].notionPageId, 'p-fb');
});
