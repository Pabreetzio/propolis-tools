# Propolis Tools — Agent Context

## Project Overview

Propolis Tools is a suite of applications for creating, rendering, decoding, and demonstrating **propolis matrix codes** — a hexagonal 2D barcode format invented by Pierre M. (https://github.com/phma/propolis). The goal is to make the concept accessible and demonstrable to evangelize the format.

The reference implementation is written in C++ at https://github.com/phma/propolis and is the authoritative source for encoding/decoding behavior.

## What Are Propolis Codes?

- Hexagonal matrix codes (an alternative to square-grid codes like QR)
- Encode data on a hexagonal grid using **Eisenstein integers** (hvec coordinates: x, y at 120° angle — not 90°)
- May achieve higher packing density than square codes
- Use Hamming error correction with soft-decision decoding
- Each symbol has a "size" (3, 5, 7, ...) determining capacity
- Output from the reference implementation: PostScript, PGM raster, DXF (CAD)
- Data is arranged via a "criss-cross rearrangement" to improve error resilience
- Licensed GPL-3.0 / LGPL-3.0

## Repo Structure

```
propolis-tools/
├── agents.md          # This file — shared AI agent context
├── packages/
│   ├── core/          # Encoding/decoding logic (TypeScript/WASM)
│   ├── renderer/      # SVG/Canvas hex grid renderer
│   ├── web-demo/      # Interactive web demo (Next.js or Vite)
│   └── cli/           # Node CLI tool
├── apps/
│   └── demo-site/     # Public-facing demo website
└── docs/              # Design docs, algorithm notes
```

## Key Technical Constraints

- The reference C++ implementation is the source of truth for encoding/decoding
- C++ source lives at `vendor/propolis` as a git submodule (phma/propolis, GPL-3.0)
- Coordinate system: Eisenstein integers — `(x, y)` where the y-axis is at 120°, not 90°
  - Converts to Cartesian: `cx = x - y/2`, `cy = y * sqrt(3)/2`
- Letter patterns: 38 total (32 data + 6 border), each a 16-bit pattern
- Error correction: Hamming codes; soft bits range -127 to 127
- Grid uses a paging system for memory efficiency
- **GMP/GMPXX dependency is the key WASM compilation risk** — audit its usage before starting Emscripten build. If only used for bounded modular arithmetic, replace with JS BigInt in the TS port.
- Boost is only used for CLI argument parsing — exclude from WASM build

## Development Principles

- TypeScript-first for all new code
- Encoder/decoder: WASM first for correctness, TypeScript port is the long-term goal
- Keep packages loosely coupled — renderer must not depend on encoder internals
- Prioritize visual clarity in demos — the hex grid should look beautiful and intuitive
- Do not add features beyond what is asked; do not over-abstract
- Target audience: developers first (v1), general public (v2+)
- npm packages: publish `@propolis-tools/core`, `@propolis-tools/renderer`, `@propolis-tools/cli`
- Camera decoder (Phase 4): PWA + WebRTC approach, Android priority over iOS

## Voice and Attribution Guidelines

**Attribution on the site:**
- Always credit Pierre Abbat by name as the inventor of propolis codes — e.g. "invented by Pierre Abbat" in headers and intro copy.
- When discussing implementation decisions or format choices in conversation, it's fine to say "Pierre made it this way" or "he designed it to...".
- User-facing site copy should not attribute specific internal conventions (like letter naming) to Pierre by name. Write as if from the propolis development team, or leave attribution off entirely. This avoids implying the detail is a personal quirk rather than a deliberate design choice.

**"A shorthand" vs "the shorthand":**
- When describing implementation conventions that may evolve (e.g. the `@`–`_` letter naming scheme), use "a shorthand" not "the shorthand". Using "the" implies this is the only possible convention; "a" correctly signals it's one convention in use now, and leaves room for alternatives. Document this reasoning here rather than on the page itself.

**Watch for conversational language bleeding into copy:**
- The user naturally says things like "Pierre's internal alphabet" in conversation. Do not lift that phrasing onto the page. Reframe as the feature or convention itself: "a shorthand character from @ to _" rather than "Pierre's internal alphabet".
- Similarly avoid "his letters", "his naming scheme", etc. in user-facing text.

## Key References

- Reference implementation: https://github.com/phma/propolis (C++, GPL-3.0)
- Eisenstein integer math: https://en.wikipedia.org/wiki/Eisenstein_integer
- Hexagonal grid coordinate systems: https://www.redblobgames.com/grids/hexagons/
- This repo: https://github.com/Pabreetzio/propolis-tools
