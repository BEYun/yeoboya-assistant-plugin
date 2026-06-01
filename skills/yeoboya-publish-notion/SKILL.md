---
name: yeoboya-publish-notion
description: "MANDATORY for any Notion page write or task DB row mutation in yeoboya-workflow. NEVER call `notion-create-pages` or `notion-update-page` directly from a stage skill — invoke this skill first. It handles task DB row upsert (dispatch), workspace-aware property setting, and surfaces the page title that the `notion-page-record` hook needs for the done→published transition. Use when any stage skill (write-policy, write-domain, draw-ui-flow, draw-data-flow, write-qa) needs to publish its deliverable, or when start-work needs to register/sync the task DB row."
user-invocable: false
---

# yeoboya-publish-notion

Notion 쓰기의 단일 진입점. 모든 stage skill은 산출물을 publish할 때 본 skill을 통해 Notion에 쓴다.

## 1. 도구 호출 규약

- create 경로: `mcp__claude_ai_Notion__notion-create-pages`
- update 경로: `mcp__claude_ai_Notion__notion-update-page` (기존 `notionPageId`가 있을 때)
- **upsert 규칙**: `progress.stages[<stage>].notionPageId`가 있으면 update, 없으면 create

## 2. 페이지 제목 규약 (hook이 stage 추론에 사용)

| Stage | 페이지 제목 |
|---|---|
| write-policy-feedback | 기획서 검토 |
| write-policy | 정책서 |
| write-domain | 도메인 명세서 |
| draw-ui-flow | UI 흐름도 |
| draw-data-flow | 데이터 흐름도 · 통신 명세서 (2 페이지) |
| write-qa | QA 시나리오 |

이 매핑은 `references/state-schema.md §4 STAGE_TITLE_TO_KEY`와 `references/notion-schema.md` 그리고 hook lib `notion.js`의 `TITLE_TO_STAGE`가 일치해야 한다. 변경은 세 곳 동시 갱신 (Phase 1·2의 task들로 한 번에 처리).

## 3. 호출 형태

호출 시 다음 파라미터를 받는다:

- `task`: 작업번호 (e.g., "DCL-1234")
- `mode`: "dispatch" | "sync" | "state-transition"
  - `dispatch`: stage 산출물 페이지 create/update. payload: `stage`, `title`, `markdown`, 옵션 `properties`. 본 mode는 **stage 페이지 publish + 작업 상태 forward-only 전이를 한 호출로 수행한다.** `references/notion-schema.md §4 STAGE_TO_TASK_STATE` 매핑에 stage가 있으면, dispatch 마지막에 row update로 `작업 상태`를 함께 갱신 (sync로 현재 상태 조회 → forward-only 판정 → 적용/무시).
  - `sync`: 작업 DB row 조회. start-work에서 도메인/담당자/현재 작업 상태 추출용.
  - `state-transition`: 페이지 publish 없이 작업 상태만 갱신. payload: `desiredState`. write-code phase 시작, fix-bug 시작, finish-work 종결처럼 페이지 출력이 없는 stage 진행 신호에 쓴다. dispatch와 같은 forward-only 규칙.

hook(`notion-page-record`)은 페이지 publish 시 progress.json 갱신만 담당하며 작업 상태 전이는 일으키지 않는다. 모든 작업 상태 전이의 권한은 본 skill에 있다.

## 4. dispatch 흐름

1. `task`로 progress.json 로드 → `stages[stage].notionPageId` 또는 `notionPageIds[title]` 확인
2. workspace.json 로드 → `notion.taskDbDataSourceUrl`, `notion.workerPageId`, `notion.domainMapping`
3. 기존 페이지가 있으면 update-page (replace_content), 없으면 create-pages. response 결과 보존
4. **작업 상태 forward-only 전이** — `references/notion-schema.md §4 STAGE_TO_TASK_STATE`에서 stage 키를 lookup. 매핑된 desiredState가 있으면:
   - sync로 현재 row의 `작업 상태` 조회
   - `hooks/lib/notion.js`의 `isForwardTransition(current, desiredState)` 호출
   - true면 row update-page로 `작업 상태`만 갱신
   - false면 무시
5. 응답 반환 — page id + (있으면) transitioned state

진행 상태(progress.stages[stage].status)는 hook이 자동 부착하므로 본 skill에서 별도 쓰기 안 함.

## 5. sync 흐름

1. workspace.json의 `notion.taskDbDataSourceUrl`로 작업 DB query
2. `<task>` 키 매칭되는 row 조회
3. 반환: `{ rowId, workType, 작업명, 도메인, 담당자: string[], 작업상태, iOS_완료, Android_완료 }` (없는 필드는 null)

`담당자`는 URL 배열. `작업상태`는 select option name (e.g., "설계 단계"). state-transition mode에서 forward-only 판정용.

## 6. 호출자(start-work / stage skills / hook)에게 노출되는 인터페이스

```
yeoboya-publish-notion 호출 파라미터:
  task: "DCL-1234"
  mode: "dispatch" | "sync" | "state-transition"
  (dispatch만)
    stage: "<stage 키>"
    title: "<페이지 제목 — §2 표 참조>"
    markdown: "<페이지 본문>"
    properties?:
      workType?: <feature|update|bugfix>   # WORKTYPE_LABEL로 select 값 변환
      작업명?: string
      도메인?: string                      # 존재하는 select option만
      담당자?: { mode: "append", urls: string[] }   # 항상 append, replace 금지
      iOS_완료?: boolean
      Android_완료?: boolean
  (state-transition만)
    desiredState: "기획 단계" | "설계 단계" | "개발 단계" | "테스트 단계" | "완료"
```

`담당자` payload는 항상 `mode: "append"` 형식이며 본 skill 내부에서 기존 relation list와 union 연산. 절대 replace하지 않는다.

ID↔URL 변환(예: `workspace.notion.workerPageId` → 페이지 URL)은 본 skill이 책임진다 — 호출자는 정규화된 worker pageId만 전달.

## 7. 에이전트 사용

본 skill은 `agents/notion-writer.md`를 subagent로 호출하여 실제 도구 호출과 페이로드 빌딩을 위임할 수 있다. 단순 호출은 본 skill 본문에서 직접 처리.
