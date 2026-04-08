import { useMemo } from 'react';
import { renderLetterToSVG } from '@propolis-tools/renderer';

interface Props {
  index: number;
  size?: number;
  highlighted?: boolean;
  onClick?: () => void;
}

export function LetterGlyph({ index, size = 80, highlighted = false, onClick }: Props) {
  const svg = useMemo(() =>
    renderLetterToSVG(index, {
      dotRadius: 0.44,
      gridSpacing: 1,
      colorOn: highlighted ? '#ff6b9d' : '#c8c8ff',
      colorOff: highlighted ? '#3a2030' : '#1e1e30',
      background: highlighted ? '#2a1828' : '#141428',
      padding: 1.5,
      showOff: true,
    }),
  [index, highlighted]);

  return (
    <button
      onClick={onClick}
      title={`Letter ${index} (0x${(index < 32 ? [
        0x000,0x007,0xf80,0x01f,0xc00,0x09b,0xf40,0xd99,
        0xa64,0x067,0x009,0x277,0x488,0x5bf,0xfbb,0xb66,
        0x499,0x044,0xa40,0xb77,0xd88,0xff6,0xf98,0x59b,
        0x266,0x0bf,0xf64,0x3ff,0xfe0,0x07f,0xff8,0xfff,
      ][index] : 0).toString(16).padStart(3,'0')})`}
      style={{
        width: size,
        height: size,
        padding: 0,
        border: `1px solid ${highlighted ? '#ff6b9d44' : '#2e2e4a'}`,
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        background: 'none',
        display: 'block',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
