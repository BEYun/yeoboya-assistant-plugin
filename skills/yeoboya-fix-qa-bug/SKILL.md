---
name: yeoboya-fix-qa-bug
description: "yeoboya-select-subtask이 이 세부작업을 trigger할 때, 즉 사용자가 QA 회귀를 발견했을 때만 사용한다. 직접 호출 금지. 완전히 새로운 사용자 보고 버그에는 절대 사용하지 말 것 — 그건 yeoboya-fix-bug다. 이것은 회귀 범위 과제이다: 기존 write-code 결과 + QA 시나리오에 기반한 좁은 진단, 빠른 패치, 전체 RCA 없음. QA 사이클 동안 여러 번 호출될 수 있다."
user-invocable: false
---

# yeoboya-fix-qa-bug

QA 발견 회귀 수준 패치. **반복 호출** 가능. write-code 결과물 기반 좁은 범위 진단/수정.

## 1. 전제

- task.json 존재.
- QA 시나리오(task.json.links['write-qa'])가 있으면 참고한다. 없어도 진행 가능.

## 2. fix-bug과의 차이

| 항목 | fix-bug | fix-qa-bug |
|---|---|---|
| 진단 깊이 | 깊음 (RCA + 재현) | 좁음 (회귀 범위) |
| 범위 | 사용자 보고 새 이슈 | QA 시나리오에서 발견된 회귀 |
| 사이클 | 단발 | 반복 가능 |
| taskType | bugfix 진입 stage | 모든 taskType의 verify 단계 |

## 3. 입력 수집

```
QA에서 발견된 사항을 알려주세요.
  - 관련 QA 케이스 ID (예: QA-002) 또는 자유 기술
  - 재현 단계
  - 기대 vs 실제
```

## 4. 수정 절차

1. 좁은 범위 진단 — QA 케이스가 호출하는 UI/data flow ID 따라 관련 코드 위치 식별
2. 수정 + 테스트 (TDD 권장)
3. 커밋 메시지: `[<과제번호>] [qa-fix] <변경 요약>`
4. 관련 QA 케이스 재실행 안내 (사용자가 확인 후 또 다른 발견 사항 있으면 본 skill 다시 호출)

## 5. Self-validation

- [ ] QA 케이스 ID가 write-qa 산출물에 존재 (자유 기술이면 skip)
- [ ] 수정 범위가 회귀 수준 (전체 phase 재실행이 아니라 단일/소수 파일 수정)
- [ ] 커밋 메시지가 `[qa-fix]` 라벨 포함

## 6. 종료 안내

QA 버그 수정 완료. (반복 호출 가능.)

```
QA 버그 수정 완료. 더 발견된 사항이 있으면 /yeoboya-select-subtask에서 다시 QA 버그 수정을 선택하세요.
없으면 과제 종결로 진행 가능.
새 세션에서 /yeoboya-select-subtask을 호출하세요.
```
