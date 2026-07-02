'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveKey, isMultiPageKey } = require('./notion');

function workspacePath(root) {
  return path.join(root, '.workflow', 'workspace.json');
}

function taskPath(root, task) {
  return path.join(root, '.workflow', task, 'task.json');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function atomicWrite(filePath, contents) {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, filePath);
}

function readWorkspace(root) {
  try {
    return JSON.parse(fs.readFileSync(workspacePath(root), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

function readActiveTask(root) {
  const cfg = readWorkspace(root);
  if (!cfg) return null;
  const v = typeof cfg.activeTask === 'string' ? cfg.activeTask.trim() : '';
  return v || null;
}

function readTask(root, task) {
  try {
    return JSON.parse(fs.readFileSync(taskPath(root, task), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

function safeWriteTask(root, task, data) {
  try {
    atomicWrite(taskPath(root, task), JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (e) {
    try {
      const { log } = require('./hook-runtime');
      log({ hook: 'task', event: 'write-error', task, message: String(e?.message || e) });
    } catch {}
    try {
      const { logFriction } = require('./friction');
      logFriction(root, { workNo: task, category: 'session-break', severity: 'blocker', what: 'task.json 쓰기 실패 — 진행 상태 유실 위험', source: 'hook' });
    } catch {}
    process.stderr.write(`[task] write failed: ${e?.message || e}\n`);
    return false;
  }
}

function setLink(links, key, pageId, multiTitle) {
  if (!multiTitle) {
    links[key] = pageId;
    return;
  }
  const existing = (links[key] && typeof links[key] === 'object') ? links[key] : {};
  existing[multiTitle] = pageId;
  links[key] = existing;
}

function recordLink(root, task, key, notionPageId, multi) {
  const w = readTask(root, task);
  if (!w) return false;
  w.links = w.links || {};
  setLink(w.links, key, notionPageId, multi && multi.title);
  return safeWriteTask(root, task, w);
}

function syncLinks(root, task, children) {
  const w = readTask(root, task);
  if (!w) return null;
  w.links = w.links || {};
  const list = Array.isArray(children) ? children : [];
  for (const c of list) {
    if (!c || typeof c.id !== 'string' || !c.id) continue;
    const title = typeof c.title === 'string' ? c.title : '';
    const key = resolveKey(title);
    if (!key) continue;
    setLink(w.links, key, c.id, isMultiPageKey(key) ? title.trim() : null);
  }
  return safeWriteTask(root, task, w) ? w.links : null;
}

module.exports = { readActiveTask, readTask, recordLink, syncLinks };
