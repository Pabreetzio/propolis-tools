import { useState } from 'react';
import { LetterGlyph } from './LetterGlyph.js';
import { PropolisSymbol } from './PropolisSymbol.js';
import { buildBorderedDemoSymbol } from './demoLayout.js';
import { LETTER_PATTERNS } from '@propolis-tools/renderer';

const DEMO_SYMBOL = buildBorderedDemoSymbol(2, 7);

export function App() {
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [symbolSeed, setSymbolSeed] = useState(7);

  const dataLetters = LETTER_PATTERNS.slice(0, 32);
  const borderLetters = LETTER_PATTERNS.slice(32);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          🐝 Propolis
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', maxWidth: 560 }}>
          Hexagonal matrix codes — a 2D barcode format based on{' '}
          <a href="https://en.wikipedia.org/wiki/Eisenstein_integer" target="_blank" rel="noreferrer">
            Eisenstein integers
          </a>
          , invented by{' '}
          <a href="https://github.com/phma/propolis" target="_blank" rel="noreferrer">
            Pierre Abbat
          </a>
          . Each symbol packs data into a hexagonal grid that may achieve higher density than square codes like QR.
        </p>
      </header>

      {/* Demo Symbol */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Demo Symbol</h2>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {DEMO_SYMBOL.length} letters · random data
          </span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '1rem',
            border: '1px solid var(--border)',
            display: 'inline-block',
          }}>
            <PropolisSymbol letters={buildBorderedDemoSymbol(2, symbolSeed)} size={320} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.7 }}>
              Each hexagonal cluster of dots is one <strong style={{ color: 'var(--text)' }}>letter</strong> — 12 dots encoding
              5 bits of data. Letters tile the hex plane with no wasted space.
              Border letters (shown in a different pattern) mark the symbol boundary.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {[7, 13, 42, 99, 256, 1337].map(s => (
                <button
                  key={s}
                  onClick={() => setSymbolSeed(s)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: 6,
                    border: `1px solid ${symbolSeed === s ? 'var(--accent)' : 'var(--border)'}`,
                    background: symbolSeed === s ? 'var(--accent)' : 'transparent',
                    color: symbolSeed === s ? '#fff' : 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.15s',
                  }}
                >
                  seed {s}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '1rem' }}>
              <em>Encoder coming soon — these are random letter assignments for visual preview.</em>
            </p>
          </div>
        </div>
      </section>

      {/* Letter Alphabet */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Letter Alphabet</h2>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            32 data letters (5 bits each) + 6 border letters
          </span>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1.2rem' }}>
          Each letter is a 12-dot hex cluster. The dot pattern encodes the letter's value with Hamming error correction built in.
          Click any letter to highlight it.
        </p>

        <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Data letters (0–31)
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {dataLetters.map((_, i) => (
            <LetterGlyph
              key={i}
              index={i}
              size={72}
              highlighted={selectedLetter === i}
              onClick={() => setSelectedLetter(selectedLetter === i ? null : i)}
            />
          ))}
        </div>

        <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Border letters (32–37)
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {borderLetters.map((_, i) => (
            <LetterGlyph
              key={i + 32}
              index={i + 32}
              size={72}
              highlighted={selectedLetter === i + 32}
              onClick={() => setSelectedLetter(selectedLetter === i + 32 ? null : i + 32)}
            />
          ))}
        </div>

        {selectedLetter !== null && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'var(--surface2)',
            borderRadius: 10,
            border: '1px solid #ff6b9d44',
            fontSize: '0.875rem',
            color: 'var(--text-dim)',
          }}>
            <strong style={{ color: 'var(--text)' }}>Letter {selectedLetter}</strong>
            {selectedLetter < 32 && (
              <> · 5-bit value: <code style={{ color: 'var(--accent)' }}>{selectedLetter.toString(2).padStart(5, '0')}</code></>
            )}
            {' · '}
            12-bit pattern: <code style={{ color: 'var(--accent)' }}>
              0x{LETTER_PATTERNS[selectedLetter].toString(16).padStart(3, '0')}
            </code>
            {' · '}
            <span>{LETTER_PATTERNS[selectedLetter].toString(2).padStart(12, '0').split('').filter(b => b === '1').length} dots filled of 12</span>
          </div>
        )}
      </section>

      {/* How it works */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[
            {
              title: 'Eisenstein integers',
              body: 'Instead of a square (x, y) grid, propolis uses a hexagonal coordinate system where the y-axis is at 120° from x. Every cell has 6 equidistant neighbors — more efficient than a square grid\'s 4.',
            },
            {
              title: '12-dot letters',
              body: 'Data is split into 5-bit values (0–31). Each value maps to a unique 12-dot hexagonal cluster with Hamming error correction. Rotate a letter 120° and you get a related (but distinct) letter.',
            },
            {
              title: 'Hexagonal tiling',
              body: 'Letter clusters tile the hex plane seamlessly. A "size N" propolis code is a hexagonal region of letters with border letters marking the edges for locating the code in an image.',
            },
            {
              title: 'Error correction',
              body: 'Each letter carries redundancy (Hamming codes), and a criss-cross rearrangement spreads burst errors across multiple letters — making the code robust to partial damage or bad camera angles.',
            },
          ].map(card => (
            <div key={card.title} style={{
              background: 'var(--surface)',
              borderRadius: 10,
              padding: '1.25rem',
              border: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)' }}>
                {card.title}
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', lineHeight: 1.65 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', color: 'var(--text-dim)', fontSize: '0.8rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <a href="https://github.com/phma/propolis" target="_blank" rel="noreferrer">Reference implementation (C++)</a>
        <a href="https://github.com/Pabreetzio/propolis-tools" target="_blank" rel="noreferrer">This project on GitHub</a>
        <a href="https://en.wikipedia.org/wiki/Eisenstein_integer" target="_blank" rel="noreferrer">Eisenstein integers</a>
        <span style={{ marginLeft: 'auto' }}>Encoder coming soon</span>
      </footer>
    </div>
  );
}
