---
name: yeoboya-continue-work
description: "Use when the user invokes /yeoboya-continue-work, or expresses intent to resume an in-flight task ('작업 재개', '진행하던 작업', '다음 단계 진행'). Scans .workflow/ for all in-flight tasks, lets the user pick one (activeTask marked [현재]), then shows progress and asks (in natural language, no y/s/n) which stage to trigger next. Routes the choice via the Skill tool to the appropriate yeoboya-<stage> skill. Includes the write-code entry gate as the final guard before committing to implementation."
---

# yeoboya-continue-work

진행 중 작업 재개 + 다음 stage 추천 + Skill 도구로 trigger.

## 1. 작업 목록 스캔

`.workflow/` 디렉토리를 스캔하여 `progress.json`이 있는 모든 작업 폴더 수집:

```
진행 중 작업 목록:
  - [DCL-1234] 라이브 방송 검색 — 기능 추가 [현재]
  - [DCL-1245] 클럽 입장 시 알림 — 버그 수정
  - [DCL-1250] 회원 가입 흐름 — 기능 수정

어느 작업을 진행하시겠어요? 작업번호를 입력하세요.
```

`[현재]` 마커는 workspace.json의 `activeTask`와 일치하는 작업에 부착. 목록이 비어 있으면 안내 후 종료. 작업번호가 1개뿐이면 자동 선택 (안내만 출력).

## 2. activeTask 갱신

사용자 선택 → workspace.json의 `activeTask` 필드를 선택된 작업번호로 갱신.

## 3. 진행 상황 표시

`references/state-schema.md §4`의 `WORKTYPE_STAGES[<workType>]` 순서로 표시. 마커:

| status | 마커 |
|---|---|
| `published` | ✓ |
| `done` | ✓ |
| `todo` 첫 등장 (= 다음 권장) | ▶ |
| `todo` 후행 | (공백) |
| `skipped` | ↷ |

예시:
```
[DCL-1234 · 기능 추가] 진행 상황:
  ✓ 정책서 작성
  ✓ 도메인 명세서
  ▶ UI 흐름도          ← 다음 권장
    데이터 흐름도
    코드 작성
    코드 리뷰
    QA 시나리오
    QA 버그 수정
    작업 종결
```

## 4. 메뉴 (자연어 응답)

```
다음 단계 'UI 흐름도'를 진행하려면 '진행'을, 다른 단계를 선택하려면 stage 이름을, 종료하려면 '취소'를 입력하세요.
```

**단축키(y/s/n) 사용 금지.** stage 이름은 한국어 라벨 (`STAGE_LABELS`) 또는 키 (`write-policy` 등) 모두 매칭.

## 5. 응답 분기

| 응답 | 동작 |
|---|---|
| "진행" | 다음 권장 stage trigger (§6, §7) |
| stage 이름 (todo) | 해당 stage trigger |
| stage 이름 (done / published) | "이미 완료된 단계입니다. 재실행하시겠어요? (네/아니요)" 게이트 → "네"면 trigger |
| stage 이름 (skipped) | 즉시 trigger (status는 trigger된 skill이 재설정) |
| **update workType + 옵션 stage + todo** | "이 단계를 진행할까요? 아니면 skip할까요? (진행/skip)" 게이트. skip 응답 시 progress.stages[stage].status="skipped" 후 메뉴 복귀 |
| "취소" / "종료" | 종료 |

`UPDATE_OPTIONAL_STAGES`는 `references/state-schema.md §4` 참조.

## 6. write-code 진입 게이트 (대상 stage = `write-code`일 때만)

trigger 직전 안내:

```
write-code 단계는 이전 기획·설계 산출물(정책서/도메인/UI/데이터 흐름도)이 확정된 상태에서 진행하는 것을 권장합니다.
진행 후에는 이전 단계로 되돌아가는 데 추가 작업이 필요합니다.
진행하시겠어요?
```

"네" 외 응답 → §4 메뉴 복귀. 사용자가 이전 단계로 돌아갈 수 있게.

## 7. stage skill trigger

Skill 도구로 해당 `yeoboya-<stage>` skill 호출. 전달 컨텍스트:
- 작업번호 (currentTask)
- workType
- 필요 시 referenceTask

## 8. stage 완료 후 종료

stage skill이 완료 안내 (예: "<stage> 완료. 새 세션 권장")를 출력하면 본 skill은 **반복하지 않고 즉시 종료**. 사용자는 새 세션에서 `/yeoboya-continue-work`을 다시 호출.

## 9. Self-validation

trigger 전 검증:
- 선택한 stage 키가 `WORKTYPE_STAGES[<workType>]`에 속하는지
- 선택한 stage가 옵션 게이트 응답에 따라 올바른 status로 진입하는지
