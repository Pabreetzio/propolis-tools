import { useState, useMemo, useRef } from 'react';
import { encodeText } from './encode.js';
import { PropolisSymbol } from './PropolisSymbol.js';

const EXAMPLES = [
  'propolis',
  'hello world',
  'https://github.com/phma/propolis',
  '🐝',
];

export function EncoderPanel() {
  const [text, setText] = useState('propolis');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(() => encodeText(text), [text]);

  const usedPct = result.bytesEncoded / result.byteCapacity;
  const fillColor = usedPct > 0.9 ? '#ff6b6b' : usedPct > 0.7 ? '#ffc06b' : '#6bffb8';

  // SVG size: scale with radius so large codes don't get tiny
  const symbolSize = Math.min(420, Math.max(240, 160 + result.radius * 50));

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

  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ── Left: input controls ── */}
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
              background: '#0e0e20',
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

          {/* Example messages */}
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

          {/* Stats */}
          <div style={{
            background: '#0e0e20',
            borderRadius: 10,
            border: '1px solid var(--border)',
            padding: '0.875rem 1rem',
            fontSize: '0.825rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginBottom: '0.75rem' }}>
              {[
                ['Input', `${result.bytesEncoded} byte${result.bytesEncoded !== 1 ? 's' : ''}`],
                ['Symbol size', `radius ${result.radius}`],
                ['Data slots', `${result.dataSlots} letters`],
                ['Capacity', `${result.byteCapacity} bytes`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>{label}</div>
                  <div style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Fill bar */}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
              Capacity used — {Math.round(usedPct * 100)}%
            </div>
            <div style={{ height: 4, borderRadius: 2, background: '#1a1a30', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, usedPct * 100).toFixed(1)}%`,
                background: fillColor,
                borderRadius: 2,
                transition: 'width 0.3s, background 0.3s',
              }} />
            </div>

            {result.truncated && (
              <div style={{ marginTop: '0.5rem', color: '#ff6b6b', fontSize: '0.75rem' }}>
                ⚠ Message truncated — exceeded max symbol size
              </div>
            )}
          </div>

          {/* Download */}
          <button
            onClick={downloadSVG}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.825rem',
              transition: 'all 0.15s',
              width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            ↓ Download SVG
          </button>

          <p style={{ marginTop: '0.75rem', color: '#44446a', fontSize: '0.75rem', lineHeight: 1.6 }}>
            <strong style={{ color: '#55558a' }}>Simplified encoding</strong> — bits are packed 5-at-a-time into
            letter slots without Hamming error correction or criss-cross rearrangement.
            Full encoding accuracy arrives with the WASM build of the reference C++.
          </p>
        </div>

        {/* ── Right: rendered code ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div
            id="propolis-output"
            style={{
              background: '#080812',
              borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '0.75rem',
              display: 'inline-flex',
              transition: 'opacity 0.15s',
            }}
          >
            <PropolisSymbol letters={result.letters} size={symbolSize} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#444468', textAlign: 'center' }}>
            {text.length === 0
              ? 'Enter a message above'
              : `${result.letters.length} letters · radius ${result.radius}`}
          </div>
        </div>

      </div>
    </section>
  );
}
