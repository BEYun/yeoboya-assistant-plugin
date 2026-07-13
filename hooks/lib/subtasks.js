'use strict';

// 세부작업 레지스트리 조회 헬퍼 — 정본은 constants.json(SUBTASK_*·WORKTYPE_LABEL).
// 스킬(LLM)이 plugin 파일을 손으로 쓴 상대경로로 직접 열면 실행 위치(스킬 폴더)
// 기준으로 오해석돼 깨진다. 그래서 스킬은 문서를 열지 않고 run-node.sh 래퍼로 이
// 스크립트를 실행해 taskType별 메뉴/라벨을 결정적으로 받는다(constants.json은
// require로 해석 — 경로 문제 없음). notion.js가 다른 상수를 쓰는 방식과 동일 패턴.
//
//   node subtasks.js menu <taskType>      -> JSON { taskType, groups[], order[], labels{} }
//   node subtasks.js worktype <taskType>  -> Notion '작업 유형' select 라벨(평문 1줄)

const {
  SUBTASK_GROUPS,
  SUBTASK_LABELS,
  WORKTYPE_LABEL,
} = require('./constants.json');

const TASK_TYPES = ['feature', 'update', 'bugfix'];

function assertTaskType(taskType) {
  if (!TASK_TYPES.includes(taskType)) {
    throw new Error(`unknown taskType: ${taskType || '(none)'} — feature|update|bugfix 중 하나`);
  }
}

// taskType의 그룹·키·라벨·표시순서를 결정적으로 구성한다.
// - groups[].items[].n : 그룹 경계를 무시한 1부터의 연속 번호(choose-subtask 표시 번호)
// - order              : 노출 키의 표시 순서(= 노출키 집합 = edit-task 의존 사슬 순서)
// - labels             : 노출 키 -> 해당 taskType 라벨(누락 문서 라벨 변환용)
function buildMenu(taskType) {
  assertTaskType(taskType);
  const groups = [];
  const order = [];
  const labels = {};
  let n = 0;
  for (const [group, keys] of Object.entries(SUBTASK_GROUPS[taskType])) {
    const items = [];
    for (const key of keys) {
      const label = (SUBTASK_LABELS[key] || {})[taskType];
      if (label == null) {
        throw new Error(`missing label: SUBTASK_LABELS[${key}][${taskType}]`);
      }
      n += 1;
      items.push({ n, key, label });
      order.push(key);
      labels[key] = label;
    }
    groups.push({ group, items });
  }
  return { taskType, groups, order, labels };
}

function worktypeLabel(taskType) {
  assertTaskType(taskType);
  return WORKTYPE_LABEL[taskType];
}

function main(argv) {
  const [cmd, taskType] = argv;
  if (cmd === 'menu') {
    process.stdout.write(JSON.stringify(buildMenu(taskType), null, 2) + '\n');
    return 0;
  }
  if (cmd === 'worktype') {
    process.stdout.write(worktypeLabel(taskType) + '\n');
    return 0;
  }
  process.stderr.write('usage: subtasks.js <menu|worktype> <feature|update|bugfix>\n');
  return 2;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(`subtasks: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { buildMenu, worktypeLabel, TASK_TYPES };
