import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputs = [
  'build/css/variables.css',
  'build/scss/_tokens.scss',
  'build/js/tokens.js',
  'build/tokens.json',
];

const digest = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const firstBuild = Object.fromEntries(outputs.map((path) => [path, digest(path)]));

execFileSync(process.execPath, ['build.js'], { cwd: root, stdio: 'pipe' });
for (const path of outputs) {
  assert.equal(digest(path), firstBuild[path], `Build không deterministic: ${path}`);
}

const packCommand = process.platform === 'win32'
  ? [process.env.ComSpec, ['/d', '/s', '/c', 'npm pack --dry-run --json']]
  : ['npm', ['pack', '--dry-run', '--json']];
const pack = JSON.parse(execFileSync(packCommand[0], packCommand[1], {
  cwd: root,
  encoding: 'utf8',
}));
const packageFiles = pack[0].files.map(({ path }) => path);
const allowedRoots = /^(brand\/|build\/|examples\/|fonts\/|manifest\/|styles\/|tokens\/|CHANGELOG\.md$|LICENSE$|README\.md$|package\.json$)/;

for (const path of packageFiles) {
  assert.match(path.replaceAll('\\', '/'), allowedRoots, `File ngoài clean-room package: ${path}`);
}

console.log(`Verification passed: ${packageFiles.length} packaged files, deterministic build.`);
