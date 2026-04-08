# Propolis Tools — Project Plan

## Goal

Build a suite of tools to encode, render, and decode propolis matrix codes — making them interactive and demonstrable for evangelism purposes. Pierre's reference implementation (C++) works but isn't accessible to non-technical audiences; these tools bridge that gap.

**Audience:** Developers first (v1), general public eventually (v2+).

---

## Phase 1 — Foundation (Core + Renderer)

### 1a. Core Library (`packages/core`)

Wrap the encoding/decoding logic from https://github.com/phma/propolis via WASM, then port to TypeScript incrementally.

**Approach: WASM first, TypeScript port later**

The reference C++ will be included as a **git submodule** at `vendor/propolis` pointing to `https://github.com/phma/propolis`. This keeps it clearly separated, easily updatable, and avoids licensing complications with the GPL source being mixed into this repo's own code.

**WASM Compilation — GMP is NOT a blocker (audited):**

GMP usage in the C++ source is isolated to three places, none of which are in the core encode/decode path:
- `genetic.cpp` — the letter-mapping optimizer. **Exclude entirely from WASM build.** (This is a one-time tool for generating the letter table, not needed at runtime.)
- `ecctest.cpp` — a test utility that computes phi to 16800 bits. **Exclude entirely.**
- `random.cpp` — `rangerandom(mpz_class)` is used with small bounded integers (e.g., `rangerandom(1801)`). **Replace with a simple GMP-free RNG** using `arc4random` or Emscripten's random support.

The Boost dependency is only for CLI argument parsing (`propolis.cpp`) — exclude the CLI entry point from the library build.

**Conclusion: WASM build is straightforward.** Compile only the core encode/decode files with a minimal GMP-free random shim.

**Reference C++ source setup:**
```bash
git submodule add https://github.com/phma/propolis vendor/propolis
```

**Deliverables:**
- [ ] `vendor/propolis` submodule added
- [ ] Audit of GMP usage in the C++ source (to decide WASM vs TS port priority)
- [ ] WASM build script (Emscripten) — or decision to skip WASM if GMP is the bottleneck
- [ ] `encode(data: string | Uint8Array, size: number): HexGrid` — returns a grid model
- [ ] `decode(grid: HexGrid): Uint8Array` — recovers encoded data
- [ ] `HexGrid` type representing the hexagonal coordinate array
- [ ] Unit tests validating output against reference C++ output

### 1b. Renderer (`packages/renderer`)

Render a `HexGrid` to SVG or HTML Canvas.

**Deliverables:**
- [ ] `renderToSVG(grid: HexGrid, options?: RenderOptions): string` — returns SVG markup
- [ ] `renderToCanvas(grid: HexGrid, canvas: HTMLCanvasElement, options?: RenderOptions): void`
- [ ] RenderOptions: cell size, colors, show grid lines, animate entry, highlight cells
- [ ] Proper Eisenstein-to-Cartesian coordinate transform: `cx = x - y/2`, `cy = y * sqrt(3)/2`
- [ ] Both arc-style and circle-style cell rendering (matching reference impl)

---

## Phase 2 — Demo Site (`apps/demo-site`)

An interactive web app: text input → live propolis code → download. Developer-focused v1.

**Stack:** Vite + React + TypeScript + Tailwind CSS

**v1 Features (developer audience):**
- [ ] Text input → live-rendered propolis code (SVG)
- [ ] Size selector (3, 5, 7, ...)
- [ ] Download as SVG / PNG
- [ ] Side-by-side QR code comparison with density metric
- [ ] "How it works" section — Eisenstein integers, hex packing, error correction
- [ ] Link to Pierre's original repo
- [ ] Mobile-responsive layout

**v2 Features (general public):**
- [ ] More visual polish, less technical jargon
- [ ] Preset messages / examples
- [ ] Shareable URL with encoded data
- [ ] PWA support for offline use

**npm publishing:**
`@propolis-tools/core` and `@propolis-tools/renderer` will be published to npm so others can build on them.

---

## Phase 3 — CLI Tool (`packages/cli`)

For developers and power users.

**Deliverables:**
- [ ] `propolis encode <input> -o <output.svg|png|ps>` — encode a string/file
- [ ] `propolis decode <image>` — decode from image
- [ ] `propolis info` — show stats (size, capacity, error correction level)
- [ ] npm-publishable as `@propolis-tools/cli`, works via `npx`

---

## Phase 4 — Camera Decoder

Decode propolis codes in real-time using a device camera. **Android first, iOS later.**

**Approach options:**
- **PWA + WebRTC + WebAssembly**: Works on both Android and iOS without an app store. Camera access via `getUserMedia`, image processing in WASM. Likely the fastest path.
- **React Native app**: Better native camera access, easier to ship on both platforms. More setup.
- **Android-native (Kotlin/Java)**: Best performance on Android, but no iOS path.

**Recommendation:** Start with PWA + WebRTC since the demo site is already a web app. Can be wrapped in a React Native WebView later if native features are needed.

**Hex grid detection challenges:**
- Finding the code in the camera frame (locator pattern detection)
- Perspective correction for non-flat surfaces
- Hex grid alignment (not axis-aligned like QR codes)
- Low-light / blur tolerance

**Libraries to evaluate:**
- OpenCV.js — powerful but large (~8MB WASM)
- ZXing-inspired custom detector for hex grids
- TensorFlow.js — if ML-based detection is needed

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Browser + Node, strong typing |
| Monorepo tool | pnpm workspaces | Simple, fast, no extra tooling |
| Build tool | Vite / tsup | Fast builds for web and library |
| Testing | Vitest | Native ESM, fast, TS-first |
| Styling | Tailwind CSS | Rapid UI iteration for demo |
| Encoding source | WASM first, TS port later | Correctness first; WASM path gated on GMP audit |
| C++ source | git submodule at `vendor/propolis` | Keeps GPL source separated, easily updatable |
| npm scope | `@propolis-tools/*` | Publish core and renderer for ecosystem building |
| Camera decoder | PWA + WebRTC first | Avoids app store; same codebase as demo site |
| Mobile priority | Android first, iOS later | Per project requirements |

---

## Resolved Questions

- **WASM vs TS port:** WASM first for speed; TS port is the long-term goal
- **C++ source:** git submodule (not vendored directly, not a separate repo)
- **theschism fork:** No changes pushed — GMP fixes were local only; use phma/propolis directly
- **Target audience:** Developers (v1) → General public (v2+)
- **npm publish:** Yes — `@propolis-tools/core`, `@propolis-tools/renderer`, `@propolis-tools/cli`
- **Camera decoder:** Phase 4, PWA first, Android priority

---

## Immediate Next Steps

1. Add `vendor/propolis` git submodule
2. Audit GMP usage in the C++ source to decide WASM build path
3. Set up pnpm monorepo with workspaces (`packages/core`, `packages/renderer`, `apps/demo-site`)
4. Define `HexGrid` and `hvec` TypeScript types in `packages/core`
5. Build the hex grid renderer — visual demo is the most impactful thing to show early
