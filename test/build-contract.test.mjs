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

test('publication giữ đầy đủ contract chi tiết và trình sửa Curatale', () => {
  const css = readFileSync(join(root, 'styles/curatale.css'), 'utf8');

  assert.match(css, /\.curatale-detail-hero\s*\{/);
  assert.match(css, /\.curatale-detail-info-grid\s*\{/);
  assert.match(css, /\.curatale-detail-actions button/);
  assert.match(css, /\.curatale-editor-dialog\s*\{/);
  assert.match(css, /\.curatale-editor-body\s*\{/);
  assert.match(css, /\.curatale-editor-actions\s*\{/);
  assert.doesNotMatch(css, /var\(--liquid-glass-specular\)/);
  assert.match(css, /\.curatale-placeholder-circle\.is-large\s*\{/);
  assert.match(css, /\.curatale-placeholder-circle\.is-small\s*\{/);
  assert.doesNotMatch(css, /\.curatale-visual-orbit|\.curatale-visual-mark/);
  assert.match(css, /\.curatale-card-visual\s*\{[\s\S]*?radial-gradient\(circle at 28% 18%, rgba\(255, 255, 255, 0\.12\), transparent 32%\)[\s\S]*?linear-gradient\(145deg, #30483d, #0a2119 72%\)/);
  assert.doesNotMatch(css, /\.curatale-showroom-card:nth-child\([234]\) \.curatale-card-visual/);
});
