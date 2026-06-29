'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATES = [
  'skills/yeoboya-write-policy/references/policy-template.md',
  'skills/yeoboya-write-domain/references/domain-template.md',
  'skills/yeoboya-draw-ui-flow/references/ui-flow-template.md',
  'skills/yeoboya-draw-data-flow/references/data-flow-template.md',
];

for (const rel of TEMPLATES) {
  const body = fs.readFileSync(path.join(ROOT, rel), 'utf8');

  test(`${rel} has 이전 버전 provenance line`, () => {
    assert.match(body, /이전 버전:/);
  });

  test(`${rel} 변경 이력 has 참고본 table column`, () => {
    const idx = body.indexOf('## 변경 이력');
    assert.ok(idx !== -1, '변경 이력 섹션 존재');
    const section = body.slice(idx);
    assert.match(section, /\|\s*참고본\s*\|/);
  });
}
