import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

test('build công bố đủ bốn định dạng token từ một lệnh', () => {
  execFileSync(process.execPath, ['build.js'], { cwd: root, stdio: 'pipe' });

  const outputs = [
    'build/css/variables.css',
    'build/scss/_tokens.scss',
    'build/js/tokens.js',
    'build/tokens.json',
  ];

  for (const output of outputs) {
    assert.equal(existsSync(join(root, output)), true, `Thiếu output ${output}`);
  }

  const css = readFileSync(join(root, outputs[0]), 'utf8');
  assert.match(css, /--color-brand-deep-green: #082118;/);
  assert.match(css, /--font-family-primary: ['\"]Be Vietnam Pro['\"], system-ui, sans-serif;/);
  assert.match(css, /--component-quiet-glass-background:/);
});
