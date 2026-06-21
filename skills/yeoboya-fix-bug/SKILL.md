---
name: yeoboya-fix-bug
description: "Use ONLY when yeoboya-route-work triggers this work-list item for workType=bugfix. NEVER invoke directly. NEVER use this for QA-found regressions — that's yeoboya-fix-qa-bug. This skill is for full-depth diagnosis of a user-reported bug (reproduction, root cause analysis, fix, test). Output is git commits with standard pattern; no Notion publish."
user-invocable: false
---

# yeoboya-fix-bug

사용자 보고 신규 버그의 수술 수준 진단/수정. **bugfix workType의 entry stage 전용** — QA 발견 회귀는 `yeoboya-fix-qa-bug` 사용.

## 1. 전제

- work.json 존재.

## 2. 진단 절차

1. **증상 입력 수집** — 사용자에게:
   - 재현 경로 (어떻게 발생?)
   - 환경 (iOS 버전, 디바이스, 빌드)
   - 기대 동작 vs 실제 동작
   - 첨부 자료 (스크린샷, 로그, Notion 이슈 링크)
2. **재현** — 가능하면 로컬 재현, 안 되면 사용자가 보고한 정보로 추정 재현 경로 작성
3. **근본 원인 분석** — superpowers의 `systematic-debugging` skill 활용 권장. 코드 read/grep으로 영향 범위 파악
4. **수정 + 테스트** — TDD 권장 (실패 테스트 → 수정 → 통과)
5. **회귀 확인** — 관련 기능에 부작용 없는지 사용자 확인

## 3. 커밋 메시지

표준 패턴: `[<작업번호>] fix: <증상 요약>` (예: `[DCL-1245] fix: 클럽 입장 시 알림 중복 발송`)

본문에 근본 원인 + 수정 접근 요약.

## 4. Self-validation

- [ ] 사용자 보고 증상이 재현 또는 명확히 추정됨
- [ ] 근본 원인이 코드 위치(파일/라인)로 식별됨
- [ ] 수정 + 테스트가 별도 커밋 (TDD라면) 또는 한 커밋이라도 메시지에 명시
- [ ] 회귀 가능성을 사용자에게 한 번 명시 (영향받을 수 있는 기능 목록)

## 5. 종료 안내

버그 수정 완료 후:

```
버그 수정 완료. 다음 권장 단계: 코드 리뷰.
새 세션에서 /yeoboya-route-work을 호출하세요.
```
