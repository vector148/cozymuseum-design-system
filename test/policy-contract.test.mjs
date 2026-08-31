import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

function listPublicationFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listPublicationFiles(path));
    else files.push(relative(root, path).replaceAll('\\', '/'));
  }
  return files;
}

test('brand authority chỉ công bố ba màu master và một font family', () => {
  const brand = JSON.parse(readFileSync(join(root, 'tokens/global/color.json'), 'utf8'));
  const family = JSON.parse(readFileSync(join(root, 'tokens/global/typography.json'), 'utf8'));

  assert.deepEqual(
    Object.fromEntries(Object.entries(brand.color.brand).slice(0, 3).map(([key, token]) => [key, token.$value])),
    { deepGreen: '#082118', redBrown: '#19140E', creamWhite: '#F2E5D9' },
  );
  assert.deepEqual(family.font.family.primary.$value, ['Be Vietnam Pro', 'system-ui', 'sans-serif']);
  assert.deepEqual(Object.keys(family.font.family), ['primary']);
});

test('repository dùng đúng CozyMuseum origin và không mang nhận diện template tham khảo', () => {
  const origin = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
  const canonicalOrigin = origin.replace(/\.git$/, '');
  assert.equal(canonicalOrigin, 'https://github.com/vector148/cozymuseum-design-system');

  const ignored = new Set(['node_modules', 'build', '.git']);
  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.scss', '.svg']);
  const files = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (textExtensions.has(extname(entry.name))) files.push(path);
    }
  }

  visit(root);
  const forbiddenTemplateName = new RegExp(['atu', 'merce'].join(''), 'i');
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), forbiddenTemplateName, relative(root, file));
  }
});

test('mọi file phát hành khớp manifest provenance và SHA-256', () => {
  const manifestPath = join(root, 'manifest/published.json');
  assert.equal(existsSync(manifestPath), true, 'Thiếu manifest/published.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.owner, 'CozyMuseum');
  assert.equal(manifest.rights, 'first-party');
  assert.equal(manifest.sourceRevision, 'cozymuseum-design-system@1.0.0');

  for (const asset of manifest.files) {
    const path = join(root, asset.path);
    assert.equal(existsSync(path), true, `Thiếu publication file ${asset.path}`);
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(sha256, asset.sha256, `Sai SHA-256 của ${asset.path}`);
  }
});

test('ví dụ Quiet Glass dùng token build và giữ accessibility fallback', () => {
  const css = readFileSync(join(root, 'examples/quiet-glass.css'), 'utf8');

  assert.match(css, /@import "\.\.\/build\/css\/variables\.css";/);
  assert.match(css, /@supports \(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.doesNotMatch(css, /animation:\s*[^;]*(infinite|loop)/i);
});

test('gói phát hành sở hữu đầy đủ style, font và brand asset hiện dùng bởi platform', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest/published.json'), 'utf8'));

  assert.deepEqual(manifest.roots, ['brand', 'fonts', 'styles']);
  const actualPaths = manifest.roots.flatMap((name) => listPublicationFiles(join(root, name))).sort();
  const manifestPaths = manifest.files.map(({ path }) => path).sort();
  assert.deepEqual(manifestPaths, actualPaths);

  for (const entry of manifest.files) {
    const path = join(root, entry.path);
    assert.equal(existsSync(path), true, `Thiếu publication file ${entry.path}`);
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), entry.sha256);
    assert.equal(readFileSync(path).byteLength, entry.bytes);
  }
});
