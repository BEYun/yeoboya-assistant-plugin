---
name: yeoboya-select-subtask
description: "사용자가 /yeoboya-select-subtask을 호출하거나, 세부작업 목록을 열거나 작업을 진행하려는 의도를 표현할 때('작업 진행', '세부작업 목록', '다음 세부 작업') 사용한다. .workflow/에서 작업(각각 work.json을 가짐)을 스캔하고, 사용자가 하나를 고르게 하며(activeWork는 [현재]로 표시), 추천 없이 세부작업 그룹별로 묶은 세부작업 목록을 보여준 뒤 Skill 도구로 선택된 yeoboya-<key> 스킬을 trigger한다. 구현에 착수하기 전 write-code 진입 게이트(sync-links + 필수 문서 검사; workType=feature는 정책서/UI 흐름도/데이터 흐름도가 없으면 하드 블록)를 포함한다."
user-invocable: true
---

# yeoboya-select-subtask

작업 선택 + 전체 세부작업 목록 표시 + Skill 도구로 trigger.

## 1. 작업 목록 스캔

`.workflow/` 디렉토리를 스캔하여 `work.json`이 있는 모든 작업 폴더를 수집:

```
진행 중 작업 목록:
  - [DCL-1234] 라이브 방송 검색 — 기능 추가 [현재]
  - [DCL-1245] 클럽 입장 시 알림 — 버그 수정

어느 작업을 진행하시겠어요? 작업번호를 입력하세요.
```

`[현재]` 마커는 `workspace.json`의 `activeWork`와 일치하는 작업에 부착. 목록이 비어 있으면 안내 후 종료. 작업번호가 1개뿐이면 자동 선택 (안내만 출력).

## 2. activeWork 갱신

사용자 선택 → `workspace.json`의 `activeWork` 필드를 선택된 작업번호로 갱신.

## 3. 세부작업 목록 표시

`references/state-schema.md §4`의 `SUBTASK_GROUPS` 순서로 전체 11개 세부 작업을 표시. 마커 규칙:

| 조건 | 마커 |
|---|---|
| `work.json.links`에 해당 키 존재 | ✓ |
| 그 외 | (공백) |

추천 마커(▶)는 없다. 모든 항목은 동등하게 나열된다.

예시:
```
[DCL-1234 · 라이브 방송 검색 · 기능 추가]

세부작업 목록 (원하는 세부 작업을 선택하세요):
  ◆ 기획
    ✓ 기획서 검토
      정책서 작성
  ◆ 설계
      도메인 명세서
      UI 흐름도
    ✓ 데이터 흐름도
  ◆ 개발
      코드 작성
      버그 수정
      코드 리뷰
  ◆ 테스트
      QA 시나리오
      QA 버그 수정
  ◆ 종결
      작업 종결
```

키·라벨 매핑은 `references/state-schema.md §4`의 `SUBTASK_LABELS` 참조.

## 4. 메뉴 (자연어 응답)

"진행할 세부 작업 이름을 입력하세요 (종료: '취소')."

세부 작업 이름은 `SUBTASK_LABELS`의 한국어 라벨 또는 키(예: `write-policy`) 모두 매칭. **단축키(y/s/n) 사용 금지.**

## 5. 응답 분기

| 응답 | 동작 |
|---|---|
| 세부 작업 이름 (`links`에 없음) | 해당 항목 trigger (§6 게이트 → §7) |
| 세부 작업 이름 (`links`에 이미 존재) | "이 항목은 이미 Notion 페이지가 있습니다. 다시 실행하면 기존 페이지를 갱신합니다. 진행할까요? (네/아니요)" → "네"면 trigger |
| "취소" / "종료" | 종료 |

**작업 종결 전용 선행 확인** (세부 작업 이름 매칭 후, trigger 전):

`work.json.reviewDone`을 확인한다.
- `false`이면 즉시 하드 블록:
  ```
  코드 리뷰가 완료되지 않았습니다. 코드 리뷰(review-code)를 먼저 진행해 주세요.
  ```
  메뉴(§4)로 복귀. "네/아니요" 게이트 없음.
- `true`이면 기존 흐름대로 trigger.

이 블록(reviewDone 확인)은 workType에 무관하게 항상 하드 블록이다. (write-code 게이트(§6)의 하드 블록은 feature 한정인 것과 구분된다.)

## 6. write-code 진입 게이트 (대상이 `write-code`일 때만)

trigger 직전:

1. **선행 문서 sync** — `yeoboya-publish-notion mode="sync-links"`(work=작업번호)를 호출해 작업 row 자식 페이지를 `work.json.links`에 동기화한다.
2. **필수 집합 검사** — 필수 집합 = `{write-policy, draw-ui-flow, draw-data-flow}`. 동기화된 `work.json.links`에서 각 키 존재를 확인한다. 누락 키의 라벨은 `SUBTASK_LABELS`(`references/state-schema.md §4`)로 변환.
   - **workType=feature**: 누락 키가 하나라도 있으면 **하드 블록**:
     ```
     코드 작성에는 다음 문서가 Notion에 먼저 있어야 합니다: <누락 라벨 목록>.
     해당 문서를 직접 작성하거나 세부 작업으로 생성한 뒤 다시 시도하세요.
     ```
     §4 메뉴로 복귀. 진행 불가.
   - **workType=update 또는 bugfix**: 누락이 있어도 경고 후 확인:
     ```
     다음 문서가 아직 없습니다: <누락 라벨 목록>. 그래도 코드 작성을 진행할까요? (네/아니요)
     ```
     "네" 외 응답 → §4 메뉴 복귀.
3. 통과 시:
   - feature: `기획·설계 산출물 확정됨, 코드 작성을 진행합니다.` 안내 후 §7 trigger.
   - update/bugfix: 위 확인을 통과하면 §7 trigger.

이 게이트는 feature에 한해 하드 블록이다. 다른 항목에는 이 검사를 적용하지 않는다.

## 7. 항목 trigger

Skill 도구로 해당 `yeoboya-<key>` skill 호출. 전달 컨텍스트:

- `work` (작업번호)
- `workType`
- 필요 시 `referenceWork`

## 8. 항목 완료 후 종료

trigger된 skill이 완료 안내를 출력하면 본 skill은 **반복하지 않고 즉시 종료**. 사용자는 새 세션에서 `/yeoboya-select-subtask`를 다시 호출.

## 9. Self-validation

trigger 전:
- 선택한 키가 `references/state-schema.md §4`의 `SUBTASK_LIST`에 속하는지 검증.
- 대상이 `write-code`이면 §6 절차(sync-links 실행 → 필수 집합 검사)를 수행했는지 검증. feature인데 필수 3종이 동기화된 links에 모두 존재하지 않으면 trigger 금지.
