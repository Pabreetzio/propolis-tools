import { useState, useEffect, useMemo } from 'react';
import { LetterGlyph } from './LetterGlyph.js';
import { EncoderPanel } from './EncoderPanel.js';
import { QRComparison } from './QRComparison.js';
import { LETTER_PATTERNS } from '@propolis-tools/renderer';
import { encodeText, encodeTextECC } from '@propolis-tools/core';
import { themeColors, resolveTheme, type Theme } from './theme.js';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('propolis-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'system';
}

const THEME_CYCLE: Theme[] = ['system', 'dark', 'light'];

function getInitialText(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('msg');
    if (msg !== null) return msg;
  } catch { /* ignore */ }
  return 'propolis';
}

export function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [systemPrefers, setSystemPrefers] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  );
  const [text, setText] = useState<string>(getInitialText);
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);

  const applied = theme === 'system' ? systemPrefers : theme;
  const colors = themeColors[applied];
  const isLight = applied === 'light';

  // Keep system preference in sync
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefers(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', applied);
    try { localStorage.setItem('propolis-theme', theme); } catch { /* ignore */ }
  }, [theme, applied]);

  // Sync message text to URL ?msg= param so links are shareable
  useEffect(() => {
    const url = new URL(window.location.href);
    if (text === 'propolis') {
      url.searchParams.delete('msg');
    } else {
      url.searchParams.set('msg', text);
    }
    window.history.replaceState(null, '', url.toString());
  }, [text]);

  const result = useMemo(() => {
    try { return encodeTextECC(text); }
    catch { return encodeText(text); }   // fallback to simplified if ECC fails
  }, [text]);

  const dataLetters = LETTER_PATTERNS.slice(0, 32);
  const borderLetters = LETTER_PATTERNS.slice(32);
  const sel = selectedLetter;
  const selPattern = sel !== null ? LETTER_PATTERNS[sel] : null;
  const selBitCount = selPattern !== null
    ? selPattern.toString(2).split('').filter(b => b === '1').length : 0;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Header ── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            🐝 Propolis
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1rem', maxWidth: 580, lineHeight: 1.7 }}>
            Hexagonal matrix codes based on{' '}
            <a href="https://en.wikipedia.org/wiki/Eisenstein_integer" target="_blank" rel="noreferrer">Eisenstein integers</a>
            , invented by{' '}
            <a href="https://github.com/phma/propolis" target="_blank" rel="noreferrer">Pierre Abbat</a>.
            Each symbol encodes data on a hex grid — potentially denser than square codes like QR.
          </p>
        </div>

        {/* Theme toggle — cycles: system → dark → light → system */}
        <button
          onClick={() => setTheme(t => {
            const idx = THEME_CYCLE.indexOf(t);
            return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
          })}
          title={
            theme === 'system' ? `System (${systemPrefers}) — click for dark` :
            theme === 'dark'   ? 'Dark — click for bee' :
                                 'Bee — click for system'
          }
          style={{
            flexShrink: 0,
            marginTop: '0.25rem',
            padding: '0.5rem 0.9rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          {theme === 'system' ? '💻' : isLight ? '🍯' : '🌙'}
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
            {theme === 'system' ? 'System' : isLight ? 'Bee' : 'Dark'}
          </span>
        </button>
      </header>

      {/* ── Encoder ── */}
      <EncoderPanel colors={colors} text={text} setText={setText} result={result} />

      {/* ── QR Comparison ── */}
      <QRComparison text={text} result={result} colors={colors} applied={applied} />

      {/* ── How it works ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
          {[
            { title: 'Eisenstein integers', body: 'The y-axis is at 120° from x instead of 90°. Every hex cell has 6 equidistant neighbors — more efficient packing than a square grid\'s 4.' },
            { title: '12-dot letters', body: 'Each 5-bit value (0–31) maps to a unique 12-dot cluster. Rotating a letter 120° produces a related letter. 6 extra border letters mark the boundary.' },
            { title: 'Seamless tiling', body: 'Letter clusters tile the hex plane with no gaps. A "size N" symbol is a hexagonal region of letter-centers — scaling up adds more rings of letters.' },
            { title: 'Error correction', body: 'Hamming codes within each letter, plus criss-cross rearrangement across letters, gives resilience to partial damage and bad scan angles.' },
          ].map(card => (
            <div key={card.title} style={{ background: 'var(--surface)', borderRadius: 10, padding: '1rem 1.125rem', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.4rem' }}>{card.title}</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.825rem', lineHeight: 1.65 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Letter Alphabet ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Letter Alphabet</h2>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>click any letter to inspect</span>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
          32 data letters (labeled with 5-bit value) and 6 border letters — each a 12-dot Eisenstein-grid cluster.
        </p>

        {/* Selected letter detail — above gallery so it's always visible */}
        {sel !== null && selPattern !== null && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'var(--surface)',
            borderRadius: 12,
            border: `1px solid var(--accent)`,
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <div style={{ flexShrink: 0 }}>
              <LetterGlyph index={sel} size={120} highlighted colors={colors} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.4rem' }}>
                Letter {sel}
                {sel < 32 && (
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                    · 5-bit value <code style={{ color: 'var(--accent)' }}>{sel.toString(2).padStart(5, '0')}</code>
                    <span style={{ color: 'var(--text-dim)', opacity: 0.5 }}> ({sel})</span>
                  </span>
                )}
                {sel >= 32 && (
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.875rem' }}>· border letter</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                <div>
                  12-bit pattern: <code style={{ color: 'var(--text)' }}>0x{selPattern.toString(16).padStart(3, '0')}</code>
                  <span style={{ opacity: 0.5 }}> · {selBitCount} of 12 dots filled</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.15em' }}>
                  {selPattern.toString(2).padStart(12, '0').split('').map((bit, i) => (
                    <span key={i} style={{ color: bit === '1' ? 'var(--accent)' : 'var(--text-dim)', opacity: bit === '1' ? 1 : 0.35 }}>
                      {bit}{(i === 1 || i === 4 || i === 7) ? '\u2009' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedLetter(null)} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-dim)', cursor: 'pointer', padding: '0.2rem 0.6rem', fontSize: '0.8rem',
            }}>✕</button>
          </div>
        )}

        <h3 style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Data letters
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {dataLetters.map((_, i) => (
            <LetterGlyph key={i} index={i} size={88} highlighted={sel === i} colors={colors}
              onClick={() => setSelectedLetter(sel === i ? null : i)} />
          ))}
        </div>

        <h3 style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Border letters
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {borderLetters.map((_, i) => (
            <LetterGlyph key={i + 32} index={i + 32} size={88} highlighted={sel === i + 32} colors={colors}
              onClick={() => setSelectedLetter(sel === i + 32 ? null : i + 32)} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', color: 'var(--text-dim)', fontSize: '0.8rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', opacity: 0.7 }}>
        <a href="https://github.com/phma/propolis" target="_blank" rel="noreferrer">Reference C++ implementation</a>
        <a href="https://github.com/Pabreetzio/propolis-tools" target="_blank" rel="noreferrer">propolis-tools on GitHub</a>
        <a href="https://en.wikipedia.org/wiki/Eisenstein_integer" target="_blank" rel="noreferrer">Eisenstein integers</a>
        <span style={{ marginLeft: 'auto' }}>Encoder · CLI · Camera decoder — coming soon</span>
      </footer>
    </div>
  );
}
