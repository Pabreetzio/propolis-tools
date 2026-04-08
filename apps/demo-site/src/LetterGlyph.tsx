import { useMemo } from 'react';
import { renderLetterToSVG, LETTER_PATTERNS } from '@propolis-tools/renderer';

interface Props {
  index: number;
  size?: number;
  highlighted?: boolean;
  onClick?: () => void;
}

export function LetterGlyph({ index, size = 96, highlighted = false, onClick }: Props) {
  const isData = index < 32;
  const pattern = LETTER_PATTERNS[index];

  const svg = useMemo(() =>
    renderLetterToSVG(index, {
      dotRadius: 0.46,
      gridSpacing: 1,
      colorOn: highlighted ? '#ff6b9d' : '#c8c8ff',
      colorOff: highlighted ? '#38182e' : '#22223c',
      background: 'transparent',
      padding: 1.2,
      showOff: true,
    }),
  [index, highlighted]);

  const label = isData
    ? index.toString(2).padStart(5, '0')
    : `B${index - 32}`;

  return (
    <button
      onClick={onClick}
      title={`Letter ${index} · pattern 0x${pattern.toString(16).padStart(3, '0')}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 4px 5px',
        border: `1px solid ${highlighted ? '#ff6b9d55' : '#2a2a44'}`,
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        background: highlighted ? '#1e101c' : '#0e0e20',
        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
        width: size,
      }}
      onMouseEnter={e => {
        if (!highlighted) (e.currentTarget as HTMLElement).style.borderColor = '#5555aa';
      }}
      onMouseLeave={e => {
        if (!highlighted) (e.currentTarget as HTMLElement).style.borderColor = '#2a2a44';
      }}
    >
      {/* SVG container — fixed square so the glyph fills it */}
      <div style={{ width: size - 16, height: size - 16, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        color: highlighted ? '#ff6b9d' : '#6060a0',
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}>
        {label}
      </span>
    </button>
  );
}
