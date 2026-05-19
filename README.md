# Propolis Tools

Web-based tools for creating, visualizing, and exploring **propolis matrix codes** — a hexagonal 2D barcode format invented by Pierre Abbat. This monorepo provides a live interactive demo, a TypeScript encoder/renderer library, and a C++ reference comparison suite.

## What is a Propolis Code?

Propolis codes are an alternative to square-grid barcodes like QR codes. They use a hexagonal dot grid based on Eisenstein integer coordinates (axes at 120°), which allows for potentially higher packing density and error resilience via Hamming error correction with criss-cross interleaving.

## Repository Structure

```
apps/
  demo-site/        # Interactive web demo (React + Vite)
  compare-site/     # C++ vs. web encoder comparison tool
packages/
  core/             # @propolis-tools/core — encoder, ECC, hex map
  renderer/         # @propolis-tools/renderer — SVG/canvas rendering
vendor/
  propolis/         # C++ reference implementation (git submodule)
```

## Features

**Demo Site**
- Live propolis code generation as you type
- Adjustable error correction (0–65% redundancy)
- Encoding modes: ASCII, UTF-8, Decimal/symbols, propolis-native 5-bit
- Side-by-side QR code comparison with capacity stats
- Encoding pipeline visualization with per-letter tooltips
- SVG and PNG download
- Shareable URLs, dark/light/system theme

**Core Library (`@propolis-tools/core`)**
- Full Hamming ECC encoder matching C++ reference output exactly
- Criss-cross interleaving across 5 prime-based layers
- Lagrange polynomial check letters over GF(31)
- Hex map serialization for C++ interop

**Renderer Library (`@propolis-tools/renderer`)**
- Eisenstein integer coordinate math
- 38 letter patterns (32 data + 6 border), 12 bits each
- SVG and `<canvas>` output with configurable dot shapes and colors

**Compare Site**
- Automated fixture generation from C++ binary + web encoder
- Side-by-side, overlay, pixel-diff heatmap, and hex-map views
- Exact per-pixel difference statistics

## Getting Started

**Prerequisites:** Node.js 18+, pnpm

```bash
# Install dependencies
pnpm install

# Start the demo site in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

To use the compare site you will also need the C++ reference binary built from the `vendor/propolis` submodule. See [docs/comparing-cpp-and-web-output.md](docs/comparing-cpp-and-web-output.md).

## Tech Stack

- **TypeScript** (strict) throughout
- **React 18** + **Vite** for web apps
- **Vitest** for unit tests
- **pnpm** workspaces monorepo
- C++ reference via git submodule (Pierre Abbat's `propolis`)

## Attribution

Propolis codes were invented by **Pierre Abbat**. The C++ reference implementation is © Pierre Abbat under GPL-3.0 / LGPL-3.0. This repository builds open web tooling to make the format accessible to developers.

## Roadmap

- [x] Core encoder with full ECC (matches C++ reference)
- [x] SVG/canvas renderer
- [x] Interactive demo site
- [x] C++ comparison tooling
- [ ] CLI package (`@propolis-tools/cli`)
- [ ] Camera decoder (PWA + WebRTC)
