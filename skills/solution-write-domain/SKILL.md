---
name: solution-write-domain
description: "solution-choose-subtask이 이 세부작업을 trigger할 때만 사용한다. 직접 호출 금지. Notion에서 정책서를 가져와, 도메인 객체/규칙/페르소나/이벤트 모델링을 사용자와 함께 진행하고, 자체 검증을 실행한 뒤, title='도메인 명세서'로 solution-publish-notion을 호출한다."
user-invocable: false
---

# solution-write-domain

도메인 명세서 작성.

## 1. 전제

- task.json 존재.
- 정책서(task.json.links['write-policy'])가 있으면 SOT로 사용한다. 없으면 사용자에게 알리고 진행 여부를 확인한다.
- **진입 시 sync (필수 첫 동작)**: `solution-publish-notion mode="sync-links"`(work=작업번호)를 1회 호출해 작업 row 자식 페이지를 `task.json.links`에 동기화한다 — (a) 다른 작업자가 만든 선행 문서를 links에서 인식, (b) 본 산출물이 이미 있으면 publish가 update가 되어 중복 페이지 방지.

## 2. 입력 fetch

1. 정책서 fetch (task.json.links['write-policy'] → notion-fetch)
2. **taskType=update 이전 버전 해석** — `references/state-schema.md §6` 규칙대로 이전 도메인 명세서를 해석한다(자기 재publish, 또는 `referenceTask`의 도메인 명세서를 Notion 권위 출처로 해석). **후보 있음(분기 A)** → fetch. **후보 없음(분기 B)** → §6대로 기준 모듈/파일 경로를 사용자에게 요청해 코드베이스 기반 산출. provenance는 §6 표대로 헤더 + 변경 이력에 기록.

## 3. 작성 절차

**작성 문체 (모든 문장에 적용)**:
- 개조식·간결체. 구어체·군더더기("~하게 됩니다", "~인 것 같아요" 류) 배제, 핵심 키워드를 문장 앞에. 한 문장 = 한 정보.
- **플랫폼 용어 통일** — 플랫폼을 언급할 땐 `workspace.platform` 값(**iOS** 또는 **Android**) 하나만 쓴다. "모바일 / 네이티브 / 앱" 등 모호·혼용 표현 금지(플랫폼을 확실히 규명).
- **유비쿼터스 언어** — 엔터티·상태·전이·이벤트명은 정책서/도메인의 업무 용어로 쓴다. 코드베이스 식별자(클래스·함수·변수·enum·상수명)를 그대로 문서 용어로 쓰지 않는다. 특히 taskType=update 분기 B(코드베이스 기반 산출)에서는 코드 심볼을 도메인 용어로 **번역**해 기술한다.

1. **정책 SOT footnote 확정** — `task.json.links['write-policy']`를 정책 SOT link로 사용.
2. **엔터티 도출** — 정책서 §용어/§페르소나/§정책 카탈로그에서 도메인 객체를 식별. 각 객체의 필드를 표로 정리. DB 식별자(`id`, 외래키)는 데이터 흐름도에서 확정하므로 본 문서엔 포함하지 않음.
3. **페르소나별 시나리오** — 정책서 §페르소나 그대로 사용 + 각 페르소나의 주요 시나리오 행.
4. **상태 머신** — 상태가 있는 엔터티만 §3.X 서브섹션 작성:
   - Mermaid stateDiagram-v2
   - 전이 규칙 표 (From → To / 조건 / 페르소나)
   - 불변식 글머리
   - **상태·전이 라벨은 유비쿼터스 언어(도메인 용어)로** — 코드 enum/상수/필드명을 그대로 상태명으로 쓰지 않는다(예: `STATUS_ACTIVE` ✗ → `활성` ✓). update 분기 B에서 코드베이스 상태값을 읽어 올 때도 도메인 용어로 번역한다.
5. **결정 필요 항목** — 정책서/검토에서 미해결로 남은 도메인 의문점. 없으면 "현재 없음" 명시.
6. **변경 이력** (taskType=update, `references/state-schema.md §6`) — 이전 버전이 있으면 §변경 이력에 이번 수정 1행 추가. 이전 버전 없이 신규로 진행한 경우 첫 행을 `최초 작성`으로 기록.

본문 구조는 `references/domain-template.md`를 직접 따른다.

## 4. Self-validation (publish 직전)

- [ ] 페이지 제목 = "도메인 명세서"
- [ ] 첫 줄 또는 footnote에 정책 SOT link (정책서 페이지 URL)가 존재
- [ ] §1 엔터티 1개 이상, 각 엔터티는 필드 표 존재
- [ ] §2 페르소나별 시나리오 표 1행 이상, 페르소나 명칭이 정책서 §페르소나와 일치
- [ ] 상태 머신이 필요한 엔터티는 §3.X에 Mermaid stateDiagram + 전이 규칙 + 불변식 모두 존재
- [ ] 상태·전이·엔터티명이 유비쿼터스 언어(도메인 용어) — 코드 식별자(enum/상수/변수/함수명) 없음
- [ ] 플랫폼 표기가 iOS/Android 중 하나로 통일 (모바일/네이티브/앱 등 모호어 없음)
- [ ] 문장이 간결·개조식 (구어체·군더더기 없음)
- [ ] §4 결정 필요 항목이 명시되거나 "현재 없음"
- [ ] (taskType=update) §변경 이력 1행 이상 (분기 B 코드베이스 산출 시 첫 행 `최초 작성`)
- [ ] (taskType=update) provenance — 헤더 "이전 버전" + 변경 이력 `참고본`이 §6 표와 일치 (referenceTask 번호 / `코드베이스: <경로>` / `—`)

## 5. publish

```
solution-publish-notion 호출:
  work: <작업번호>
  mode: "dispatch"
  key: "write-domain"
  markdown: <본문>
```

properties는 비워둠 (작업명/도메인/담당자 변경 없음).

## 6. 종료 안내

```
도메인 명세서 작성 완료. 다음 권장 단계: UI 흐름도.
새 세션에서 /solution-choose-subtask을 호출하세요.
```
