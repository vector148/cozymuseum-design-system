import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicationRoots = ['brand', 'fonts', 'styles'];
const files = [];
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }

    const contents = await readFile(path);
    files.push({
      path: relative(root, path).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(contents).digest('hex'),
      bytes: contents.byteLength,
    });
  }
}

for (const directory of publicationRoots) {
  await visit(join(root, directory));
}

files.sort((left, right) => left.path.localeCompare(right.path));
const manifestPath = join(root, 'manifest', 'published.json');
await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify({
  schema: 'cozymuseum-design-system-publication-v1',
  generatedBy: 'scripts/build-publication-manifest.mjs',
  owner: 'CozyMuseum',
  rights: 'first-party',
  sourceRevision: `cozymuseum-design-system@${packageJson.version}`,
  roots: publicationRoots,
  files,
}, null, 2)}\n`, 'utf8');

console.log(`Publication manifest built for ${files.length} files.`);
