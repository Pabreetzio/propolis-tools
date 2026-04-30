import { useMemo, useState } from 'react';
import type { EncodeResult } from '@propolis-tools/core';
import type { ThemeColors } from './theme.js';

interface Props {
  result: EncodeResult;
  colors: ThemeColors;
  text: string;
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

export function EncodingPipeline({ result, colors, text }: Props) {
  const { pipeline } = result;
  if (!pipeline) return null;

  const { rawLetterNames, checkLetterNames, cornerLetters } = pipeline;

  // Split text into Unicode code points, then get the bytes for each
  const charGroups = useMemo(() => {
    const encoder = new TextEncoder();
    return [...text].map(ch => ({
      char: ch,
      bytes: Array.from(encoder.encode(ch)),
    }));
  }, [text]);

  const [selected, setSelected] = useState<{ step: 1 | 2 | 3; index: number } | null>(null);

  const totalBytes = charGroups.reduce((s, g) => s + g.bytes.length, 0);
  const packedLetterCount = Math.ceil(totalBytes * 8 / 5);

  // Build per-character byte ranges and byte→char mapping
  const { charByteRanges, byteToChar } = useMemo(() => {
    const charByteRanges: Array<{ start: number; end: number }> = [];
    const byteToChar: number[] = [];
    let offset = 0;
    for (let ci = 0; ci < charGroups.length; ci++) {
      const len = charGroups[ci].bytes.length;
      charByteRanges.push({ start: offset, end: offset + len - 1 });
      for (let bi = 0; bi < len; bi++) byteToChar.push(ci);
      offset += len;
    }
    return { charByteRanges, byteToChar };
  }, [charGroups]);

  // Compute which indices to highlight in each step based on bit-level overlap.
  // Letter l covers bits [l*5, l*5+4]. Byte b covers bits [b*8, b*8+7].
  // Overlap when: l*5 <= b*8+7  AND  b*8 <= l*5+4.
  const highlights = useMemo(() => {
    const s1 = new Set<number>();
    const s2 = new Set<number>();
    const s3 = new Set<number>();
    if (!selected) return { s1, s2, s3 };

    if (selected.step === 1) {
      // Char selected → its bytes → letters overlapping those bytes
      s1.add(selected.index);
      const { start, end } = charByteRanges[selected.index];
      for (let b = start; b <= end; b++) s2.add(b);
    } else if (selected.step === 2) {
      // Byte selected → its char → letters overlapping this byte
      const b = selected.index;
      s2.add(b);
      s1.add(byteToChar[b]);
    } else {
      // Letter selected → bytes overlapping its 5-bit range → chars of those bytes
      s3.add(selected.index);
      const l = selected.index;
      const bMin = Math.max(0, Math.ceil((l * 5 - 7) / 8));
      const bMax = Math.min(totalBytes - 1, Math.floor((l * 5 + 4) / 8));
      for (let b = bMin; b <= bMax; b++) {
        s2.add(b);
        s1.add(byteToChar[b]);
      }
    }

    // From the s2 bytes, find all overlapping data letters (unless step 3 was clicked)
    if (selected.step !== 3) {
      for (const b of s2) {
        const lMin = Math.max(0, Math.ceil((b * 8 - 4) / 5));
        const lMax = Math.min(rawLetterNames.length - 1, Math.floor((b * 8 + 7) / 5));
        for (let l = lMin; l <= lMax; l++) s3.add(l);
      }
    }

    return { s1, s2, s3 };
  }, [selected, charByteRanges, byteToChar, totalBytes, rawLetterNames]);

  const hasHighlight = selected !== null;

  const toggle = (step: 1 | 2 | 3, index: number) =>
    setSelected(sel => sel?.step === step && sel.index === index ? null : { step, index });

  // Shared chip style (for Step 3 letter chips)
  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 5,
    padding: '0.18rem 0.32rem',
    fontFamily: 'monospace',
    lineHeight: 1.25,
  };

  // Box highlight style for Step 1 & 2 cards
  const cardStyle = (hl: boolean): React.CSSProperties => ({
    border: `1px solid ${hl ? colors.pipelineSelBorder : colors.glyphBtnBorder}`,
    borderRadius: 8,
    background: hl ? colors.pipelineSelBg : colors.glyphBtnBg,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    appearance: 'none' as const,
    font: 'inherit',
    color: 'inherit',
  });

  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
        Encoding pipeline
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        How your message is transformed into a propolis symbol, step by step.
        Each of the 32 data letters is identified by a shorthand character —{' '}
        <code>@</code> through <code>_</code> — a convenient label for the 32 possible 5-bit values (index&nbsp;+&nbsp;0x40).
        Click any box in steps 1–3 to highlight which boxes in the other steps it overlaps.
        {hasHighlight && (
          <> ·{' '}
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', padding: 0, fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >clear</button>
          </>
        )}
      </p>

      {/* ── Step 1: Characters → bytes ── */}
      <SectionHeading n={1} title="Characters → bytes" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {charGroups.map(({ char, bytes }, ci) => {
          const hl = hasHighlight && highlights.s1.has(ci);
          return (
            <button
              key={ci}
              onClick={() => toggle(1, ci)}
              style={{
                ...cardStyle(hl),
                padding: '0.45rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <div style={{ fontSize: '1.15rem', lineHeight: 1, minWidth: '1ch', minHeight: '1.15rem', textAlign: 'center' }}>
                {char}
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                {bytes.map((b, bi) => (
                  <span key={bi} style={{
                    fontFamily: 'monospace', fontWeight: 700,
                    fontSize: '0.8rem', color: 'var(--text)',
                  }}>
                    {b.toString(16).padStart(2, '0').toUpperCase()}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.15rem', paddingLeft: 2 }}>
        {charGroups.length} character{charGroups.length !== 1 ? 's' : ''} →{' '}
        {totalBytes} byte{totalBytes !== 1 ? 's' : ''}
      </div>

      <Arrow label="expand each byte to 8 bits" />

      {/* ── Step 2: Bytes → binary ── */}
      <SectionHeading n={2} title={`${totalBytes} bytes → ${totalBytes * 8} bits`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.25rem' }}>
        {charGroups.flatMap(({ bytes }, ci) =>
          bytes.map((b, bi) => {
            const globalByteIdx = charByteRanges[ci].start + bi;
            const hl = hasHighlight && highlights.s2.has(globalByteIdx);
            return (
              <button
                key={`${ci}-${bi}`}
                onClick={() => toggle(2, globalByteIdx)}
                style={{
                  ...cardStyle(hl),
                  padding: '0.35rem 0.45rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.8rem', color: 'var(--text)',
                }}>
                  {b.toString(16).padStart(2, '0').toUpperCase()}
                </span>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.54rem',
                  color: 'var(--text-dim)', letterSpacing: '0.01em',
                }}>
                  {b.toString(2).padStart(8, '0')}
                </span>
              </button>
            );
          })
        )}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.15rem', paddingLeft: 2 }}>
        {totalBytes * 8} bits total
      </div>

      <Arrow label={`read left-to-right in groups of 5 → ${packedLetterCount} letter${packedLetterCount !== 1 ? 's' : ''}`} />

      {/* ── Step 3: Data letters + check letters ── */}
      <SectionHeading n={3} title={`Data letters + check letters (${rawLetterNames.length} + ${checkLetterNames.length})`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', alignItems: 'center', marginBottom: '0.2rem' }}>
        {rawLetterNames.map((name, i) => {
          const val = name.charCodeAt(0) - 0x40;
          const hl = hasHighlight && highlights.s3.has(i);
          return (
            <button
              key={i}
              title={`'${name}' — data letter ${i + 1}/${rawLetterNames.length}, 5-bit value ${val} (${val.toString(2).padStart(5, '0')})`}
              onClick={() => toggle(3, i)}
              style={{
                ...chipBase,
                border: `1px solid ${hl ? colors.pipelineSelBorder : 'var(--border)'}`,
                background: hl ? colors.pipelineSelBg : colors.glyphBtnBg,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: hl ? colors.pipelineSelText : 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: '0.56rem', color: hl ? colors.pipelineSelText : 'var(--text-dim)', opacity: hl ? 0.8 : 1 }}>
                {val.toString(2).padStart(5, '0')}
              </span>
            </button>
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
                  title={`'${name}' — check letter ${i + 1}/${checkLetterNames.length}, error-detection redundancy appended before Hamming ECC`}
                  style={{
                    ...chipBase,
                    border: `1px solid ${colors.glyphBtnBorder}`,
                    background: colors.glyphBtnBg,
                    cursor: 'help',
                  }}
                >
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                  <span style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>
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
          <span> · {checkLetterNames.length} check (error-detection redundancy added before Hamming ECC)</span>
        )}
      </div>

      <Arrow label="Hamming ECC inserts parity bits within each block · criss-cross scrambles bits across blocks · whitening applies position-dependent substitution" />

      {/* ── Step 4: Metadata corners ── */}
      <SectionHeading n={4} title="6 metadata corners — placed directly, bypass ECC pipeline" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.2rem' }}>
        {cornerLetters.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <span
              title={`'${c.name}' — index ${c.index}, 5-bit ${c.index.toString(2).padStart(5, '0')}`}
              style={{
                ...chipBase,
                border: `1px solid ${colors.glyphBtnBorder}`,
                background: colors.glyphBtnBg,
                minWidth: 30,
                cursor: 'help',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>
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
        · hover over any cell in the symbol above to see its role
      </div>
    </section>
  );
}
