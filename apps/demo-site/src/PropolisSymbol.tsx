import { useState, useMemo, useRef, useCallback } from 'react';
import { renderToSVG, letterCentersInViewBox, type PlacedLetter } from '@propolis-tools/renderer';
import type { ThemeColors } from './theme.js';
import type { LetterRole } from '@propolis-tools/core';

interface Props {
  letters: PlacedLetter[];
  size?: number;
  colors: ThemeColors;
  letterRoles?: LetterRole[];
}

const GRID_OPTS = {
  gridSpacing: 1,
  padding: 2.0,
} as const;

function describeRole(role: LetterRole, letterIndex: number): { title: string; detail: string } {
  switch (role.kind) {
    case 'data':
      return {
        title: `Data cell (slot ${role.dataIndex! + 1} of ${role.totalSlots})`,
        detail:
          'Carries 5 bits of error-coded payload. After Hamming ECC and criss-cross ' +
          'interleaving, this cell\'s bits come from different parts of the encoding — ' +
          'no individual cell maps cleanly back to a specific message byte.',
      };
    case 'metadata-index':
      return {
        title: '@ Orientation marker',
        detail:
          'Always letter 0 — all 12 dots off. The decoder tries all 6 rotations and ' +
          'picks the one where this corner is blank. It\'s how the code communicates ' +
          'which way is "up" without any external markings.',
      };
    case 'metadata-encoding':
      return {
        title: 'Encoding mode (metadata corner)',
        detail:
          'Stores the message format selected by the encoder, such as ASCII, UTF-8 bytes, ' +
          'or decimal/symbols.',
      };
    case 'metadata-nblocks-lo':
      return {
        title: 'Hamming block count — low bits (metadata corner)',
        detail:
          'Stores (nBlocks − 1) mod 31 over GF(31). Together with the high-bits corner, ' +
          'tells the decoder how many Hamming blocks to expect when reconstructing the data.',
      };
    case 'metadata-nblocks-hi':
      return {
        title: 'Hamming block count — high bits (metadata corner)',
        detail:
          'Stores ⌊(nBlocks − 1) / 31⌋ mod 31 over GF(31). With the low-bits corner, ' +
          'encodes the full Hamming block count.',
      };
    case 'metadata-lagrange0':
      return {
        title: 'Lagrange error-check 0 (metadata corner)',
        detail:
          'A checksum for the 6 metadata corners, computed as a polynomial ' +
          'interpolated at x=0 over GF(31). If one metadata corner is damaged, ' +
          'the decoder can reconstruct it from the other five.',
      };
    case 'metadata-lagrange1':
      return {
        title: 'Lagrange error-check 1 (metadata corner)',
        detail:
          'A second checksum, evaluated at x=1 over GF(31). Together with check 0, ' +
          'allows detection and correction of a single corrupted metadata corner.',
      };
    case 'border-side':
      return {
        title: 'Border side letter',
        detail:
          'One of six fixed side patterns (letters 32–37) forming the outer ring. ' +
          'All border sides are mostly filled (dark), creating a clear boundary ' +
          'the decoder uses to locate and bound the symbol.',
      };
    case 'border-corner':
      return {
        title: `Border corner letter (pattern ${letterIndex})`,
        detail:
          'Fixed corner marker — one of six specific letter patterns that mark the ' +
          'tips of the outer hexagon. Different from the side letters, making the ' +
          'six corners visually distinct for alignment.',
      };
    default:
      return { title: 'Unknown', detail: '' };
  }
}

export function PropolisSymbol({ letters, size = 340, colors, letterRoles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const renderOpts = useMemo(() => ({
    ...GRID_OPTS,
    dotRadius: colors.symbolDotRadius,
    dotShape: colors.symbolDotShape,
  }), [colors.symbolDotRadius, colors.symbolDotShape]);

  const svg = useMemo(() =>
    renderToSVG(letters, {
      ...renderOpts,
      colorOn: colors.symbolOn,
      colorOff: colors.symbolOff,
      background: colors.symbolBg,
      showOff: true,
    }),
  [letters, colors, renderOpts]);

  // Precompute letter centers in SVG viewBox space (matches the rendered SVG exactly)
  const letterCenters = useMemo(() => {
    if (!letterRoles) return null;
    return letterCentersInViewBox(letters, renderOpts);
  }, [letters, letterRoles, renderOpts]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!letterCenters || !letterRoles) return;
    const svgEl = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;

    const ctm = svgEl.getScreenCTM();
    if (!ctm) return;

    // Convert client coordinates to SVG viewBox coordinates
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());

    // Find nearest letter center; max snap distance ≈ half inter-letter spacing (12 units)
    let nearest = -1;
    let nearestDist2 = 5.5 * 5.5; // 5.5 viewBox units max
    for (let i = 0; i < letterCenters.length; i++) {
      const dx = letterCenters[i].x - svgPt.x;
      const dy = letterCenters[i].y - svgPt.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist2) { nearestDist2 = d2; nearest = i; }
    }

    if (nearest >= 0) {
      setHoveredIndex(nearest);
      const rect = containerRef.current!.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredIndex(null);
      setTooltipPos(null);
    }
  }, [letterCenters, letterRoles]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltipPos(null);
  }, []);

  const hoveredRole = hoveredIndex !== null && letterRoles ? letterRoles[hoveredIndex] : null;
  const hoveredInfo = hoveredRole
    ? describeRole(hoveredRole, letters[hoveredIndex!]?.letterIndex ?? 0)
    : null;

  // Position tooltip near cursor, staying within the symbol container bounds
  function tooltipStyle(pos: { x: number; y: number }): React.CSSProperties {
    const maxW = 260;
    // Prefer right of cursor; flip left when near the right edge
    const left = pos.x + maxW + 16 > size
      ? Math.max(0, pos.x - maxW - 8)  // flip left, clamp to container edge
      : pos.x + 12;
    return {
      position: 'absolute',
      left,
      top: pos.y + 12,
      maxWidth: maxW,
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.6rem 0.8rem',
      zIndex: 100,
      pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    };
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={containerRef}
        style={{
          width: size,
          height: size,
          cursor: letterRoles ? 'crosshair' : 'default',
        }}
        onMouseMove={letterRoles ? handleMouseMove : undefined}
        onMouseLeave={letterRoles ? handleMouseLeave : undefined}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {hoveredInfo && tooltipPos && (
        <div style={tooltipStyle(tooltipPos)}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '0.3rem',
            lineHeight: 1.3,
          }}>
            {hoveredInfo.title}
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            lineHeight: 1.55,
          }}>
            {hoveredInfo.detail}
          </div>
        </div>
      )}
    </div>
  );
}
