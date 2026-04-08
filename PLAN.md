# Propolis Tools — Project Plan

## Goal

Build a suite of tools to encode, render, and decode propolis matrix codes — making them interactive and demonstrable for evangelism purposes. Pierre's reference implementation (C++) works but isn't accessible to non-technical audiences; these tools bridge that gap.

---

## Phase 1 — Foundation (Core + Renderer)

### 1a. Core Library (`packages/core`)

Port or wrap the encoding/decoding logic from https://github.com/phma/propolis.

**Options (pick one):**

- **Option A: WASM compile** — Compile the reference C++ to WebAssembly using Emscripten. Fastest to get correct behavior; least maintainable long-term.
- **Option B: TypeScript port** — Port the algorithm to TypeScript. More effort upfront; gives a clean, auditable, web-native implementation. Preferred long-term.
- **Option C: Node FFI/child process** — Call the compiled binary from Node. Only viable for CLI; not browser-friendly.

**Recommendation:** Start with WASM for correctness, then port to TypeScript incrementally.

**Deliverables:**
- [ ] `encode(data: string | Uint8Array, size: number): HexGrid` — returns a grid model
- [ ] `decode(grid: HexGrid): Uint8Array` — recovers encoded data
- [ ] `HexGrid` type representing the hexagonal coordinate array
- [ ] Unit tests against reference C++ output

### 1b. Renderer (`packages/renderer`)

Render a `HexGrid` to SVG or HTML Canvas.

**Deliverables:**
- [ ] `renderToSVG(grid: HexGrid, options?: RenderOptions): string` — returns SVG markup
- [ ] `renderToCanvas(grid: HexGrid, canvas: HTMLCanvasElement, options?: RenderOptions): void`
- [ ] RenderOptions: cell size, colors, show grid lines, animate entry, highlight cells
- [ ] Proper Eisenstein-to-Cartesian coordinate transform
- [ ] Both arc-style and circle-style cell rendering (matching reference impl)

---

## Phase 2 — Demo Site (`apps/demo-site`)

An interactive web app to encode text → show the propolis code visually → allow download.

**Stack:** Vite + React + TypeScript (or Next.js if SSR is needed)

**Features:**
- [ ] Text input → live-rendered propolis code (SVG)
- [ ] Size selector (3, 5, 7, ...)
- [ ] Download as SVG / PNG / PDF
- [ ] Side-by-side comparison with QR code to show the difference
- [ ] Density comparison metric display
- [ ] "About" section explaining the math (Eisenstein integers, hex packing)
- [ ] Mobile-responsive

---

## Phase 3 — CLI Tool (`packages/cli`)

For developers and power users.

**Deliverables:**
- [ ] `propolis encode <input> -o <output.svg|png|ps>` — encode a string/file
- [ ] `propolis decode <image>` — decode from image (stretch goal)
- [ ] `propolis info` — show stats about a code (size, capacity, error correction level)
- [ ] npm-publishable, works via `npx`

---

## Phase 4 — Camera Decoder (Stretch Goal)

Use a device camera + computer vision to decode propolis codes in real-time.

**Approach:** OpenCV.js or a custom hex-grid detector using Canvas + image processing.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Browser + Node, strong typing |
| Monorepo tool | pnpm workspaces | Simple, fast, no extra tooling |
| Build tool | Vite / tsup | Fast builds for web and library |
| Testing | Vitest | Native ESM, fast, TS-first |
| Styling | Tailwind CSS | Rapid UI iteration for demo |
| Encoding source | WASM first, TS port later | Correctness first |

---

## Open Questions

1. Is pierre's C++ code easily Emscripten-compilable (no system deps)?
2. Should the demo site be a standalone SPA or need a backend (for server-side encoding)?
3. What's the target audience for the demo — developers, or general public?
4. Should we publish the core library to npm for others to build on?
5. Is there a desire for a mobile app (React Native / PWA)?

---

## Immediate Next Steps

1. Set up pnpm monorepo with workspaces
2. Create `packages/core` skeleton with TypeScript types for `HexGrid`, `hvec`
3. Study the reference C++ and spec out the TS port (or WASM build)
4. Build the hex grid renderer — visual feedback is the key to demonstrating the concept
5. Wire renderer into a minimal Vite demo page
