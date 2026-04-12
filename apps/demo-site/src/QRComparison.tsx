import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { renderToSVG } from '@propolis-tools/renderer';
import type { ThemeColors } from './theme.js';
import type { EncodeResult } from './encode.js';

// QR byte-mode capacity per version (1–40) at each error-correction level (ISO 18004)
const QR_BYTES: Record<'L' | 'M' | 'Q' | 'H', number[]> = {
  L: [
     17,  32,  53,  78, 106, 134, 154, 192, 230, 271,
    321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
    929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732,
   1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953,
  ],
  M: [
     14,  26,  42,  62,  84, 106, 122, 152, 180, 213,
    251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
    711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370,
   1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
  ],
  Q: [
     11,  20,  32,  46,  60,  74,  86, 108, 130, 151,
    177, 203, 241, 258, 292, 322, 364, 394, 442, 482,
    509, 565, 611, 661, 715, 751, 805, 868, 908, 982,
   1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663,
  ],
  H: [
      7,  14,  24,  34,  44,  58,  64,  84,  98, 119,
    137, 155, 177, 194, 220, 250, 280, 310, 338, 382,
    403, 439, 461, 511, 535, 593, 625, 658, 698, 742,
    790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273,
  ],
};

const QR_LEVEL_LABELS: Record<'L' | 'M' | 'Q' | 'H', string> = {
  L: 'L — ~7% recovery',
  M: 'M — ~15% recovery',
  Q: 'Q — ~25% recovery',
  H: 'H — ~30% recovery',
};

function qrVersion(bytes: number, level: 'L' | 'M' | 'Q' | 'H'): number {
  const table = QR_BYTES[level];
  const v = table.findIndex(cap => cap >= Math.max(bytes, 1));
  return v === -1 ? 40 : v + 1;
}

interface Props {
  text: string;
  result: EncodeResult;
  colors: ThemeColors;
  applied: 'dark' | 'light';
  qrLevel: 'L' | 'M' | 'Q' | 'H';
  onQrLevelChange: (level: 'L' | 'M' | 'Q' | 'H') => void;
}

/** Parse a SVG viewBox string and return { w, h } */
function parseViewBox(svg: string): { w: number; h: number } | null {
  const m = svg.match(/viewBox="[^"]*?\s+[^"]*?\s+([0-9.]+)\s+([0-9.]+)"/);
  if (!m) return null;
  return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
}

const DISPLAY_SIZE = 260;

export function QRComparison({ text, result, colors, applied, qrLevel, onQrLevelChange }: Props) {
  const [qrSvg, setQrSvg] = useState('');

  const qrDark  = applied === 'light' ? '#1c0800' : '#d0d0ff';
  const qrLight = applied === 'light' ? '#fef9e8' : '#080812';

  useEffect(() => {
    if (!text) { setQrSvg(''); return; }
    QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: qrLevel,
      margin: 2,
      color: { dark: qrDark, light: qrLight },
    }).then(setQrSvg).catch(() => setQrSvg(''));
  }, [text, qrDark, qrLight, qrLevel]);

  // Render propolis SVG at comparison quality
  const propolisSvg = useMemo(() =>
    renderToSVG(result.letters, {
      dotRadius: 0.44,
      gridSpacing: 1,
      colorOn: colors.symbolOn,
      colorOff: colors.symbolOff,
      background: colors.symbolBg,
      padding: 2.0,
      showOff: true,
    }),
  [result.letters, colors]);

  // ── Compute comparison stats ──────────────────────────────────────────
  const bytes = result.bytesEncoded || 1;

  // Propolis bounding area (grid units²) from SVG viewBox
  const pvb = parseViewBox(propolisSvg);
  const propoArea = pvb ? pvb.w * pvb.h : null;

  // QR: find version that fits same payload
  const qrV = qrVersion(bytes, qrLevel);
  const qrModules = 4 * qrV + 17;  // modules per side (no quiet zone)
  const qrArea = qrModules * qrModules; // modules²

  // Hex packing is ~15.5% more space-efficient than square for same dot pitch:
  //   circle-in-hex: π/(2√3) ≈ 90.69 %  vs  circle-in-square: π/4 ≈ 78.54 %
  // To compare areas fairly we scale propolis area by this factor.
  const HEX_ADVANTAGE = Math.PI / (2 * Math.sqrt(3)) / (Math.PI / 4); // ≈ 1.155
  const propoEquivArea = propoArea ? propoArea * HEX_ADVANTAGE : null;

  const areaRatio = (propoEquivArea && qrArea)
    ? propoEquivArea / qrArea
    : null;

  const qrCapacity = QR_BYTES[qrLevel][qrV - 1];

  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Propolis vs QR Code</h2>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>same message, same display size</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>QR ECC</span>
          {(['L', 'M', 'Q', 'H'] as const).map(level => (
            <button
              key={level}
              onClick={() => onQrLevelChange(level)}
              title={QR_LEVEL_LABELS[level]}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: 5,
                border: `1px solid ${qrLevel === level ? 'var(--accent)' : 'var(--border)'}`,
                background: qrLevel === level ? 'var(--surface)' : 'transparent',
                color: qrLevel === level ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: qrLevel === level ? 600 : 400,
                transition: 'all 0.12s',
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
        QR uses a square grid — propolis uses a hexagonal lattice, which packs dots ~15% more
        efficiently at the same pitch and handles scan angles differently.
      </p>

      {/* ── Side-by-side symbols ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>

        {/* Propolis */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Propolis
          </div>
          <div style={{
            width: DISPLAY_SIZE,
            height: DISPLAY_SIZE,
            borderRadius: 12,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.symbolBg,
          }}>
            <div
              style={{ width: '100%', height: '100%' }}
              dangerouslySetInnerHTML={{ __html: propolisSvg }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Hexagonal · radius {result.radius} · {result.letters.length} letters
          </div>
        </div>

        {/* QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            QR Code
          </div>
          <div style={{
            width: DISPLAY_SIZE,
            height: DISPLAY_SIZE,
            borderRadius: 12,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: qrLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {qrSvg
              ? <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
              : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>generating…</span>
            }
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Square · version {qrV} · {qrModules}×{qrModules} modules
          </div>
        </div>
      </div>

      {/* ── Stats table ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.75rem',
      }}>
        {[
          {
            label: 'Grid type',
            propolis: 'Hexagonal',
            qr: 'Square',
            note: 'Hex cells have 6 equal neighbors; square cells have only 4',
          },
          {
            label: 'Module grid',
            propolis: pvb ? `${pvb.w.toFixed(0)}×${pvb.h.toFixed(0)} units` : '—',
            qr: `${qrModules}×${qrModules} modules`,
            note: 'Bounding box of the rendered symbol at equal dot pitch',
          },
          {
            label: `Capacity (ECC ${qrLevel})`,
            propolis: `${result.byteCapacity} bytes`,
            qr: `${qrCapacity} bytes`,
            note: `How many bytes this size symbol can hold at ECC level ${qrLevel}`,
          },
          {
            label: 'Hex packing gain',
            propolis: '+15.5% vs square',
            qr: 'baseline',
            note: 'Hexagonal close-packing fills ~90.7% of space vs ~78.5% for square grids',
          },
          {
            label: 'Scan angle tolerance',
            propolis: '6-fold symmetry',
            qr: '4-fold symmetry',
            note: 'Propolis has more rotation symmetry — potentially better at oblique angles',
          },
          {
            label: 'Equivalent area',
            propolis: propoEquivArea ? `${propoEquivArea.toFixed(0)} sq units` : '—',
            qr: `${qrArea} sq units`,
            note: areaRatio
              ? areaRatio < 1
                ? `Propolis is ${((1 - areaRatio) * 100).toFixed(0)}% smaller for this message`
                : `Propolis is ${((areaRatio - 1) * 100).toFixed(0)}% larger for this message`
              : 'Area in square units at same dot pitch, hex-adjusted',
          },
        ].map(row => (
          <div key={row.label} style={{
            background: 'var(--surface)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            padding: '0.75rem 0.875rem',
            fontSize: '0.8rem',
          }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
              {row.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', marginBottom: '0.4rem' }}>
              <div>
                <span style={{ color: 'var(--accent)', fontSize: '0.68rem', fontWeight: 600 }}>Propolis </span>
                <span style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.propolis}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', fontWeight: 600 }}>QR </span>
                <span style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.qr}</span>
              </div>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', lineHeight: 1.5, opacity: 0.8 }}>{row.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
