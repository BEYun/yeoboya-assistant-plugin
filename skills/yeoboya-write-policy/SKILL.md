---
name: yeoboya-write-policy
description: "Use ONLY when yeoboya-continue-work triggers this skill for workType=feature first stage, or workType=update when user opts to redo policy. NEVER invoke directly. Reads referenced 기획서 from Notion, walks the user through review items, drafts the 정책서 markdown using references/policy-template.md, runs self-validation, then calls yeoboya-publish-notion with title='정책서'. The notion-page-record hook handles the done→published transition automatically."
user-invocable: false
---

# yeoboya-write-policy

정책서 작성 (v1 work-define + spec-review + spec-finalize 통합).

## 1. 전제

- progress.json이 존재하고 `workType ∈ {feature, update}`
- `stages.write-policy.status === "todo"` 또는 재실행 (status 재설정은 호출자가 수행)
- workType=update + referenceTask 있을 시: 기준 정책서 fetch

## 2. 입력 fetch

1. Notion에서 작업 DB row 조회 (yeoboya-publish-notion mode=sync) → 기획서 페이지 링크 추출
2. 기획서 본문 fetch (notion-fetch)
3. workType=update + referenceTask: 참고 작업의 정책서 (`stages.write-policy.notionPageId`) fetch

## 3. 작성 절차

1. **기획 검토** — 기획서 본문 읽고 핵심 의사결정 / 모호한 부분 / 누락 항목을 사용자와 대화
2. **정책 결정** — 검토 결과를 `references/policy-template.md` 구조로 정리
3. **변경 이력** (update workType만) — referenceTask 정책서와의 diff를 §5에 명시

## 4. Self-validation (publish 직전)

다음 체크리스트를 만족하는지 확인:

- [ ] §1 작업 개요의 task / workType / name이 progress.json과 일치
- [ ] §2 기획 검토에 기획서 페이지 링크 포함
- [ ] §3 정책 결정 표에 최소 1개 행
- [ ] §4 미해결 이슈가 명시되거나 "없음"
- [ ] workType=update + referenceTask일 때 §5 변경 이력 작성

실패 시 사용자에게 누락 항목 안내 후 보완.

## 5. publish

```
yeoboya-publish-notion 호출:
  task: <progress.task>
  mode: "dispatch"
  stage: "write-policy"
  title: "정책서"
  markdown: <위에서 작성한 마크다운>
  properties: { workType: <한국어 라벨>, 작업명: <name>, 도메인: <도메인>, 담당자: <workerPageId> }
```

publish 후 `notion-page-record` hook이 자동으로 `stages.write-policy.status="published"` + `notionPageId` 부착.

## 6. 종료 안내

```
정책서 작성 완료. 다음 권장 단계: 도메인 명세서.
컨텍스트 정리를 위해 새 세션에서 /yeoboya-continue-work을 호출하세요.
```
