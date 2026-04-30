import { useState, useRef } from 'react';
import { PropolisSymbol } from './PropolisSymbol.js';
import type { ThemeColors } from './theme.js';
import type { EncodeResult, PropolisEncodingMode } from '@propolis-tools/core';

const EXAMPLES = [
  'propolis',
  'hello world',
  'https://github.com/phma/propolis',
  '🐝',
];

const REDUNDANCY_PRESETS: { label: string; value: number; description: string }[] = [
  { label: 'Auto',   value: 0,    description: 'Minimum symbol size, basic error correction' },
  { label: 'Low',    value: 0.20, description: '~20% redundancy target' },
  { label: 'Medium', value: 0.40, description: '~40% redundancy target' },
  { label: 'High',   value: 0.65, description: '~65% redundancy (near maximum)' },
];

const ENCODING_PRESETS: {
  label: string;
  value: PropolisEncodingMode;
  description: string;
}[] = [
  {
    label: 'ASCII',
    value: 7,
    description: 'Use 7-bit text for ordinary English letters, punctuation, and control characters.',
  },
  {
    label: 'UTF-8 bytes',
    value: 8,
    description: 'Use raw UTF-8 bytes, which can represent any Unicode text.',
  },
  {
    label: 'Decimal/symbols',
    value: 10,
    description: 'Use the numeric and small-symbol format from the reference encoder.',
  },
];

interface Props {
  colors: ThemeColors;
  text: string;
  setText: (t: string) => void;
  result: EncodeResult;
  propolisRedundancy: number;
  onRedundancyChange: (r: number) => void;
  propolisEncoding: PropolisEncodingMode;
  onEncodingChange: (encoding: PropolisEncodingMode) => void;
  availableEncodings: PropolisEncodingMode[];
}

export function EncoderPanel({
  colors,
  text,
  setText,
  result,
  propolisRedundancy,
  onRedundancyChange,
  propolisEncoding,
  onEncodingChange,
  availableEncodings,
}: Props) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const usedPct = result.bytesEncoded / result.byteCapacity;
  const fillColor = usedPct > 0.9 ? '#ef4444' : usedPct > 0.7 ? '#f59e0b' : '#22c55e';

  const symbolSize = Math.min(420, Math.max(240, 160 + result.radius * 50));

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadSVG() {
    const svgEl = document.querySelector('#propolis-output svg') as SVGElement | null;
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propolis-${text.slice(0, 20).replace(/\W+/g, '-') || 'code'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPNG() {
    const svgEl = document.querySelector('#propolis-output svg') as SVGElement | null;
    if (!svgEl) return;
    const scale = 4;
    const w = svgEl.clientWidth || symbolSize;
    const h = svgEl.clientHeight || symbolSize;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w * scale, h * scale);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `propolis-${text.slice(0, 20).replace(/\W+/g, '-') || 'code'}.png`;
      a.click();
    };
    img.src = url;
  }

  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ── Left: input + stats ── */}
        <div style={{ flex: '1 1 300px', minWidth: 280 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Encode a message
          </h2>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type anything…"
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />

          {/* Example pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: text === ex ? 'var(--surface2)' : 'transparent',
                  color: text === ex ? 'var(--text)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  transition: 'all 0.12s',
                }}
              >
                {ex.length > 24 ? ex.slice(0, 22) + '…' : ex}
              </button>
            ))}
          </div>

          {/* Encoding selector */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
              Message format
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {ENCODING_PRESETS.map(preset => {
                const active = propolisEncoding === preset.value;
                const disabled = !availableEncodings.includes(preset.value);
                return (
                  <button
                    key={preset.label}
                    onClick={() => { if (!disabled) onEncodingChange(preset.value); }}
                    disabled={disabled}
                    title={disabled ? 'This message cannot be represented in that format.' : preset.description}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: 6,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--surface)' : 'transparent',
                      color: disabled ? 'var(--text-dim)' : active ? 'var(--accent)' : 'var(--text-dim)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.42 : 1,
                      fontSize: '0.775rem',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.12s',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ECC preset selector */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
              Error correction
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {REDUNDANCY_PRESETS.map(preset => {
                const active = propolisRedundancy === preset.value;
                return (
                  <button
                    key={preset.label}
                    onClick={() => onRedundancyChange(preset.value)}
                    title={preset.description}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: 6,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--surface)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.775rem',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.12s',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats card */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            padding: '0.875rem 1rem',
            fontSize: '0.825rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginBottom: '0.75rem' }}>
              {([
                ['Input', `${result.bytesEncoded} byte${result.bytesEncoded !== 1 ? 's' : ''}`],
                ['Format', result.encodingLabel ?? 'Simplified'],
                ['Symbol size', `radius ${result.radius}`],
                ['Data slots', `${result.dataSlots} letters`],
                ['Capacity', `${result.byteCapacity} bytes`],
                ...(result.redundancy !== undefined
                  ? [['Redundancy', `${Math.round(result.redundancy * 100)}%`] as [string, string]]
                  : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>{label}</div>
                  <div style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
              Capacity used — {Math.round(usedPct * 100)}%
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, usedPct * 100).toFixed(1)}%`,
                background: fillColor,
                borderRadius: 2,
                transition: 'width 0.3s, background 0.3s',
              }} />
            </div>
            {result.truncated && (
              <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.75rem' }}>
                ⚠ Message truncated — exceeded max symbol size
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={downloadSVG}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              ↓ SVG
            </button>
            <button
              onClick={downloadPNG}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              ↓ PNG
            </button>
            <button
              onClick={copyLink}
              title="Copy shareable link to clipboard"
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`,
                background: copied ? 'var(--surface)' : 'transparent',
                color: copied ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; } }}
            >
              {copied ? '✓ Copied!' : '⎘ Copy link'}
            </button>
          </div>

          <p style={{ marginTop: '0.75rem', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: 1.6, opacity: 0.7 }}>
            {result.encodingLabel ?? 'Simplified'} · Hamming ECC · criss-cross interleaving · whitening —
            compatible with the reference C++ decoder.
          </p>
        </div>

        {/* ── Right: rendered code ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            id="propolis-output"
            style={{
              background: colors.symbolContainerBg,
              borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '0.75rem',
              display: 'inline-flex',
            }}
          >
            <PropolisSymbol
              letters={result.letters}
              size={symbolSize}
              colors={colors}
              letterRoles={result.letterRoles}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            {text.length === 0 ? 'Enter a message above' : `${result.letters.length} letters · radius ${result.radius}`}
          </div>
        </div>

      </div>
    </section>
  );
}
