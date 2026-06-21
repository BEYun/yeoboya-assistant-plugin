'use strict';

const fs = require('node:fs');
const path = require('node:path');

function workspacePath(root) {
  return path.join(root, '.workflow', 'workspace.json');
}

function workPath(root, work) {
  return path.join(root, '.workflow', work, 'work.json');
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

function readActiveWork(root) {
  const cfg = readWorkspace(root);
  if (!cfg) return null;
  const v = typeof cfg.activeWork === 'string' ? cfg.activeWork.trim() : '';
  return v || null;
}

function readWork(root, work) {
  try {
    return JSON.parse(fs.readFileSync(workPath(root, work), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

function safeWriteWork(root, work, data) {
  try {
    atomicWrite(workPath(root, work), JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (e) {
    try {
      const { log } = require('./hook-runtime');
      log({ hook: 'work', event: 'write-error', work, message: String(e?.message || e) });
    } catch {}
    process.stderr.write(`[work] write failed: ${e?.message || e}\n`);
    return false;
  }
}

function recordLink(root, work, key, notionPageId, multi) {
  const w = readWork(root, work);
  if (!w) return false;
  w.links = w.links || {};
  if (!multi || !multi.title) {
    w.links[key] = notionPageId;
    return safeWriteWork(root, work, w);
  }
  const existing = w.links[key];
  const map = (existing && typeof existing === 'object') ? existing : {};
  map[multi.title] = notionPageId;
  w.links[key] = map;
  return safeWriteWork(root, work, w);
}

module.exports = { readActiveWork, readWork, recordLink };
