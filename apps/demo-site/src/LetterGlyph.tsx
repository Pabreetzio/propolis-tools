import { useMemo } from 'react';
import { renderLetterToSVG, LETTER_PATTERNS } from '@propolis-tools/renderer';
import type { ThemeColors } from './theme.js';

interface Props {
  index: number;
  size?: number;
  highlighted?: boolean;
  onClick?: () => void;
  colors: ThemeColors;
}

export function LetterGlyph({ index, size = 96, highlighted = false, onClick, colors }: Props) {
  const isData = index < 32;
  const pattern = LETTER_PATTERNS[index];

  const svg = useMemo(() =>
    renderLetterToSVG(index, {
      dotRadius: 0.46,
      gridSpacing: 1,
      colorOn: highlighted ? colors.glyphHighOn : colors.glyphOn,
      colorOff: highlighted ? colors.glyphHighOff : colors.glyphOff,
      background: 'transparent',
      padding: 1.2,
      showOff: true,
    }),
  [index, highlighted, colors]);

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
        border: `1px solid ${highlighted ? colors.glyphBtnHighBorder : colors.glyphBtnBorder}`,
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        background: highlighted ? colors.glyphBtnHighBg : colors.glyphBtnBg,
        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
        width: size,
      }}
      onMouseEnter={e => {
        if (!highlighted) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)';
      }}
      onMouseLeave={e => {
        if (!highlighted) (e.currentTarget as HTMLElement).style.borderColor = colors.glyphBtnBorder;
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      <div
        style={{ width: size - 16, height: size - 16, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        color: highlighted ? colors.glyphLabelHighColor : colors.glyphLabelColor,
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}>
        {label}
      </span>
    </button>
  );
}
