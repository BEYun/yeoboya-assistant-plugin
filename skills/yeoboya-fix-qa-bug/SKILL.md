---
name: yeoboya-fix-qa-bug
description: "Use ONLY when yeoboya-route-work triggers this work-list item, when the user has found a QA regression. NEVER invoke directly. NEVER use this for a brand-new user-reported bug — that's yeoboya-fix-bug. This is regression-scope: narrow diagnosis based on existing write-code result + QA scenario, quick patch, no full RCA. May be invoked multiple times during the QA cycle."
user-invocable: false
---

# yeoboya-fix-qa-bug

QA 발견 회귀 수준 패치. **반복 호출** 가능. write-code 결과물 기반 좁은 범위 진단/수정.

## 1. 전제

- work.json 존재.
- QA 시나리오(work.json.links['write-qa'])가 있으면 참고한다. 없어도 진행 가능.

## 2. fix-bug과의 차이

| 항목 | fix-bug | fix-qa-bug |
|---|---|---|
| 진단 깊이 | 깊음 (RCA + 재현) | 좁음 (회귀 범위) |
| 범위 | 사용자 보고 새 이슈 | QA 시나리오에서 발견된 회귀 |
| 사이클 | 단발 | 반복 가능 |
| workType | bugfix 진입 stage | 모든 workType의 verify 단계 |

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
3. 커밋 메시지: `[<작업번호>] [qa-fix] <변경 요약>`
4. 관련 QA 케이스 재실행 안내 (사용자가 확인 후 또 다른 발견 사항 있으면 본 skill 다시 호출)

## 5. Self-validation

- [ ] QA 케이스 ID가 write-qa 산출물에 존재 (자유 기술이면 skip)
- [ ] 수정 범위가 회귀 수준 (전체 phase 재실행이 아니라 단일/소수 파일 수정)
- [ ] 커밋 메시지가 `[qa-fix]` 라벨 포함

## 6. 종료 안내

QA 버그 수정 완료. (반복 호출 가능.)

```
QA 버그 수정 완료. 더 발견된 사항이 있으면 /yeoboya-route-work에서 다시 QA 버그 수정을 선택하세요.
없으면 작업 종결로 진행 가능.
새 세션에서 /yeoboya-route-work을 호출하세요.
```
