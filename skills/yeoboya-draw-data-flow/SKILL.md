---
name: yeoboya-draw-data-flow
description: "Use ONLY when yeoboya-continue-work triggers this skill for workType=feature/update after draw-ui-flow. NEVER invoke directly. For each user action ID from the UI 흐름도, defines the corresponding data flow action (API endpoint, Socket event, or local operation). Endpoints follow /도메인명 convention. Self-validates that every UI action ID is mapped. Publishes 'Notion 데이터 흐름도'."
user-invocable: false
---

# yeoboya-draw-data-flow

데이터 흐름도. **UI 흐름도의 액션 ID마다 데이터 흐름 액션**을 정의하고, 각 데이터 흐름 액션을 API endpoint, Socket event, 또는 로컬 연산으로 명시.

## 1. 전제

- `stages.draw-ui-flow.status` ∈ {`done`, `published`}
- `stages.draw-data-flow.status === "todo"` 또는 재실행

## 2. 입력 fetch

- UI 흐름도 + 도메인 명세서 fetch
- UI 흐름도의 §2 사용자 액션 표에서 모든 액션 ID 추출

## 3. 작성 절차

본문 구조:

```
# 데이터 흐름도

## 1. 데이터 흐름 액션 (UI 액션 ID 기반)
| UI 액션 ID | 데이터 흐름 ID | 흐름 종류 | 명세 |
|---|---|---|---|
| A-001 | D-001 | API | POST /auth/login |
| A-001 | D-002 | Local | 토큰 keychain 저장 |
| A-002 | D-003 | Socket | live:search:query |

## 2. API endpoint 명세
### POST /auth/login
- 도메인: 인증
- Request: { email, password }
- Response: { token, user }
- 에러: 401 (인증 실패), 400 (입력 오류)

(각 API마다 반복)

## 3. Socket event 명세
### live:search:query
- 도메인: 라이브방송
- Payload: { query, limit }
- Response: stream of { item }
- 종료 조건: ...

(각 Socket event마다 반복)
```

API endpoint는 `/<도메인명>/<리소스>` 컨벤션. 도메인명은 workspace.json의 `notion.domainMapping` 키와 일치 (예: `/dalla/users`).

데이터 흐름 ID 패턴: `D-NNN`. **한 UI 액션이 여러 데이터 흐름과 연결될 수 있다** (1:N).

## 4. Self-validation (publish 직전)

- [ ] §1 모든 행의 UI 액션 ID가 UI 흐름도 §2에 존재
- [ ] §1 데이터 흐름 ID는 모두 유일 (`D-NNN` 패턴)
- [ ] §1 흐름 종류 ∈ {`API`, `Socket`, `Local`}
- [ ] §2의 모든 API endpoint가 `/<도메인명>` 컨벤션 준수
- [ ] §2/§3 명세된 모든 API/Socket이 §1 표에 등장
- [ ] UI 흐름도의 모든 액션 ID가 §1에 최소 1개 매핑

## 5. publish

```
yeoboya-publish-notion 호출:
  task: <progress.task>
  mode: "dispatch"
  stage: "draw-data-flow"
  title: "데이터 흐름도"
  markdown: <본문>
```

## 6. 종료 안내

```
데이터 흐름도 작성 완료. 다음 권장 단계: 코드 작성.
새 세션에서 /yeoboya-continue-work을 호출하세요.
```
