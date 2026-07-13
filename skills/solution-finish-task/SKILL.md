---
name: solution-finish-task
description: "solution-choose-subtask이 이 작업 종결 세부작업을 trigger할 때만 사용한다. 직접 호출 금지. git log 커밋 패턴 준수를 검증하고, task.json.links에 어떤 산출물이 존재하는지 보고하며, 작업 DB row에서 workspace.platform에 대응하는 iOS_완료/Android_완료 boolean을 토글하고, 종결 보고서를 출력한다. 새 페이지를 게시하지 않고, task.json에 아무것도 쓰지 않으며, 작업 상태를 건드리지 않는다."
user-invocable: false
---

# solution-finish-task

작업 종결 검증 + 보고.

## 0. 선행조건 확인 (필수 첫 단계)

`.assistant/<작업번호>/task.json`을 Read → `codeReviewDone` 확인.

`codeReviewDone`이 `false`이거나 필드가 없으면:
```
코드 리뷰가 완료되지 않았습니다. 코드 리뷰(review-code)를 먼저 진행해 주세요.
```
즉시 종료. 아래 단계를 진행하지 않는다.

`codeReviewDone`이 `true`이면 §1부터 정상 진행.

## 1. 전제

- 선행 stage 발행 여부를 확인하되, 미완료 stage가 있어도 hard 종료하지 않는다 — 보고에 ⚠ 표시 후 계속 진행.
- finish-task는 언제든 실행할 수 있다.

## 2. git 검증

`task.json.codeBaseSha`로 이 작업의 커밋을 range 수집하고 prefix 규약을 검사한다:

```bash
BASE=$(jq -r '.codeBaseSha // empty' .assistant/<작업번호>/task.json)
if [ -n "$BASE" ]; then
  git log "$BASE"..HEAD --oneline
else
  git log --grep='\[<작업번호>\]' --oneline   # legacy fallback
fi
```

각 커밋 메시지 표준 패턴 검사:
- `[<작업번호>] ...` (write-code → work 구현 커밋)
- `[<작업번호>] fix: ...` (bug-fix / fix-bug)
- `[<작업번호>] [qa-fix] ...` (fix-qa-bug)

range 안에서 위 prefix가 없는 커밋이 있으면 보고에 ⚠ 마커(인터리브된 타 작업 커밋일 수 있음 — 보고에 명시).

## 3. Notion 발행 상태 보고

`task.json.links`에 기록된 산출물 항목을 나열한다. 선행조건·필수 집합 개념은 없으므로, 기록되지 않은 항목은 경고가 아니라 단순 "미발행"으로 표시한다.

## 4. Notion 작업 DB row 종결 처리

**본인 플랫폼 완료 토글**

`workspace.platform` 확인 후 본인 플랫폼만 토글:

```
solution-publish-notion 호출:
  work: <작업번호>
  mode: "dispatch"
  key: "finish-task"
  markdown: ""
  properties:
    iOS_완료: true       # workspace.platform === "iOS"일 때만 포함
    Android_완료: true   # workspace.platform === "Android"일 때만 포함
```

두 boolean 모두 본인 플랫폼만 토글한다. 다른 플랫폼의 boolean은 건드리지 않는다 — 다른 플랫폼 작업자가 자기 finish-task에서 자기 boolean을 켤 책임.

## 5. 종결 보고 출력

코드 작업는 `task.json.codeBaseSha..HEAD` range 커밋으로 요약한다(phase 개념 없음):

```bash
BASE=$(jq -r '.codeBaseSha // empty' .assistant/<작업번호>/task.json)
[ -n "$BASE" ] && git log "$BASE"..HEAD --oneline || echo "(코드 작업 미실행 — codeBaseSha 없음)"
```

출력 예시 — 코드 작업 포함:

```
[<작업번호>] <작업명> — <taskType 한국어 라벨> 종결 보고

▸ 커밋: <N>개 ✓ (codeBaseSha..HEAD)
▸ Notion 발행 (task.json.links 기준):
    ✓ 기획서 검토 (pageId: ...)
    ✓ 정책서
    ✓ 도메인 명세서
      UI 흐름도 (미발행)
    ✓ 데이터 흐름도 · 통신 명세서
    ✓ QA 시나리오
▸ 코드 작업:
    ✓ <N>개 커밋 (하네스 work 닫힌 루프)
    ⚠ prefix 규약 위반 커밋 <M>개 (있을 때만)
▸ 경고: <0 또는 ⚠ 항목>

작업가 종결되었습니다.
```

`codeBaseSha`가 없으면 `▸ 코드 작업: (미실행)` 한 줄만 출력한다.

## 6. Self-validation

- [ ] §2 git 검증 결과가 보고에 포함
- [ ] §3 Notion 발행 상태가 보고에 포함
- [ ] ⚠ 항목이 있으면 보고에 명시적 표시
- [ ] workspace.platform이 iOS면 iOS_완료=true 호출, Android면 Android_완료=true 호출
