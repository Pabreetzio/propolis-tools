# Comparing C++ and Web Propolis Output

The internal comparison app lives at `apps/compare-site`. It compares PNG output from the C++ implementation against PNG output generated from the web demo encoder/renderer.

## Workflow

Generate both sides and refresh the manifest:

```bash
corepack pnpm compare:generate -- --cpp-exe C:\Projects\propolis\build\Debug\propolis.exe
```

Or set the executable once for the shell:

```bash
$env:PROPOLIS_CPP_EXE = 'C:\Projects\propolis\build\Debug\propolis.exe'
corepack pnpm compare:generate
```

Then start the app:

```bash
corepack pnpm compare:dev
```

The app reads paired files from:

```text
apps/compare-site/public/comparisons/cpp/
apps/compare-site/public/comparisons/web/
```

Matching cases use the same basename:

```text
cpp/hello-size5.png
web/hello-size5.png
```

The generator cleans old generated PNG/PGM files by default. Pass `--keep-existing` to preserve them.

## Custom Cases

The default fixture is a quick smoke case: `hello` at symbol size `2`.

Pass custom cases with semicolon-separated entries. Each entry is `text,size`; omit the size for auto sizing.

```bash
corepack pnpm compare:generate -- --cpp-exe C:\Projects\propolis\build\Debug\propolis.exe --cases "hello,2;0123,2"
```

The app shows each pair side by side, as an opacity overlay, and as a pixel-difference image. It also reports exact pixel statistics when both PNGs have the same dimensions.

The generator also writes hmap comparison data:

```text
apps/compare-site/public/comparisons/hmap/cpp/
apps/compare-site/public/comparisons/hmap/web/
apps/compare-site/public/comparisons/hmap/comparison/
```

The C++ hmap is the reference binary `--format hmap` output. The web hmap is a normalized text list of filled bit coordinates generated from `@propolis-tools/core`. The comparison JSON is shown in the compare app's HMap tab.

The current wrapper watches for the C++ PGM/hmap output files and stops the C++ process after the file is ready. This avoids local hangs in the reference executable after it has already written output.

## Useful Test Matrix

Start with a small set of stable examples:

- Empty or shortest accepted payload
- ASCII text: `hello`
- Mixed case and punctuation: `Hello, Propolis!`
- Numeric payload
- Payloads near size boundaries
- A known truncation or over-capacity case from the web demo

For generated cases, the script includes the input text and symbol size in the filename, for example `hello-size2.png`. That makes visual mismatches easier to trace back to generation settings.

## What Counts As A Match

An exact match is `0` differing pixels with matching image dimensions. If dimensions differ, first normalize export size, padding, background, and antialiasing before investigating encoding logic.

If pixel stats fail but the visual form looks close, use the overlay mode to check for:

- Rotation or mirror errors
- Different padding or centering
- Dot radius mismatch
- Border/data letter placement mismatch
- Encoder mismatch, especially because the current web demo encoder is intentionally simplified
