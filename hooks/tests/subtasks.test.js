'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildMenu, worktypeLabel, TASK_TYPES } = require('../lib/subtasks');
const constants = require('../lib/constants.json');

const SCRIPT = path.join(__dirname, '..', 'lib', 'subtasks.js');
function cli(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('feature 메뉴: 5그룹·10개, 번호 1..10 연속', () => {
  const m = buildMenu('feature');
  assert.equal(m.groups.length, 5);
  assert.equal(m.order.length, 10);
  const flat = m.groups.flatMap((g) => g.items);
  assert.deepEqual(flat.map((i) => i.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(flat[0].key, 'write-policy-feedback');
  assert.equal(flat[0].label, '기획서 검토');
});

test('feature vs update: 구성 동일, 라벨만 작성→수정', () => {
  const f = buildMenu('feature');
  const u = buildMenu('update');
  assert.deepEqual(f.order, u.order); // 키·순서 동일
  assert.equal(f.labels['write-policy'], '정책서 작성');
  assert.equal(u.labels['write-policy'], '정책서 수정');
  assert.equal(u.labels['write-code'], '코드 수정');
});

test('bugfix 메뉴: 4그룹·6개, write-code 미노출·fix-bug 노출', () => {
  const m = buildMenu('bugfix');
  assert.equal(m.groups.length, 4);
  assert.deepEqual(m.order, [
    'analyze-bug', 'write-qa', 'fix-bug', 'review-code', 'fix-qa-bug', 'finish-task',
  ]);
  assert.ok(!m.order.includes('write-code'));
});

test('worktypeLabel: taskType별 Notion select 라벨', () => {
  assert.equal(worktypeLabel('feature'), '신규 개발');
  assert.equal(worktypeLabel('update'), '변경/고도화');
  assert.equal(worktypeLabel('bugfix'), '버그 수정');
});

test('알 수 없는 taskType은 throw', () => {
  assert.throws(() => buildMenu('nope'), /unknown taskType/);
  assert.throws(() => worktypeLabel(''), /unknown taskType/);
});

test('constants.json 정합성: 노출 키는 모두 라벨을 가진다', () => {
  for (const taskType of TASK_TYPES) {
    for (const keys of Object.values(constants.SUBTASK_GROUPS[taskType])) {
      for (const key of keys) {
        assert.ok(
          constants.SUBTASK_LABELS[key] && constants.SUBTASK_LABELS[key][taskType],
          `SUBTASK_LABELS[${key}][${taskType}] 누락`,
        );
      }
    }
  }
});

test('constants.json 정합성: 노출 키는 모두 SUBTASK_LIST 등록부에 있다', () => {
  const registry = new Set(constants.SUBTASK_LIST);
  for (const taskType of TASK_TYPES) {
    for (const keys of Object.values(constants.SUBTASK_GROUPS[taskType])) {
      for (const key of keys) {
        assert.ok(registry.has(key), `SUBTASK_LIST에 없는 키: ${key}`);
      }
    }
  }
});

test('CLI menu: JSON을 stdout으로 출력', () => {
  const r = cli(['menu', 'feature']);
  assert.equal(r.status, 0);
  const m = JSON.parse(r.stdout);
  assert.equal(m.taskType, 'feature');
  assert.equal(m.order.length, 10);
});

test('CLI worktype: 라벨 평문 1줄', () => {
  const r = cli(['worktype', 'bugfix']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '버그 수정');
});

test('CLI: 잘못된 인자는 비정상 종료', () => {
  assert.notEqual(cli(['menu', 'bogus']).status, 0);
  assert.notEqual(cli(['bogus', 'feature']).status, 0);
});
