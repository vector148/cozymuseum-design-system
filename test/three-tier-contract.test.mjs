import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const tiers = ['global', 'alias', 'component'];

function jsonFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...jsonFiles(path));
    else if (extname(entry.name) === '.json') files.push(path);
  }
  return files;
}

function references(value, results = []) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{([^}]+)\}/g)) results.push(match[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) references(item, results);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) references(item, results);
  }
  return results;
}

test('token source có đúng ba tầng Global, Alias và Component', () => {
  for (const tier of tiers) {
    const directory = join(root, 'tokens', tier);
    assert.equal(existsSync(directory), true, `Thiếu tokens/${tier}`);
    assert.ok(jsonFiles(directory).length > 0, `tokens/${tier} chưa có token`);
  }

  const legacyFiles = [
    'tokens/color',
    'tokens/font',
    'tokens/effect.json',
    'tokens/radius.json',
    'tokens/spacing.json',
  ];
  for (const path of legacyFiles) {
    const absolute = join(root, path);
    const hasLegacyJson = existsSync(absolute)
      && (extname(absolute) === '.json' || jsonFiles(absolute).length > 0);
    assert.equal(hasLegacyJson, false, `Còn source JSON cũ ${path}`);
  }
});

test('dependency token chỉ đi Global -> Alias -> Component', () => {
  for (const file of jsonFiles(join(root, 'tokens', 'global'))) {
    assert.deepEqual(references(JSON.parse(readFileSync(file, 'utf8'))), [], relative(root, file));
  }

  for (const file of jsonFiles(join(root, 'tokens', 'alias'))) {
    for (const reference of references(JSON.parse(readFileSync(file, 'utf8')))) {
      assert.match(reference, /^(color\.brand|font\.|spacing\.|radius\.|effect\.)/, `${relative(root, file)} -> ${reference}`);
      assert.doesNotMatch(reference, /^component\./);
    }
  }

  for (const file of jsonFiles(join(root, 'tokens', 'component'))) {
    const refs = references(JSON.parse(readFileSync(file, 'utf8')));
    assert.ok(refs.length > 0, `${relative(root, file)} phải dùng Alias token`);
    for (const reference of refs) {
      assert.match(reference, /^(color\.(background|foreground|border|surface|focus)|semantic\.)/, `${relative(root, file)} -> ${reference}`);
    }
  }
});

test('package và CI công bố design system đa định dạng từ token source', () => {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, '@cozymuseum/tokens');
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.private, true);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ['.', './css', './json', './scss'].sort());
  assert.match(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), new RegExp(`## ${packageJson.version.replaceAll('.', '\\.')} - \\d{4}-\\d{2}-\\d{2}`));

  const workflow = readFileSync(join(root, '.github/workflows/verify.yml'), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /tokens\/\*\*\/\*\.json/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /git diff --exit-code -- build/);
});
