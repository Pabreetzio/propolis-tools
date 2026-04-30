import { useMemo, useState } from 'react';
import type { EncodeResult } from '@propolis-tools/core';
import type { ThemeColors } from './theme.js';

interface Props {
  result: EncodeResult;
  colors: ThemeColors;
}

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

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function unitBitWidth(mode: number | undefined): number {
  if (mode === 7) return 7;
  if (mode === 8) return 8;
  if (mode === 10) return 10;
  return 5;
}

export function EncodingPipeline({ result, colors }: Props) {
  const { pipeline } = result;
  if (!pipeline) return null;

  const {
    rawLetterNames,
    checkLetterNames,
    cornerLetters,
    encodingLabel,
    encodingMode,
    sourceUnits = [],
    sourceUnitLabel = 'Input units',
    packingDescription = 'pack input into the 5-bit Propolis letter stream',
  } = pipeline;

  const [selected, setSelected] = useState<{ step: 1 | 2; index: number } | null>(null);
  const width = unitBitWidth(encodingMode);

  const unitRanges = useMemo(() => {
    return sourceUnits.map((_, i) => ({
      start: i * width,
      end: i * width + width - 1,
    }));
  }, [sourceUnits, width]);

  const highlights = useMemo(() => {
    const s1 = new Set<number>();
    const s2 = new Set<number>();
    if (!selected) return { s1, s2 };

    if (selected.step === 1) {
      s1.add(selected.index);
      const unit = unitRanges[selected.index];
      if (unit) {
        rawLetterNames.forEach((_, i) => {
          if (rangesOverlap(unit.start, unit.end, i * 5, i * 5 + 4)) s2.add(i);
        });
      }
    } else {
      s2.add(selected.index);
      const letterStart = selected.index * 5;
      const letterEnd = letterStart + 4;
      unitRanges.forEach((unit, i) => {
        if (rangesOverlap(unit.start, unit.end, letterStart, letterEnd)) s1.add(i);
      });
    }

    return { s1, s2 };
  }, [selected, unitRanges, rawLetterNames]);

  const hasHighlight = selected !== null;
  const toggle = (step: 1 | 2, index: number) =>
    setSelected(sel => sel?.step === step && sel.index === index ? null : { step, index });

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 5,
    padding: '0.18rem 0.32rem',
    fontFamily: 'monospace',
    lineHeight: 1.25,
  };

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
        Each of the 32 data letters is identified by a shorthand character from <code>@</code> through <code>_</code>.
        Click a box in steps 1 or 2 to highlight the overlapping data flow.
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

      <SectionHeading n={1} title={`${sourceUnitLabel} (${encodingLabel ?? 'selected format'})`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {sourceUnits.map((unit, i) => {
          const hl = hasHighlight && highlights.s1.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(1, i)}
              title={unit.detail}
              style={{
                ...cardStyle(hl),
                padding: '0.45rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
                {unit.value}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', minHeight: '1em' }}>
                {unit.label}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.15rem', paddingLeft: 2 }}>
        {sourceUnits.length} unit{sourceUnits.length !== 1 ? 's' : ''} in {encodingLabel ?? 'the selected format'}
      </div>

      <Arrow label={`${packingDescription} -> ${rawLetterNames.length} data letter${rawLetterNames.length !== 1 ? 's' : ''}`} />

      <SectionHeading n={2} title={`${encodingLabel ?? 'Data'} letters + check letters (${rawLetterNames.length} + ${checkLetterNames.length})`} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', alignItems: 'center', marginBottom: '0.2rem' }}>
        {rawLetterNames.map((name, i) => {
          const val = name.charCodeAt(0) - 0x40;
          const hl = hasHighlight && highlights.s2.has(i);
          return (
            <button
              key={i}
              title={`'${name}' - data letter ${i + 1}/${rawLetterNames.length}, 5-bit value ${val} (${val.toString(2).padStart(5, '0')})`}
              onClick={() => toggle(2, i)}
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
            }} title="Check letters start here">|</span>
            {checkLetterNames.map((name, i) => {
              const val = name.charCodeAt(0) - 0x40;
              return (
                <span
                  key={i}
                  title={`'${name}' - check letter ${i + 1}/${checkLetterNames.length}, error-detection redundancy appended before Hamming ECC`}
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

      <SectionHeading n={3} title="6 metadata corners - placed directly, bypass ECC pipeline" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.2rem' }}>
        {cornerLetters.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <span
              title={`'${c.name}' - index ${c.index}, 5-bit ${c.index.toString(2).padStart(5, '0')}`}
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

      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', paddingLeft: 2 }}>
        {'->'} <strong style={{ fontStyle: 'normal', color: 'var(--text)' }}>{result.letters.length} letters</strong> placed in the symbol above
        · {result.dataSlots} data/ECC slots · 6 metadata corners · {result.letters.length - result.dataSlots - 6} border letters
        · hover over any cell in the symbol above to see its role
      </div>
    </section>
  );
}
