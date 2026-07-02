#!/usr/bin/env node
'use strict';

const { log } = require('./lib/hook-runtime');
const { readActiveTask, readTask } = require('./lib/task');

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext }
  }) + '\n');
  process.exit(0);
}

function silent() {
  process.exit(0);
}

function buildResumeBlock({ work, data }) {
  const lines = ['<yeoboya-workflow-resume>'];
  lines.push(`진행 중 작업이 감지되었습니다: **${work}**`);
  if (!data) {
    lines.push('상태: workspace.json에 activeTask는 있으나 task.json 미생성.');
    lines.push('새 작업 생성이 필요합니다 — `/yeoboya-create-task <작업번호>`를 호출하세요.');
  } else {
    lines.push(`taskType: ${data.taskType ?? '미지정'}`);
    lines.push('');
    lines.push('세부작업 목록을 열려면 `/yeoboya-select-subtask`을 호출하세요.');
  }
  lines.push('</yeoboya-workflow-resume>');
  return lines.join('\n');
}

(async () => {
  const root = process.env.DEV_ROOT || process.cwd();

  let work;
  try {
    work = readActiveTask(root);
  } catch (e) {
    log({ hook: 'session-resume', event: 'read-error', message: String(e?.message || e) });
    return silent();
  }

  if (!work) {
    log({ hook: 'session-resume', event: 'skip', reason: 'no-active-task' });
    return silent();
  }

  let data = null;
  try {
    data = readTask(root, work);
  } catch (e) {
    log({ hook: 'session-resume', event: 'task-read-error', work, message: String(e?.message || e) });
  }

  const ctx = buildResumeBlock({ work, data });
  log({ hook: 'session-resume', event: 'inject', work, hasWork: !!data });
  emit(ctx);
})();
