#!/bin/sh
# run-node.sh — node 바이너리를 탐색해 `exec node <script> [args...]` 로 실행하는 래퍼.
#
# Claude Code가 macOS GUI 앱으로 실행되면 로그인 셸의 PATH를 상속받지 못해
# homebrew/nvm/fnm 등에 설치된 node가 hook·Bash 실행 환경의 PATH에 없다.
# 그 결과 hook의 `#!/usr/bin/env node` 는 `env: node: No such file or directory`,
# 스킬이 안내한 `node <script>` 는 Exit 127(command not found)로 깨진다.
# 이 래퍼로 감싸 그런 환경에서도 node를 찾게 한다.
#
# 탐색 순서: $SOLUTION_NODE_BIN → PATH(command -v) → 흔한 절대 설치 경로.
# 사용법: sh run-node.sh <script.js> [args...]

set -u

find_node() {
  # 1) 명시 오버라이드 (특수 환경·테스트용)
  if [ -n "${SOLUTION_NODE_BIN:-}" ] && [ -x "${SOLUTION_NODE_BIN}" ]; then
    printf '%s\n' "${SOLUTION_NODE_BIN}"
    return 0
  fi

  # 2) PATH
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  # 3) 흔한 절대 설치 경로 (SOLUTION_NODE_SKIP_STD 로 건너뛸 수 있음 — 테스트 훅)
  if [ -z "${SOLUTION_NODE_SKIP_STD:-}" ]; then
    for c in \
      /opt/homebrew/bin/node \
      /usr/local/bin/node \
      /usr/bin/node \
      "${HOME:-}/.volta/bin/node" \
      "${HOME:-}/.asdf/shims/node"
    do
      [ -x "$c" ] && { printf '%s\n' "$c"; return 0; }
    done

    # nvm / fnm — 버전 디렉터리 glob. 최신(사전순 마지막) 우선.
    for pat in \
      "${HOME:-}/.nvm/versions/node/"*"/bin/node" \
      "${HOME:-}/.local/share/fnm/node-versions/"*"/installation/bin/node" \
      "${HOME:-}/Library/Application Support/fnm/node-versions/"*"/installation/bin/node"
    do
      last=''
      for m in $pat; do
        [ -x "$m" ] && last="$m"
      done
      [ -n "$last" ] && { printf '%s\n' "$last"; return 0; }
    done
  fi

  return 1
}

NODE="$(find_node)" || {
  echo "run-node.sh: node 실행 파일을 찾지 못했습니다. PATH를 확인하거나 SOLUTION_NODE_BIN에 node 경로를 지정하세요." >&2
  exit 127
}

exec "$NODE" "$@"
