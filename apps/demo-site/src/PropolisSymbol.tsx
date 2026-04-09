import { useMemo } from 'react';
import { renderToSVG, type PlacedLetter } from '@propolis-tools/renderer';
import type { ThemeColors } from './theme.js';

interface Props {
  letters: PlacedLetter[];
  size?: number;
  colors: ThemeColors;
}

export function PropolisSymbol({ letters, size = 340, colors }: Props) {
  const svg = useMemo(() =>
    renderToSVG(letters, {
      dotRadius: 0.44,
      gridSpacing: 1,
      colorOn: colors.symbolOn,
      colorOff: colors.symbolOff,
      background: colors.symbolBg,
      padding: 2.0,
      showOff: true,
    }),
  [letters, colors]);

  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
