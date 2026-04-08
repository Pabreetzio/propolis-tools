import { useMemo } from 'react';
import { renderToSVG, type PlacedLetter } from '@propolis-tools/renderer';

interface Props {
  letters: PlacedLetter[];
  size?: number;
}

export function PropolisSymbol({ letters, size = 340 }: Props) {
  const svg = useMemo(() =>
    renderToSVG(letters, {
      dotRadius: 0.42,
      gridSpacing: 1,
      colorOn: '#d0d0ff',
      colorOff: '#1e1e38',
      background: '#080812',
      padding: 2.0,
      showOff: true,
    }),
  [letters]);

  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
