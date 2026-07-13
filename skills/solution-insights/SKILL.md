---
name: solution-insights
description: 사용자가 /solution-insights를 호출하거나 '마찰 분석', '불편 로그 분석', '개선 인사이트', '작업 불편 대시보드'를 원할 때 사용한다. `.assistant/improvement-log.jsonl`을 집계해 단일 HTML 대시보드(`.assistant/insights.html`)를 만들고 원인 분석 서술을 채운 뒤 브라우저로 열도록 안내한다. 세부작업이 아니며 choose-subtask 흐름 밖의 독립 분석 도구다.
user-invocable: true
---

# solution-insights — 작업 불편 분석

`.assistant/improvement-log.jsonl`(마찰 기록)을 읽어 개선 우선순위를 뽑는다.

## 절차

1. **집계 읽기**: `sh ${CLAUDE_PLUGIN_ROOT}/hooks/run-node.sh ${CLAUDE_PLUGIN_ROOT}/hooks/insights.js aggregate` 를 실행해 JSON을 받는다.
2. **표본 가드**: `total`이 5 미만이면 "표본이 부족합니다(현재 N건). 더 쌓인 뒤 다시 실행하세요."라고 안내하고 종료(HTML 생성 안 함).
3. **원인 분석 서술 작성**(RCA 2~4단계): `pareto` 상위 항목을 훑어, 같은 `category`의 `what` 텍스트를 재발 실패 모드로 묶고, 각 군집을 spec §5 표의 '먼저 의심할 파일'에 매핑한다. 자동 기록(`bias.hook`) 대비 사람 기록(`bias.agent`) 격차가 크면 "놓친 불편"으로 언급한다. 결과를 간결한 HTML 조각(`<p>`/`<ul>`)으로 임시 파일 `.assistant/.insights-narrative.html`에 쓴다.
4. **HTML 생성**: `sh ${CLAUDE_PLUGIN_ROOT}/hooks/run-node.sh ${CLAUDE_PLUGIN_ROOT}/hooks/insights.js html .assistant/.insights-narrative.html` 를 실행한다.
5. **임시 파일 정리**: `rm -f .assistant/.insights-narrative.html` 로 서술 임시 파일을 삭제한다. (gitignore에도 등록돼 있으나 — belt-and-suspenders — 커밋 오염을 막기 위해 삭제한다.)
6. **안내**: 출력된 경로(`.assistant/insights.html`)를 브라우저로 열라고 안내한다. (gitignore되어 로컬 전용.)

## 원칙

- 결정적 집계는 CLI가, 정성 군집/매핑 서술은 이 스킬(에이전트)이 담당한다.
- 로그를 수정하지 않는다. 읽기 전용 분석이다.
- 매핑 표(불편 종류 → 의심 파일)는 spec `docs/superpowers/specs/2026-07-01-friction-event-log-design.md` §5를 따른다.
