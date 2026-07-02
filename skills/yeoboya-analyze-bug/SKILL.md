---
name: yeoboya-analyze-bug
description: "yeoboya-select-subtask이 이 세부작업을 trigger할 때만 사용한다. 직접 호출 금지. bugfix 과제에서 상류 기획/설계 산출물이 없으므로 사용자에게 버그 내용(증상·재현 절차·기대 동작)을 직접 묻고, 원인을 분석하며, 성공 기준(acceptance criteria)을 정의한 markdown을 작성한 뒤 자체 검증을 거쳐 title='버그 분석'으로 yeoboya-publish-notion을 호출한다. notion-page-record hook이 pageId를 task.json.links['analyze-bug']에 자동 기록한다."
user-invocable: false
---

# yeoboya-analyze-bug

버그 분석 (bugfix 전용 — 문제·성공 기준 정의. 기획·설계를 대체).

## 1. 전제

- task.json 존재. taskType=bugfix 가정 (select-subtask이 bugfix 뷰의 `진단` 그룹에서만 노출).
- **진입 시 sync (필수 첫 동작)**: `yeoboya-publish-notion mode="sync-links"`(work=과제번호)를 1회 호출해 과제 row 자식 페이지를 `task.json.links`에 동기화한다 — 본 산출물이 이미 있으면 publish가 update가 되어 중복 페이지 방지.

## 2. 입력 수집 (사용자에게 직접 질의)

상류 기획/설계 산출물이 없으므로 사용자에게 다음을 묻는다 (한 번에 하나씩, 모호하면 추가 질문):

1. **증상** — 무엇이 잘못 동작하는가? (관측된 현상)
2. **재현 절차** — 어떤 단계로 재현되는가? (전제 상태 → 동작 → 결과)
3. **기대 동작** — 원래 어떻게 동작해야 하는가?
4. (선택) 발생 환경 — 플랫폼/버전/계정 등 한정 조건

## 3. 작성 절차

1. **원인 분석** — 증상·재현 절차를 토대로 추정 원인을 정리한다. 코드 확인이 필요하면 관련 파일을 읽어 근거를 보강한다 (확정 불가 시 "추정"으로 표기).
2. **성공 기준(acceptance criteria) 정의** — 수정 완료를 판정할 검증 가능한 기준을 체크리스트로 작성한다. 이후 QA 시나리오·코드 완료기준의 입력이 된다.
3. **본문 작성** — 아래 4 섹션 구조로 markdown 작성:

   ```markdown
   ## 메타
   - 업로드: <업로드 일시>
   - 과제자: <worker>

   ## 1. 문제/증상
   <관측된 현상>

   ## 2. 재현 절차
   1. <전제 상태>
   2. <동작>
   3. <결과>

   ## 3. 원인 분석
   <추정/확정 원인 + 근거>

   ## 4. 성공 기준 (acceptance criteria)
   - [ ] <검증 가능한 기준 1>
   - [ ] <검증 가능한 기준 2>
   ```

## 4. Self-validation (publish 직전)

- [ ] 페이지 제목 = "버그 분석" (hook 매핑용)
- [ ] §메타 (업로드 일시 + 과제자) 명시
- [ ] §1 문제/증상 1문장 이상
- [ ] §2 재현 절차 1단계 이상
- [ ] §3 원인 분석 1항목 이상 (확정 불가 시 "추정" 표기)
- [ ] §4 성공 기준 체크리스트 1행 이상

실패 시 사용자에게 누락 항목 안내 후 보완.

## 5. publish

```
yeoboya-publish-notion 호출:
  work: <과제번호>
  mode: "dispatch"
  key: "analyze-bug"
  markdown: <위에서 작성한 마크다운>
  properties: { taskType: "bugfix", 과제명: <name> }
```

title은 전달하지 않는다 — publish-notion이 `KEY_TO_TITLE["analyze-bug"][0]` = "버그 분석"을 페이지 제목으로 사용. publish 후 notion-page-record hook이 task.json.links['analyze-bug']에 pageId를 자동 기록.

## 6. 종료 안내

```
버그 분석 완료. 다음 권장 단계: QA 시나리오.
컨텍스트 정리를 위해 새 세션에서 /yeoboya-select-subtask을 호출하세요.
```
