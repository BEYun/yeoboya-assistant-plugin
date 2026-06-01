'use strict';

const fs = require('node:fs');
const path = require('node:path');

function workspacePath(root) {
  return path.join(root, '.workflow', 'workspace.json');
}

function progressPath(root, task) {
  return path.join(root, '.workflow', task, 'progress.json');
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

function readProgress(root, task) {
  try {
    return JSON.parse(fs.readFileSync(progressPath(root, task), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

function safeWriteProgress(root, task, progress) {
  try {
    atomicWrite(progressPath(root, task), JSON.stringify(progress, null, 2) + '\n');
    return true;
  } catch (e) {
    try {
      const { log } = require('./hook-runtime');
      log({ hook: 'progress', event: 'write-error', task, message: String(e?.message || e) });
    } catch {}
    process.stderr.write(`[progress] write failed: ${e?.message || e}\n`);
    return false;
  }
}

function markStagePublished(root, task, stage, notionPageId, multi) {
  const p = readProgress(root, task);
  if (!p || !p.stages || !p.stages[stage]) return false;
  const cell = p.stages[stage];

  // Single-page path (backward-compatible)
  if (!multi || !multi.title) {
    if (cell.status !== 'done') return false;
    cell.status = 'published';
    cell.notionPageId = notionPageId;
    return safeWriteProgress(root, task, p);
  }

  // Multi-page path
  const { title, requiredTitles } = multi;
  if (!Array.isArray(requiredTitles) || !requiredTitles.includes(title)) return false;
  if (cell.status !== 'done' && cell.status !== 'published') return false;

  cell.notionPageIds = cell.notionPageIds || {};
  cell.notionPageIds[title] = notionPageId;

  const allPresent = requiredTitles.every((t) => cell.notionPageIds[t]);
  if (allPresent && cell.status !== 'published') cell.status = 'published';

  return safeWriteProgress(root, task, p);
}

module.exports = { readActiveTask, readProgress, markStagePublished };
