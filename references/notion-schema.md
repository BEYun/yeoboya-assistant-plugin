# notion-schema

작업 DB · 팀원 DB · 산출물 페이지 publish 시 사용하는 Notion 측 스키마 SoT.

state-schema.md(로컬)와 분리. **변경은 본 파일에서 먼저, 그 다음 hook lib와 skill body에 반영.**

## 1. 작업 DB

- URL: `collection://f8c09dfc-cbf8-40f2-ac4c-a6a1b57ef030`
- 사람 DB: `collection://cc47fa31-4d64-4ecc-ad96-95c0048c355c`

## 2. Properties

| 속성 | 타입 | 기점 스킬 | 동작 |
|---|---|---|---|
| 작업명 | title | `start-work` | 입력 → set |
| 작업 번호 | text | `start-work` | `<task>` → set |
| 작업 유형 | select | `start-work` | workType 매핑 → set |
| 도메인 | select | `start-work` | row에 비어 있으면 입력(optional) → set |
| 담당자 | relation (multi) | `start-work` | 본인 worker URL만 append (replace 금지) |
| 작업 상태 | select | `notion-page-record` hook | §4 매핑 lookup → forward-only transition |
| 작업 일정 | date range | — | 스킬 범위 외 (PM이 Notion에서 수동) |
| iOS 완료 | checkbox | `finish-work` | `workspace.platform=="iOS"`면 true |
| Android 완료 | checkbox | `finish-work` | `workspace.platform=="Android"`면 true |

각 속성은 해당 기점 스킬만 변경 권한을 가진다. 그 외 스킬은 read-only.

## 3. workType ↔ 작업 유형

| workType | 작업 유형 (select) |
|---|---|
| feature | 신규 개발 |
| update | 변경/고도화 |
| bugfix | 버그 수정 |

## 4. stage → 작업 상태 자동 전이

| 이벤트 | 전이 |
|---|---|
| `start-work` 도입 | 시작 전 |
| `write-policy-feedback.published` | 기획 단계 |
| `write-policy.published` | 기획 단계 (유지) |
| `write-domain.published` | 설계 단계 |
| `draw-ui-flow.published` · `draw-data-flow.published` | 설계 단계 (유지) |
| `write-code.phase.data` 시작 또는 `fix-bug` 시작 | 개발 단계 |
| `review-code.done` | 개발 단계 (유지) |
| `write-qa.published` | 테스트 단계 |
| `fix-qa-bug` 진행 | 테스트 단계 (유지) |
| `finish-work.done` | 완료 |

**Forward-only 규칙**: 현재 작업 상태의 enum index보다 큰 newState만 적용. 재publish 등 역방향 전이는 무시.

작업 상태 enum 순서:
```
0: 시작 전
1: 기획 단계
2: 설계 단계
3: 개발 단계
4: 테스트 단계
5: 완료
```

## 5. 도메인 select option (현재)

- DallaGame
- Event

새 도메인은 Notion DB에서 먼저 select option 추가 → 그 이후 `start-work`에서 사용 가능. skill은 동적 등록을 시도하지 않는다.
