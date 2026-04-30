import { useEffect, useMemo, useRef, useState } from 'react';

interface ComparisonPair {
  id: string;
  label: string;
  cpp: string;
  web: string;
  hmapComparison?: string;
}

interface Manifest {
  pairs: ComparisonPair[];
}

interface ImageInfo {
  width: number;
  height: number;
  data: ImageData;
}

interface DiffStats {
  status: 'idle' | 'loading' | 'ready' | 'error';
  dimensionsMatch: boolean;
  width: number;
  height: number;
  differingPixels: number;
  totalPixels: number;
  percentDifferent: number;
  meanChannelDelta: number;
  maxChannelDelta: number;
  message?: string;
}

type ViewMode = 'side-by-side' | 'overlay' | 'difference' | 'hmap';

interface HMapComparisonRow {
  x: number;
  y: number;
  cpp?: number;
  web?: number;
  status: 'match' | 'mismatch' | 'missing-cpp' | 'missing-web';
}

interface HMapComparison {
  rows: HMapComparisonRow[];
  total: number;
  matches: number;
  mismatches: number;
  missingCpp: number;
  missingWeb: number;
}

const emptyStats: DiffStats = {
  status: 'idle',
  dimensionsMatch: false,
  width: 0,
  height: 0,
  differingPixels: 0,
  totalPixels: 0,
  percentDifferent: 0,
  meanChannelDelta: 0,
  maxChannelDelta: 0,
};

function loadImageData(src: string): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Unable to create canvas context.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        width: canvas.width,
        height: canvas.height,
        data: ctx.getImageData(0, 0, canvas.width, canvas.height),
      });
    };
    img.onerror = () => reject(new Error(`Unable to load ${src}`));
    img.src = src;
  });
}

function diffImages(cpp: ImageInfo, web: ImageInfo): DiffStats {
  const dimensionsMatch = cpp.width === web.width && cpp.height === web.height;
  if (!dimensionsMatch) {
    return {
      ...emptyStats,
      status: 'ready',
      dimensionsMatch,
      width: Math.max(cpp.width, web.width),
      height: Math.max(cpp.height, web.height),
      message: `Dimension mismatch: C++ is ${cpp.width}x${cpp.height}, web is ${web.width}x${web.height}.`,
    };
  }

  const cppData = cpp.data.data;
  const webData = web.data.data;
  let differingPixels = 0;
  let totalDelta = 0;
  let maxChannelDelta = 0;

  for (let i = 0; i < cppData.length; i += 4) {
    const r = Math.abs(cppData[i] - webData[i]);
    const g = Math.abs(cppData[i + 1] - webData[i + 1]);
    const b = Math.abs(cppData[i + 2] - webData[i + 2]);
    const a = Math.abs(cppData[i + 3] - webData[i + 3]);
    const pixelDelta = Math.max(r, g, b, a);
    if (pixelDelta > 0) differingPixels++;
    totalDelta += r + g + b + a;
    maxChannelDelta = Math.max(maxChannelDelta, pixelDelta);
  }

  const totalPixels = cpp.width * cpp.height;
  return {
    status: 'ready',
    dimensionsMatch,
    width: cpp.width,
    height: cpp.height,
    differingPixels,
    totalPixels,
    percentDifferent: totalPixels === 0 ? 0 : (differingPixels / totalPixels) * 100,
    meanChannelDelta: totalPixels === 0 ? 0 : totalDelta / (totalPixels * 4),
    maxChannelDelta,
  };
}

function renderDiffCanvas(canvas: HTMLCanvasElement | null, pair: ComparisonPair) {
  if (!canvas) return;

  Promise.all([loadImageData(pair.cpp), loadImageData(pair.web)])
    .then(([cpp, web]) => {
      const width = Math.max(cpp.width, web.width);
      const height = Math.max(cpp.height, web.height);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      if (cpp.width !== web.width || cpp.height !== web.height) {
        ctx.globalAlpha = 0.55;
        ctx.putImageData(cpp.data, 0, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.putImageData(web.data, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        return;
      }

      const diff = ctx.createImageData(width, height);
      const diffData = diff.data;
      const cppData = cpp.data.data;
      const webData = web.data.data;
      for (let i = 0; i < cppData.length; i += 4) {
        const delta = Math.max(
          Math.abs(cppData[i] - webData[i]),
          Math.abs(cppData[i + 1] - webData[i + 1]),
          Math.abs(cppData[i + 2] - webData[i + 2]),
          Math.abs(cppData[i + 3] - webData[i + 3]),
        );
        if (delta === 0) {
          diffData[i] = 245;
          diffData[i + 1] = 247;
          diffData[i + 2] = 250;
          diffData[i + 3] = 255;
        } else {
          diffData[i] = 220;
          diffData[i + 1] = Math.max(0, 80 - delta);
          diffData[i + 2] = 70;
          diffData[i + 3] = 255;
        }
      }
      ctx.putImageData(diff, 0, 0);
    })
    .catch(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 640;
      canvas.height = 360;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9b1c31';
      ctx.font = '16px sans-serif';
      ctx.fillText('Unable to render difference image.', 24, 42);
    });
}

function useDiffStats(pair: ComparisonPair | undefined): DiffStats {
  const [stats, setStats] = useState<DiffStats>(emptyStats);

  useEffect(() => {
    let cancelled = false;
    if (!pair) {
      setStats(emptyStats);
      return;
    }

    setStats({ ...emptyStats, status: 'loading' });
    Promise.all([loadImageData(pair.cpp), loadImageData(pair.web)])
      .then(([cpp, web]) => {
        if (!cancelled) setStats(diffImages(cpp, web));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStats({
            ...emptyStats,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to compare images.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pair]);

  return stats;
}

function useHMapComparison(pair: ComparisonPair | undefined) {
  const [comparison, setComparison] = useState<HMapComparison | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setComparison(null);
    setMessage('');

    if (!pair?.hmapComparison) {
      setMessage('No hmap comparison was generated for this pair.');
      return;
    }

    fetch(pair.hmapComparison, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load hmap comparison.');
        return res.json() as Promise<HMapComparison>;
      })
      .then((nextComparison) => {
        if (!cancelled) setComparison(nextComparison);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Unable to load hmap comparison.');
      });

    return () => {
      cancelled = true;
    };
  }, [pair]);

  return { comparison, message };
}

export function App() {
  const [manifest, setManifest] = useState<Manifest>({ pairs: [] });
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<ViewMode>('side-by-side');
  const [opacity, setOpacity] = useState(0.5);
  const [error, setError] = useState('');
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetch('/comparisons/manifest.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load comparison manifest.');
        return res.json() as Promise<Manifest>;
      })
      .then((nextManifest) => {
        setManifest(nextManifest);
        setSelectedId(nextManifest.pairs[0]?.id ?? '');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load comparison manifest.');
      });
  }, []);

  const selectedPair = useMemo(
    () => manifest.pairs.find((pair) => pair.id === selectedId),
    [manifest.pairs, selectedId],
  );
  const stats = useDiffStats(selectedPair);
  const { comparison: hmapComparison, message: hmapMessage } = useHMapComparison(selectedPair);

  useEffect(() => {
    if (selectedPair && mode === 'difference') {
      renderDiffCanvas(diffCanvasRef.current, selectedPair);
    }
  }, [selectedPair, mode]);

  const isExactMatch = stats.status === 'ready' && stats.dimensionsMatch && stats.differingPixels === 0;

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>Propolis Output Compare</h1>
          <p>Internal C++ vs web PNG inspection.</p>
        </div>
        <div className={isExactMatch ? 'badge match' : 'badge'}>
          {stats.status === 'loading'
            ? 'Comparing'
            : isExactMatch
              ? 'Exact pixel match'
              : 'Needs inspection'}
        </div>
      </header>

      <section className="controls" aria-label="Comparison controls">
        <label>
          Pair
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {manifest.pairs.map((pair) => (
              <option key={pair.id} value={pair.id}>{pair.label}</option>
            ))}
          </select>
        </label>

        <div className="segmented" aria-label="View mode">
          <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => setMode('side-by-side')}>
            Side by side
          </button>
          <button className={mode === 'overlay' ? 'active' : ''} onClick={() => setMode('overlay')}>
            Overlay
          </button>
          <button className={mode === 'difference' ? 'active' : ''} onClick={() => setMode('difference')}>
            Difference
          </button>
          <button className={mode === 'hmap' ? 'active' : ''} onClick={() => setMode('hmap')}>
            HMap
          </button>
        </div>

        {mode === 'overlay' && (
          <label>
            Web opacity
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>
        )}
      </section>

      {error && <p className="notice error">{error}</p>}

      {!error && manifest.pairs.length === 0 && (
        <section className="empty">
          <h2>No image pairs yet</h2>
          <p>Add PNGs with matching basenames to <code>public/comparisons/cpp</code> and <code>public/comparisons/web</code>, then run the manifest script.</p>
        </section>
      )}

      {selectedPair && (
        <>
          <section className="stats" aria-label="Pixel comparison statistics">
            <div>
              <span>Dimensions</span>
              <strong>{stats.width > 0 ? `${stats.width} x ${stats.height}` : '...'}</strong>
            </div>
            <div>
              <span>Different pixels</span>
              <strong>{stats.status === 'ready' ? stats.differingPixels.toLocaleString() : '...'}</strong>
            </div>
            <div>
              <span>Different</span>
              <strong>{stats.status === 'ready' ? `${stats.percentDifferent.toFixed(4)}%` : '...'}</strong>
            </div>
            <div>
              <span>Mean channel delta</span>
              <strong>{stats.status === 'ready' ? stats.meanChannelDelta.toFixed(3) : '...'}</strong>
            </div>
            <div>
              <span>Max delta</span>
              <strong>{stats.status === 'ready' ? stats.maxChannelDelta : '...'}</strong>
            </div>
          </section>

          {stats.message && <p className="notice">{stats.message}</p>}

          {mode === 'side-by-side' && (
            <section className="image-grid">
              <figure>
                <figcaption>C++ reference</figcaption>
                <img src={selectedPair.cpp} alt={`${selectedPair.label} generated by C++`} />
              </figure>
              <figure>
                <figcaption>Web output</figcaption>
                <img src={selectedPair.web} alt={`${selectedPair.label} generated by web app`} />
              </figure>
            </section>
          )}

          {mode === 'overlay' && (
            <section className="overlay-stage">
              <img src={selectedPair.cpp} alt={`${selectedPair.label} generated by C++`} />
              <img
                src={selectedPair.web}
                alt={`${selectedPair.label} generated by web app`}
                style={{ opacity }}
              />
            </section>
          )}

          {mode === 'difference' && (
            <section className="diff-stage">
              <canvas ref={diffCanvasRef} aria-label="Pixel difference image" />
            </section>
          )}

          {mode === 'hmap' && (
            <section className="hmap-stage">
              {hmapMessage && <p className="notice">{hmapMessage}</p>}
              {hmapComparison && (
                <>
                  <div className="hmap-summary">
                    <div><span>Total</span><strong>{hmapComparison.total.toLocaleString()}</strong></div>
                    <div><span>Matches</span><strong>{hmapComparison.matches.toLocaleString()}</strong></div>
                    <div><span>Mismatches</span><strong>{hmapComparison.mismatches.toLocaleString()}</strong></div>
                    <div><span>Missing C++</span><strong>{hmapComparison.missingCpp.toLocaleString()}</strong></div>
                    <div><span>Missing Web</span><strong>{hmapComparison.missingWeb.toLocaleString()}</strong></div>
                  </div>
                  <table className="hmap-table">
                    <thead>
                      <tr>
                        <th>x</th>
                        <th>y</th>
                        <th>C++</th>
                        <th>Web</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hmapComparison.rows
                        .filter((row) => row.status !== 'match')
                        .slice(0, 500)
                        .map((row) => (
                          <tr key={`${row.x},${row.y}`} className={row.status}>
                            <td>{row.x}</td>
                            <td>{row.y}</td>
                            <td>{row.cpp ?? '-'}</td>
                            <td>{row.web ?? '-'}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
