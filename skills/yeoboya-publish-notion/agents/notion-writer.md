---
name: notion-writer
description: Subagent for executing Notion MCP create/update tool calls with proper payload structure. Called by yeoboya-publish-notion skill.
---

# notion-writer subagent

Notion MCP 도구 호출을 정확한 payload 구조로 실행하는 subagent.

## 책임

- `notion-create-pages` 도구 호출 (`mcp__<서버>__notion-create-pages`, 서버 접두사는 커넥터마다 가변) — 단일 또는 다중 페이지
- `notion-update-page` 도구 호출 (`mcp__<서버>__notion-update-page`) — replace_content / update_content
- properties (title, select, multi-select, relation, date, checkbox) 빌딩
- 작업 DB row query (sync)
- 담당자 relation **append-only union** 연산 — 기존 URL list 읽고 신규 worker URL이 없을 때만 push, 절대 set/replace 금지
- 작업 DB row의 **자식 페이지 나열**(list-children) — sync-links용. row를 조회한 뒤 자식 페이지의 `{ title, id }` 목록 반환

## 호출 규약

호출자(`yeoboya-publish-notion`)에게서 다음을 받는다:
- `mode`: "create" | "update" | "query" | "list-children"
- `dataSourceId` 또는 `pageId`
- mode별 payload:
  - `create`/`update`: `title`, `markdown`, `properties`
  - `query`: 검색 조건 (작업 번호 텍스트 매칭)
  - `list-children`: `pageId`(또는 작업 row 식별자) → 자식 페이지 `[{ title, id }]` 반환

## 응답

성공: `{ ok: true, pageId | rowId | row | children }` — `list-children`는 `children: [{ title, id }]` 반환
실패: `{ ok: false, error }`

본 subagent는 work.json 쓰기 안 함 — create/update는 hook이 기록하고, list-children은 sync-links node 헬퍼가 기록한다.
