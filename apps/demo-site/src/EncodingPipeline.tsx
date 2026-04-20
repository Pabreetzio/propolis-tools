import type { EncodeResult } from './encode.js';
import type { ThemeColors } from './theme.js';

interface Props {
  result: EncodeResult;
  colors: ThemeColors;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent)', color: '#fff', fontSize: '0.6rem', fontWeight: 700,
      }}>{n}</span>
      <span style={{
        fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.09em',
        color: 'var(--text-dim)', fontWeight: 600,
      }}>{title}</span>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
      margin: '0.5rem 0 0.5rem 9px',
    }}>
      <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.1, flexShrink: 0 }}>↓</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EncodingPipeline({ result, colors }: Props) {
  const { pipeline } = result;
  if (!pipeline) return null;

  const { utf8Bytes, rawLetterNames, checkLetterNames, cornerLetters } = pipeline;

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 5,
    border: '1px solid var(--border)',
    padding: '0.18rem 0.32rem',
    fontFamily: 'monospace',
    lineHeight: 1.25,
    cursor: 'default',
  };

  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
        Encoding pipeline
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        How your message is transformed into a propolis symbol, step by step.
        Pierre names each of the 32 data letters with the ASCII characters{' '}
        <code>@</code> through <code>_</code> (indices 0–31, stored as char code + 0x40 internally).
      </p>

      {/* ── Step 1: UTF-8 bytes ── */}
      <SectionHeading n={1} title="UTF-8 bytes" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', marginBottom: '0.2rem' }}>
        {utf8Bytes.map((b, i) => {
          const isPrintable = b >= 0x20 && b < 0x7f;
          return (
            <span
              key={i}
              title={`byte ${i}: 0x${b.toString(16).padStart(2, '0').toUpperCase()} = ${b}${isPrintable ? ` '${String.fromCharCode(b)}'` : ''}`}
              style={{ ...chipBase, background: 'var(--surface)', cursor: 'help' }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>
                {b.toString(16).padStart(2, '0').toUpperCase()}
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', minWidth: 12, textAlign: 'center' }}>
                {isPrintable ? String.fromCharCode(b) : '·'}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.15rem', paddingLeft: 2 }}>
        {utf8Bytes.length} byte{utf8Bytes.length !== 1 ? 's' : ''} ·{' '}
        {utf8Bytes.length * 8} bits total
      </div>

      <Arrow label={`pack bits into 5-bit groups → ${Math.ceil(utf8Bytes.length * 8 / 5)} letter${Math.ceil(utf8Bytes.length * 8 / 5) !== 1 ? 's' : ''}`} />

      {/* ── Step 2: Data letters + check letters ── */}
      <SectionHeading n={2} title={`Data letters + check letters (${rawLetterNames.length} + ${checkLetterNames.length})`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', alignItems: 'center', marginBottom: '0.2rem' }}>
        {rawLetterNames.map((name, i) => {
          const val = name.charCodeAt(0) - 0x40;
          return (
            <span
              key={i}
              title={`'${name}' — data letter ${i + 1}/${rawLetterNames.length}, 5-bit value ${val} (${val.toString(2).padStart(5, '0')})`}
              style={{ ...chipBase, background: colors.glyphBtnBg, cursor: 'help' }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>
                {val.toString(2).padStart(5, '0')}
              </span>
            </span>
          );
        })}

        {checkLetterNames.length > 0 && (
          <>
            <span style={{
              fontSize: '0.68rem', color: 'var(--text-dim)', margin: '0 0.2rem',
              alignSelf: 'center',
            }} title="Check letters start here">│</span>
            {checkLetterNames.map((name, i) => {
              const val = name.charCodeAt(0) - 0x40;
              return (
                <span
                  key={i}
                  title={`'${name}' — check letter ${i + 1}/${checkLetterNames.length}, error detection redundancy appended before Hamming ECC`}
                  style={{
                    ...chipBase,
                    background: colors.glyphBtnHighBg,
                    borderColor: colors.glyphBtnHighBorder,
                    cursor: 'help',
                  }}
                >
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: colors.glyphHighOn }}>{name}</span>
                  <span style={{ fontSize: '0.56rem', color: colors.glyphHighOn, opacity: 0.7 }}>
                    {val.toString(2).padStart(5, '0')}
                  </span>
                </span>
              );
            })}
          </>
        )}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', paddingLeft: 2 }}>
        <span>{rawLetterNames.length} data</span>
        {checkLetterNames.length > 0 && (
          <span> · <span style={{ color: colors.glyphHighOn }}>{checkLetterNames.length} check</span> (error-detection redundancy added before Hamming ECC)</span>
        )}
      </div>

      <Arrow label="Hamming ECC inserts parity bits within each block · criss-cross scrambles bits across blocks · whitening applies position-dependent substitution" />

      {/* ── Step 3: Metadata corners ── */}
      <SectionHeading n={3} title="6 metadata corners — placed directly, bypass ECC pipeline" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.2rem' }}>
        {cornerLetters.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <span
              title={`'${c.name}' — index ${c.index}, 5-bit ${c.index.toString(2).padStart(5, '0')}`}
              style={{
                ...chipBase,
                background: colors.glyphBtnHighBg,
                borderColor: colors.glyphBtnHighBorder,
                minWidth: 30,
                cursor: 'help',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: colors.glyphHighOn }}>{c.name}</span>
              <span style={{ fontSize: '0.56rem', color: colors.glyphHighOn, opacity: 0.7 }}>
                {c.index.toString(2).padStart(5, '0')}
              </span>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5, paddingTop: '0.15rem' }}>
              {c.role}
            </span>
          </div>
        ))}
      </div>

      <Arrow label="place all letters in the hex grid · add border ring" />

      {/* ── Final ── */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', paddingLeft: 2 }}>
        → <strong style={{ fontStyle: 'normal', color: 'var(--text)' }}>{result.letters.length} letters</strong> placed in the symbol above
        · {result.dataSlots} data/ECC slots · 6 metadata corners · {result.letters.length - result.dataSlots - 6} border letters
        · hover over any cell to see its role in the encoding
      </div>
    </section>
  );
}
