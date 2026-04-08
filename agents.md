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
- Coordinate system: Eisenstein integers — `(x, y)` where the y-axis is at 120°, not 90°
  - Converts to Cartesian: `cx = x - y/2`, `cy = y * sqrt(3)/2`
- Letter patterns: 38 total (32 data + 6 border), each a 16-bit pattern
- Error correction: Hamming codes; soft bits range -127 to 127
- Grid uses a paging system for memory efficiency

## Development Principles

- TypeScript-first for all new code
- The core encoder/decoder may be ported from C++ or compiled to WASM from the reference impl
- Keep packages loosely coupled — renderer should not depend on encoder internals
- Prioritize visual clarity in demos — the hex grid should look beautiful and intuitive
- Do not add features beyond what is asked; do not over-abstract

## Key References

- Reference implementation: https://github.com/phma/propolis (C++, GPL-3.0)
- Eisenstein integer math: https://en.wikipedia.org/wiki/Eisenstein_integer
- Hexagonal grid coordinate systems: https://www.redblobgames.com/grids/hexagons/
- This repo: https://github.com/Pabreetzio/propolis-tools
