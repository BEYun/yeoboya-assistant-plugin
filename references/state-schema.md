# state-schema

This document is the **single source of truth** for state file schemas and shared constants. Skills, hooks, and tests reference this — never duplicate.

## 1. `.workflow/<작업번호>/progress.json`

```json
{
  "task": "DCL-1234",
  "workType": "feature",
  "name": "라이브 방송 검색",
  "stages": {
    "write-policy":   { "status": "published", "notionPageId": "abc..." },
    "write-domain":   { "status": "todo" },
    "draw-ui-flow":   { "status": "todo" },
    "draw-data-flow": { "status": "todo" },
    "write-code":     { "status": "todo" },
    "review-code":    { "status": "todo" },
    "write-qa":       { "status": "todo" },
    "fix-qa-bug":     { "status": "todo" },
    "finish-work":    { "status": "todo" }
  },
  "referenceTask": "DCL-1230"
}
```

- `workType` ∈ {`feature`, `update`, `bugfix`}
- `status` ∈ {`todo`, `done`, `published`, `skipped`}
- `notionPageId`: present iff `status === "published"`
- `referenceTask`: present only when `workType === "update"` and a reference task was chosen

## 2. `.workflow/<작업번호>/code-phases.json`

Tracks write-code's internal phase progress. Owned by `yeoboya-write-code`.

```json
{
  "currentPhase": "domain",
  "phases": {
    "data":         { "status": "done" },
    "domain":       { "status": "in-progress" },
    "presentation": { "status": "todo" }
  }
}
```

`phases[<key>].status` ∈ {`todo`, `in-progress`, `done`}.
`progress.stages.write-code.status` flips to `"done"` only when all three phases are `done`.

## 3. `.workflow/workspace.json`

```json
{
  "services": ["달라", "클럽라이브", "여보야", "클럽5678", "AI식단"],
  "platform": "iOS",
  "worker": "윤병은",
  "activeTask": "DCL-1234",
  "notion": {
    "taskDbDataSourceUrl": "https://...",
    "workerPageId": "abc...",
    "domainMapping": { "달라": "...", "라이브방송": "..." }
  }
}
```

`activeTask`: most recently started or resumed task. Updated by `start-work` and `continue-work`. Used by `session-resume` hook.

Notion MCP is a required prerequisite for v2; there is no `notion.mode` field.

## 4. Shared constants

```
STAGE_ORDER = [
  "write-policy", "write-domain", "draw-ui-flow", "draw-data-flow",
  "write-code", "fix-bug",
  "review-code", "write-qa", "fix-qa-bug", "finish-work"
]

WORKTYPE_STAGES = {
  feature: ["write-policy", "write-domain", "draw-ui-flow", "draw-data-flow",
            "write-code", "review-code", "write-qa", "fix-qa-bug", "finish-work"],
  update:  ["write-policy", "write-domain", "draw-ui-flow", "draw-data-flow",
            "write-code", "review-code", "write-qa", "fix-qa-bug", "finish-work"],
  bugfix:  ["fix-bug", "review-code", "write-qa", "fix-qa-bug", "finish-work"]
}

NOTION_STAGES = ["write-policy", "write-domain", "draw-ui-flow", "draw-data-flow", "write-qa"]

UPDATE_OPTIONAL_STAGES = ["write-policy", "write-domain", "draw-ui-flow", "draw-data-flow"]

CODE_PHASES = ["data", "domain", "presentation"]

STAGE_LABELS = {
  "write-policy":   "정책서 작성",
  "write-domain":   "도메인 명세서",
  "draw-ui-flow":   "UI 흐름도",
  "draw-data-flow": "데이터 흐름도",
  "write-code":     "코드 작성",
  "fix-bug":        "버그 수정",
  "review-code":    "코드 리뷰",
  "write-qa":       "QA 시나리오",
  "fix-qa-bug":     "QA 버그 수정",
  "finish-work":    "작업 종결"
}

STAGE_TITLE_TO_KEY = {
  "정책서":          "write-policy",
  "도메인 명세서":   "write-domain",
  "UI 흐름도":       "draw-ui-flow",
  "데이터 흐름도":   "draw-data-flow",
  "QA 시나리오":     "write-qa"
}
```

`STAGE_TITLE_TO_KEY` is used by `notion-page-record` hook to resolve which stage a Notion page belongs to from its title. Only NOTION_STAGES appear here.

## 5. Read/write conventions

- Skills read/write these files directly via Read/Write/Bash tools — no function wrappers
- Hook code (`hooks/lib/`) reads/writes the same schemas via Node.js
- Schema changes happen here first, then downstream files (hook lib, skill bodies) are updated
