import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { buildBitCanvas } from '@propolis-tools/renderer';
import type { PlacedLetter, RenderOptions } from '@propolis-tools/renderer';
import {
  compareHMaps,
  encodeText,
  encodeTextECC,
  hmapFromPlacedLetters,
  hmapToText,
  parseBinaryHMap,
  type HMapComparison,
} from '@propolis-tools/core';

interface CaseSpec {
  id: string;
  text: string;
  size?: number;
  redundancy?: string;
}

const DEFAULT_CASES: CaseSpec[] = [
  { id: 'hello-size2', text: 'hello', size: 2 },
];

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = resolve(here, '..');
const repoRoot = resolve(appDir, '..', '..');
const comparisonsDir = join(appDir, 'public', 'comparisons');
const cppDir = join(comparisonsDir, 'cpp');
const webDir = join(comparisonsDir, 'web');
const cppHMapDir = join(comparisonsDir, 'hmap', 'cpp');
const webHMapDir = join(comparisonsDir, 'hmap', 'web');
const hmapComparisonDir = join(comparisonsDir, 'hmap', 'comparison');
const tmpDir = join(appDir, '.generated');

function parseArgs() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      values.set(key, inlineValue);
    } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
      values.set(key, args[++i]);
    } else {
      flags.add(key);
    }
  }

  return { values, flags };
}

function findCppExe(explicitPath?: string) {
  const candidates = [
    explicitPath,
    process.env.PROPOLIS_CPP_EXE,
    join(repoRoot, 'vendor', 'propolis', 'build', 'propolis.exe'),
    join(repoRoot, 'vendor', 'propolis', 'build', 'Debug', 'propolis.exe'),
    join(repoRoot, 'vendor', 'propolis', 'build', 'Release', 'propolis.exe'),
    join(repoRoot, 'vendor', 'propolis', 'build', 'src', 'Debug', 'propolis.exe'),
    join(repoRoot, 'vendor', 'propolis', 'build', 'src', 'Release', 'propolis.exe'),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseCases(raw?: string): CaseSpec[] {
  if (!raw) return DEFAULT_CASES;

  return raw.split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [text, size] = entry.split(',');
      const idParts = [slug(text), size ? `size${size}` : 'auto'].filter(Boolean);
      return {
        id: idParts.join('-') || `case-${index + 1}`,
        text,
        size: size ? Number(size) : undefined,
      };
    });
}

function readToken(buffer: Buffer, offset: number) {
  while (offset < buffer.length) {
    const char = String.fromCharCode(buffer[offset]);
    if (/\s/.test(char)) {
      offset++;
      continue;
    }
    if (char === '#') {
      while (offset < buffer.length && buffer[offset] !== 10) offset++;
      continue;
    }
    break;
  }

  const start = offset;
  while (offset < buffer.length && !/\s/.test(String.fromCharCode(buffer[offset]))) offset++;
  return { token: buffer.toString('ascii', start, offset), offset };
}

function pgmHeaderInfo(buffer: Buffer) {
  let offset = 0;
  const magic = readToken(buffer, offset);
  offset = magic.offset;
  if (magic.token !== 'P5' && magic.token !== 'P2') return null;

  const widthToken = readToken(buffer, offset);
  const heightToken = readToken(buffer, widthToken.offset);
  const maxToken = readToken(buffer, heightToken.offset);
  offset = maxToken.offset;

  const width = Number(widthToken.token);
  const height = Number(heightToken.token);
  const max = Number(maxToken.token);
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(max) || max <= 0) {
    return null;
  }

  while (offset < buffer.length && /\s/.test(String.fromCharCode(buffer[offset]))) offset++;
  return { magic: magic.token, width, height, max, dataOffset: offset };
}

async function pgmToPng(pgmPath: string, pngPath: string) {
  const buffer = await readFile(pgmPath);
  const header = pgmHeaderInfo(buffer);
  if (!header) {
    throw new Error(`${basename(pgmPath)} is not a PGM file.`);
  }
  const { magic, width, height, max, dataOffset } = header;

  const png = new PNG({ width, height });
  if (magic === 'P5') {
    const bytesPerSample = max > 255 ? 2 : 1;
    const expectedSize = dataOffset + width * height * bytesPerSample;
    if (buffer.length < expectedSize) {
      throw new Error(`${basename(pgmPath)} is incomplete: expected ${expectedSize} bytes, got ${buffer.length}.`);
    }
    for (let i = 0; i < width * height; i++) {
      const sourceIndex = dataOffset + i * bytesPerSample;
      const sample = bytesPerSample === 1
        ? buffer[sourceIndex]
        : buffer.readUInt16BE(sourceIndex);
      const gray = Math.round((sample / max) * 255);
      const targetIndex = i * 4;
      png.data[targetIndex] = gray;
      png.data[targetIndex + 1] = gray;
      png.data[targetIndex + 2] = gray;
      png.data[targetIndex + 3] = 255;
    }
  } else {
    const body = buffer.toString('ascii', dataOffset);
    const samples = body.match(/\d+/g) ?? [];
    if (samples.length < width * height) {
      throw new Error(`${basename(pgmPath)} is incomplete: expected ${width * height} samples, got ${samples.length}.`);
    }
    for (let i = 0; i < width * height; i++) {
      const gray = Math.round((Number(samples[i]) / max) * 255);
      const targetIndex = i * 4;
      png.data[targetIndex] = gray;
      png.data[targetIndex + 1] = gray;
      png.data[targetIndex + 2] = gray;
      png.data[targetIndex + 3] = 255;
    }
  }

  await writeFile(pngPath, PNG.sync.write(png));
}

async function cleanGeneratedImages() {
  for (const dir of [cppDir, webDir, cppHMapDir, webHMapDir, hmapComparisonDir, tmpDir]) {
    await mkdir(dir, { recursive: true });
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(entries
      .filter((entry) => entry.isFile() && /\.(png|pgm|hmap|txt|json)$/i.test(entry.name))
      .map((entry) => rm(join(dir, entry.name), { force: true })));
  }
}

function putPixel(png: PNG, x: number, y: number, rgba: [number, number, number, number]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const index = (y * png.width + x) * 4;
  png.data[index] = rgba[0];
  png.data[index + 1] = rgba[1];
  png.data[index + 2] = rgba[2];
  png.data[index + 3] = rgba[3];
}

function pointInPolygon(x: number, y: number, points: Array<{ x: number; y: number }>) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    const intersects = ((pi.y > y) !== (pj.y > y))
      && (x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function drawHex(
  png: PNG,
  cx: number,
  cy: number,
  radius: number,
  color: [number, number, number, number],
) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 6 + i * Math.PI / 3;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
  const minX = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))));
  const maxX = Math.min(png.width - 1, Math.ceil(Math.max(...points.map((point) => point.x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
  const maxY = Math.min(png.height - 1, Math.ceil(Math.max(...points.map((point) => point.y))));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        putPixel(png, x, y, color);
      }
    }
  }
}

function parseHexColor(hex: string): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255,
  ];
}

async function writeWebPng(caseSpec: CaseSpec, outputPath: string) {
  const encoded = encodeCase(caseSpec);
  const letters: PlacedLetter[] = encoded.letters;
  const options: Required<RenderOptions> = {
    dotRadius: 0.58,
    gridSpacing: 1,
    colorOn: '#000000',
    colorOff: '#ffffff',
    background: '#ffffff',
    padding: 2,
    showOff: false,
  };
  const canvas = buildBitCanvas(letters, options.gridSpacing);
  const width = 600;
  const height = Math.ceil(width * Math.sqrt(48) / 6);
  const png = new PNG({ width, height });
  const background = parseHexColor(options.background);
  const colorOn = parseHexColor(options.colorOn);
  const colorOff = parseHexColor(options.colorOff);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      putPixel(png, x, y, background);
    }
  }

  const symbolSize = caseSpec.size ?? encoded.radius;
  const scale = width / (6 * (symbolSize + 2));
  const offset = { x: 0, y: -1 / Math.sqrt(3) };
  const radius = 0.68 * scale;

  for (const cell of canvas.cells) {
    if (!options.showOff && !cell.filled) continue;
    const cx = (cell.cart.x - offset.x) * scale + width / 2;
    const cy = height / 2 - (cell.cart.y - offset.y) * scale;
    const color = cell.filled ? colorOn : colorOff;
    drawHex(png, cx, cy, radius, color);
  }

  await writeFile(outputPath, PNG.sync.write(png));
}

function encodeCase(caseSpec: CaseSpec) {
  try {
    return encodeTextECC(caseSpec.text);
  } catch {
    return encodeText(caseSpec.text, { radius: caseSpec.size });
  }
}

async function writeWebHMap(caseSpec: CaseSpec, hmapPath: string) {
  const encoded = encodeCase(caseSpec);
  const hmap = hmapFromPlacedLetters(encoded.letters, caseSpec.size ?? encoded.radius);
  await writeFile(hmapPath, hmapToText(hmap));
  return hmap;
}

async function waitForCompletePgm(filePath: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const buffer = await readFile(filePath);
      const header = pgmHeaderInfo(buffer);
      if (header?.magic === 'P5') {
        const bytesPerSample = header.max > 255 ? 2 : 1;
        const expectedSize = header.dataOffset + header.width * header.height * bytesPerSample;
        if (buffer.length >= expectedSize) return;
      } else if (header?.magic === 'P2') {
        const body = buffer.toString('ascii', header.dataOffset);
        const samples = body.match(/\d+/g) ?? [];
        if (samples.length >= header.width * header.height) return;
      }
    } catch {
      // Keep waiting until the process creates a readable file.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${basename(filePath)} after ${timeoutMs}ms.`);
}

async function waitForOutputFile(filePath: string, timeoutMs: number) {
  const startedAt = Date.now();
  let lastSize = -1;
  let stableSince = 0;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const buffer = await readFile(filePath);
      if (buffer.length > 0 && buffer.length === lastSize) {
        if (stableSince === 0) stableSince = Date.now();
        if (Date.now() - stableSince > 500) return;
      } else {
        lastSize = buffer.length;
        stableSince = 0;
      }
    } catch {
      stableSince = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${basename(filePath)} after ${timeoutMs}ms.`);
}

async function runCpp(
  cppExe: string,
  caseSpec: CaseSpec,
  outputPath: string,
  format: 'pgm' | 'hmap',
  timeoutMs: number,
) {
  const args = [
    '--text',
    caseSpec.text,
    '--format',
    format,
    '--quality',
    '10',
    '--output',
    outputPath,
  ];

  if (caseSpec.size !== undefined) {
    args.push('--size', String(caseSpec.size));
  } else if (caseSpec.redundancy) {
    args.push('--redundancy', caseSpec.redundancy);
  }

  const child = spawn(cppExe, args, {
    cwd: join(repoRoot, 'vendor', 'propolis'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  try {
    if (format === 'pgm') await waitForCompletePgm(outputPath, timeoutMs);
    else await waitForOutputFile(outputPath, timeoutMs);
  } catch (error) {
    child.kill();
    throw new Error([
      `C++ generation failed for ${caseSpec.id}.`,
      error instanceof Error ? error.message : String(error),
      stderr,
    ].filter(Boolean).join('\n'));
  }

  child.kill();
}

async function main() {
  const { values, flags } = parseArgs();
  const cppExe = findCppExe(values.get('cpp-exe'));
  const cases = parseCases(values.get('cases'));
  const skipCpp = flags.has('skip-cpp');
  const skipWeb = flags.has('skip-web');
  const cppTimeoutMs = Number(values.get('cpp-timeout-ms') ?? 30_000);

  await mkdir(cppDir, { recursive: true });
  await mkdir(webDir, { recursive: true });
  await mkdir(cppHMapDir, { recursive: true });
  await mkdir(webHMapDir, { recursive: true });
  await mkdir(hmapComparisonDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  if (!flags.has('keep-existing')) {
    await cleanGeneratedImages();
  }

  if (!skipCpp && !cppExe) {
    throw new Error(
      'Could not find propolis.exe. Pass --cpp-exe C:\\path\\to\\propolis.exe or set PROPOLIS_CPP_EXE.',
    );
  }

  for (const caseSpec of cases) {
    const webPath = join(webDir, `${caseSpec.id}.png`);
    const cppPgmPath = join(tmpDir, `${caseSpec.id}.pgm`);
    const cppPngPath = join(cppDir, `${caseSpec.id}.png`);
    const cppHMapPath = join(cppHMapDir, `${caseSpec.id}.hmap`);
    const webHMapPath = join(webHMapDir, `${caseSpec.id}.txt`);
    const hmapComparisonPath = join(hmapComparisonDir, `${caseSpec.id}.json`);

    let cppHMap;
    let webHMap;

    if (!skipCpp && cppExe) {
      await runCpp(cppExe, caseSpec, cppPgmPath, 'pgm', cppTimeoutMs);
      await pgmToPng(cppPgmPath, cppPngPath);
      await runCpp(cppExe, caseSpec, cppHMapPath, 'hmap', cppTimeoutMs);
      cppHMap = parseBinaryHMap(await readFile(cppHMapPath));
    }

    if (!skipWeb) {
      await writeWebPng(caseSpec, webPath);
      webHMap = await writeWebHMap(caseSpec, webHMapPath);
    }

    if (cppHMap && webHMap) {
      const comparison = compareHMaps(cppHMap, webHMap);
      await writeFile(hmapComparisonPath, `${JSON.stringify(comparison, null, 2)}\n`);
    }

    console.log(`Generated ${caseSpec.id}`);
  }

  spawnSync(process.execPath, [join(appDir, 'scripts', 'build-manifest.mjs')], {
    cwd: appDir,
    stdio: 'inherit',
  });

  if (flags.has('clean-tmp')) {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
