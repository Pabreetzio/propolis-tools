import { useMemo } from 'react';
import { renderToSVG, type PlacedLetter } from '@propolis-tools/renderer';

interface Props {
  letters: PlacedLetter[];
  size?: number;
}

/**
 * Renders a full propolis symbol (collection of placed letters) as SVG.
 */
export function PropolisSymbol({ letters, size = 400 }: Props) {
  const svg = useMemo(() =>
    renderToSVG(letters, {
      dotRadius: 0.44,
      gridSpacing: 1,
      colorOn: '#c8c8ff',
      colorOff: '#1e1e32',
      background: '#0f0f1a',
      padding: 2,
      showOff: true,
    }),
  [letters]);

  return (
    <div
      style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
