# notion-schema

작업 DB · 팀원 DB · 산출물 페이지 publish 시 사용하는 Notion 측 스키마 SoT.

state-schema.md(로컬)와 분리. **변경은 본 파일에서 먼저, 그 다음 hook lib와 skill body에 반영.**

## 1. 작업 DB

- URL: `collection://f8c09dfc-cbf8-40f2-ac4c-a6a1b57ef030`
- 팀원 목록 DB: `collection://cc47fa31-4d64-4ecc-ad96-95c0048c355c`

### 산출물 페이지 위치

세부작업 산출물(정책서, UI 흐름도, 데이터 흐름도, 통신 명세서, 기획서 검토)은 해당 작업 DB **row의 자식(child) 페이지**로 생성된다. 제목은 항상 플러그인 경유 정규값(`hooks/lib/constants.json`의 `KEY_TO_TITLE` 값)이다. `sync-links`는 row의 자식(페이지 및 데이터베이스)을 나열해 제목 정확 일치로 `task.json.links`를 채운다.

### QA 시나리오 — 자식 데이터베이스(테이블)

**QA 시나리오(write-qa)만 예외**: 마크다운 자식 페이지가 아니라 작업 row **자식 데이터베이스**로 생성된다(제목 "QA 시나리오"). 행=테스트 케이스, 컬럼 순서(고정)=`케이스 ID`(title)·`페르소나`·`시나리오`·`카테고리`·`관련 API / Socket`·`iOS 결과`·`Android 결과`·`Web 결과`(`페르소나`는 도메인 명세서 집합 기반 동적 select, 그 외 select 옵션은 write-qa SKILL §3). 이 나열 순서가 DB 컬럼 표시 순서다(DDL 컬럼 선언 순서로 결정). `케이스 ID`는 페르소나→카테고리 순으로 부여해 ID 오름차순 정렬(리스팅) 시 페르소나·카테고리별로 묶인다. 행 본문에 `사전 조건`/`테스트 단계`/`기대 결과`. 플랫폼별 결과 컬럼은 신규 행 시 대상 플랫폼 `미테스트`·비대상 `N/A`이고 QA 수행 시 사람이 채운다.

- `links['write-qa']` = **데이터베이스 페이지 id**(`collection://` data source id가 아님). 생성 직후 `dispatch-db`가 `list-children → sync-links`로 기록한다(publish-notion §4.5). `child_database` 블록도 `list-children`에 포함되므로 제목 "QA 시나리오"가 `resolveKey`로 매칭된다.
- 행 페이지(케이스 ID 제목)는 `TITLE_TO_KEY`에 없어 `notion-page-record` hook이 unknown-title로 skip → links 미오염. 데이터베이스 생성(`notion-create-database`)은 hook의 write 도구가 아니라 통과.
- 재게시는 **append-only**: 기존 케이스 ID는 보존(사람이 입력한 플랫폼별 결과 보호), 새 케이스만 추가. row 본문 제목2 삽입 로직은 DB 산출물에 적용되지 않는다.

### row 본문의 제목2(heading_2)

각 산출물 자식 페이지는 row 본문에서 자신을 가리키는 **제목2(heading_2) 블록 바로 아래**에 위치한다(자식 페이지만 달랑 놓이지 않게). 제목2 텍스트는 `constants.json`의 `KEY_TO_ROW_HEADING`(KEY_TO_TITLE와 같은 인덱스의 병렬 배열) 값이다 — 대개 페이지 제목과 같고 write-policy-feedback만 "기획서 검토 결과". 이 제목2는 **자식 페이지가 아니라 row 본문의 블록**이므로 `list-children`/`sync-links`의 자식 나열에 잡히지 않고 링크 매칭에 영향을 주지 않는다. 제목2 삽입은 **존재 여부로 멱등**하다 — row 본문에 해당 제목2가 없을 때만 삽입하고 그 아래 자식 페이지를 둔다(re-publish 시 이미 있으므로 미삽입). 삽입 책임은 `solution-publish-notion` dispatch 흐름(§4)에 있다.

**QA 시나리오 자식 데이터베이스도 동일하게** 자체 제목2(`"QA 시나리오"`, `KEY_TO_ROW_HEADING['write-qa'][0]`) 아래에 놓인다 — dispatch-db(§4.5)가 create-database에 `rowHeading`을 전달해 삽입한다. 이 제목2가 없으면 DB가 직전 산출물(통신 명세서)의 제목2 아래에 붙어 통신 명세서의 일부처럼 보이므로, `"QA 시나리오"` 제목2를 통신 명세서 **아래**에 두어 별도 묶음이 되게 한다.

### 기획서 검토(버전드) — 버전마다 새 페이지

write-policy-feedback은 **버전드 키**다(`constants.json` `VERSIONED_TITLE_PREFIXES`, state-schema §4). 기획서 버전마다 `"기획서 검토 - <버전>"` 제목의 **새 자식 페이지**가 생성되며(단일 페이지 update 아님), 모든 버전 페이지가 row 본문의 단일 제목2 `"기획서 검토 결과"` **하나를 공유**해 그 아래 누적된다. `links['write-policy-feedback']`는 `{ "기획서 검토 - v0.6": id, "기획서 검토 - v0.7": id, … }`로 버전별 누적(draw-data-flow의 다중 페이지 구조와 동일). `sync-links`/`notion-page-record`는 제목 접두사 매칭(resolveKey)으로 이 버전 페이지들을 같은 키로 모은다. 같은 버전을 재게시할 때만 해당 페이지가 update된다.

## 2. Properties

| 속성 | 타입 | 기점 스킬 | 동작 |
|---|---|---|---|
| 작업명 | title | `create-work` | 입력 → set |
| 작업번호 | text | `create-work` | `<work>` → set |
| 작업 유형 | select | `create-work` | taskType 매핑 → set |
| 도메인 | select | `create-work` | row에 비어 있으면 입력(optional) → set |
| 담당자 | relation (multi) | `create-work` | 본인 worker URL만 append (replace 금지) |
| 작업 상태 | select | — | 스킬 범위 외 (Notion에서 수동 설정) |
| 작업 일정 | date range | — | 스킬 범위 외 (Notion에서 수동 설정) |
| iOS 완료 | checkbox | `finish-task` | `workspace.platform=="iOS"`면 true |
| Android 완료 | checkbox | `finish-task` | `workspace.platform=="Android"`면 true |

각 속성은 해당 기점 스킬만 변경 권한을 가진다. 그 외 스킬은 read-only.

## 3. taskType ↔ 작업 유형

| taskType | 작업 유형 (select) |
|---|---|
| feature | 신규 개발 |
| update | 변경/고도화 |
| bugfix | 버그 수정 |

## 4. 도메인 select option (현재)

- DallaGame
- Event

새 도메인은 Notion DB에서 먼저 select option 추가 → 그 이후 `create-work`에서 사용 가능. skill은 동적 등록을 시도하지 않는다.
