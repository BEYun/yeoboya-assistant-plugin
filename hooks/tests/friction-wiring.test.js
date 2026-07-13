'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { readFrictionLog } = require('../lib/friction');

function tmpRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'yb-wiring-')); }

test('sync-links no-work-json records a schema-mismatch friction', () => {
  const root = tmpRoot();
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'lib', 'sync-links.js'), 'DCL-1'], {
    env: { ...process.env, DEV_ROOT: root, DEV_LOG_DIR: path.join(root, 'logs') },
    encoding: 'utf8', input: JSON.stringify([]),
  });
  assert.equal(r.status, 0);
  const events = readFrictionLog(root);
  assert.equal(events.length, 1);
  assert.equal(events[0].skill, 'solution-publish-notion');
  assert.equal(events[0].category, 'schema-mismatch');
});

test('hooks.json의 모든 command는 run-node.sh 래퍼를 경유한다', () => {
  // GUI 환경 등 PATH에 node가 없어도 hook이 깨지지 않도록, 모든 hook은
  // 파일을 직접 실행(shebang 의존)하지 않고 run-node.sh 래퍼를 거쳐야 한다.
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks.json'), 'utf8'));
  const cmds = [];
  for (const arr of Object.values(cfg.hooks)) {
    for (const entry of arr) for (const h of entry.hooks) cmds.push(h.command);
  }
  assert.ok(cmds.length >= 3, 'at least the 3 wired hooks');
  for (const c of cmds) {
    assert.match(c, /run-node\.sh /, `command must go through wrapper: ${c}`);
    assert.match(c, /\.js$/, `command must target a .js script: ${c}`);
  }
});

test('run-node.sh 래퍼를 경유해 hook 스크립트가 실제로 실행된다', () => {
  const root = tmpRoot();
  const r = spawnSync('sh', [
    path.join(__dirname, '..', 'run-node.sh'),
    path.join(__dirname, '..', 'friction-recover.js'),
  ], { env: { ...process.env, DEV_ROOT: root }, encoding: 'utf8', input: '{}' });
  assert.equal(r.status, 0); // no marker -> passes silently
});

test('notion-page-record miss (no page id) records a tool-error friction', () => {
  const root = tmpRoot();
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'notion-page-record.js')], {
    env: { ...process.env, DEV_ROOT: root, DEV_LOG_DIR: path.join(root, 'logs') },
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'mcp__x__notion-create-pages', tool_input: {}, tool_response: {} }),
  });
  assert.equal(r.status, 0);
  const events = readFrictionLog(root);
  assert.equal(events.length, 1);
  assert.equal(events[0].category, 'tool-error');
});
