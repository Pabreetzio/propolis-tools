import { readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const comparisonsDir = join(here, '..', 'public', 'comparisons');
const cppDir = join(comparisonsDir, 'cpp');
const webDir = join(comparisonsDir, 'web');
const hmapComparisonDir = join(comparisonsDir, 'hmap', 'comparison');
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function imageFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => imageExts.has(extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

async function filesWithExt(dir, ext) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => extname(name).toLowerCase() === ext)
    .sort((a, b) => a.localeCompare(b));
}

const cppFiles = await imageFiles(cppDir);
const webFiles = await imageFiles(webDir);
const webByStem = new Map(webFiles.map((file) => [basename(file, extname(file)), file]));
const hmapComparisonFiles = await filesWithExt(hmapComparisonDir, '.json').catch(() => []);
const hmapComparisonByStem = new Map(hmapComparisonFiles.map((file) => [basename(file, extname(file)), file]));

const pairs = cppFiles
  .map((cppFile) => {
    const stem = basename(cppFile, extname(cppFile));
    const webFile = webByStem.get(stem);
    if (!webFile) return null;

    return {
      id: stem,
      label: stem,
      cpp: `/comparisons/cpp/${cppFile}`,
      web: `/comparisons/web/${webFile}`,
      hmapComparison: hmapComparisonByStem.has(stem)
        ? `/comparisons/hmap/comparison/${hmapComparisonByStem.get(stem)}`
        : undefined,
    };
  })
  .filter(Boolean);

await writeFile(
  join(comparisonsDir, 'manifest.json'),
  `${JSON.stringify({ pairs }, null, 2)}\n`,
);

console.log(`Wrote ${pairs.length} comparison pair${pairs.length === 1 ? '' : 's'}.`);
