'use strict';

// run-node.sh 는 GUI 앱 등 로그인 셸 PATH를 상속받지 못한 환경에서도
// node 바이너리를 흔한 설치 위치(homebrew/nvm/fnm/volta/asdf)에서 탐색해
// `exec node <script> [args...]` 로 실행하는 POSIX sh 래퍼다.
// hook 실행과 스킬의 `node <script>` 안내가 모두 이 래퍼를 경유한다.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const WRAPPER = path.join(__dirname, '..', 'run-node.sh');

// argv(2..)와 stdin을 되울려주는 최소 node 스크립트. 래퍼가 인자·stdin을
// 그대로 전달하는지 검증하는 데 쓴다.
function echoScript() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-runnode-'));
  const p = path.join(dir, 'echo.js');
  fs.writeFileSync(
    p,
    [
      "let s='';",
      "process.stdin.on('data',c=>s+=c);",
      "process.stdin.on('end',()=>{",
      "  process.stdout.write('ARGS='+process.argv.slice(2).join(',')+'|STDIN='+s);",
      "  process.exit(7);", // 종료코드 전파 검증용
      "});",
    ].join('\n'),
  );
  return p;
}

function run(args, opts = {}) {
  return spawnSync('sh', [WRAPPER, ...args], {
    encoding: 'utf8',
    input: opts.input ?? '',
    env: opts.env ?? process.env,
  });
}

test('정상 PATH: node로 스크립트를 실행하고 인자·stdin을 전달한다', () => {
  const script = echoScript();
  const r = run([script, 'a', 'b'], { input: 'hello' });
  assert.equal(r.stdout, 'ARGS=a,b|STDIN=hello');
});

test('스크립트의 종료코드를 그대로 전파한다', () => {
  const script = echoScript();
  const r = run([script], { input: '' });
  assert.equal(r.status, 7);
});

test('SOLUTION_NODE_BIN 오버라이드: PATH에 node가 없어도 지정 바이너리로 실행', () => {
  const script = echoScript();
  const r = run([script, 'x'], {
    input: '',
    // PATH에서 node를 제거(/bin엔 node 없음)하되 sh는 찾을 수 있게 두고, 명시 바이너리만 제공
    env: { ...process.env, PATH: '/bin', SOLUTION_NODE_BIN: process.execPath },
  });
  assert.equal(r.stdout, 'ARGS=x|STDIN=');
});

test('PATH에 node가 없으면 흔한 설치 위치 fallback으로 실제 node를 찾는다', () => {
  const script = echoScript();
  const r = run([script, 'y'], {
    input: '',
    // 오버라이드 없이 PATH에서 node만 제거(/bin) — 래퍼의 절대경로 fallback이 이 머신의 node를 찾아야 한다.
    env: { ...process.env, PATH: '/bin', SOLUTION_NODE_BIN: '' },
  });
  assert.equal(r.stdout, 'ARGS=y|STDIN=');
});

test('node를 어디서도 못 찾으면 비영 종료코드와 진단 메시지', () => {
  const script = echoScript();
  const r = run([script], {
    input: '',
    // PATH 비우고, fallback 탐색의 HOME도 빈 임시 디렉터리로, 명시 바이너리는 존재하지 않는 경로로.
    // 시스템 표준 위치(/opt/homebrew, /usr/local, /usr/bin)에 node가 없어야만 이 테스트가 유의미하다.
    env: {
      ...process.env,
      PATH: '/bin', // sh는 찾되 node는 없음
      HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'yb-emptyhome-')),
      SOLUTION_NODE_BIN: '/nope/not/node',
      SOLUTION_NODE_SKIP_STD: '1', // 표준 절대경로 탐색을 건너뛰게 하는 테스트 훅
    },
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /node/i);
});
