export type Theme = 'dark' | 'light' | 'system';

export interface ThemeColors {
  // SVG renderer: full propolis symbol
  symbolOn: string;
  symbolOff: string;
  symbolBg: string;
  // SVG renderer: individual letter glyphs
  glyphOn: string;
  glyphOff: string;
  glyphHighOn: string;
  glyphHighOff: string;
  // Component backgrounds
  symbolContainerBg: string;
  glyphBtnBg: string;
  glyphBtnHighBg: string;
  glyphBtnBorder: string;
  glyphBtnHighBorder: string;
  glyphLabelColor: string;
  glyphLabelHighColor: string;
  // Pipeline step selection highlight (distinct from ECC/corner amber)
  pipelineSelBg: string;
  pipelineSelBorder: string;
  pipelineSelText: string;
  // Symbol cell rendering style
  symbolDotShape: 'circle' | 'hexagon';
  symbolDotRadius: number;
}

/** Resolve 'system' to the actual applied theme based on OS preference. */
export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const themeColors: Record<'dark' | 'light', ThemeColors> = {
  dark: {
    symbolOn: '#d0d0ff',
    symbolOff: '#1e1e38',
    symbolBg: '#1e1e38',  // matches symbolOff so no visible border between cells

    glyphOn: '#c8c8ff',
    glyphOff: '#22223c',
    glyphHighOn: '#b0b0ff',
    glyphHighOff: '#1e1e3a',

    symbolContainerBg: '#1e1e38',
    glyphBtnBg: '#0e0e20',
    glyphBtnHighBg: '#16163a',
    glyphBtnBorder: '#2a2a44',
    glyphBtnHighBorder: '#5a5ab8',
    glyphLabelColor: '#6060a0',
    glyphLabelHighColor: '#b0b0ff',

    // Pipeline selection: indigo-purple, distinct from the pink ECC/corner palette
    pipelineSelBg: '#16163a',
    pipelineSelBorder: '#5a5ab8',
    pipelineSelText: '#c8c8ff',

    // Hexagonal cells at exact Voronoi tiling size (circumradius = 1/√3, no gaps)
    symbolDotShape: 'hexagon',
    symbolDotRadius: 1 / Math.sqrt(3),
  },
  light: {
    // Filled cells: near-black dark brown — the dark pattern, like Pierre's PS output
    symbolOn: '#1c0800',
    // Empty cells: bright warm gold — the open honeycomb background
    symbolOff: '#f59e0b',
    // Wax between cells: medium amber
    symbolBg: '#c47a0a',

    glyphOn: '#92400e',      // rich dark amber — readable at small sizes
    glyphOff: '#e8c27a',     // light honey — visible grid, not distracting
    glyphHighOn: '#7c2d12',  // deep burnt amber when selected
    glyphHighOff: '#fcd34d', // bright honey highlight

    symbolContainerBg: '#fde68a',
    glyphBtnBg: '#fef9e8',
    glyphBtnHighBg: '#fde68a',
    glyphBtnBorder: '#d97706',
    glyphBtnHighBorder: '#b45309',
    glyphLabelColor: '#b45309',
    glyphLabelHighColor: '#7c2d12',

    // Pipeline selection: amber highlight (now distinct since ECC/corners are neutral)
    pipelineSelBg: '#fde68a',
    pipelineSelBorder: '#b45309',
    pipelineSelText: '#7c2d12',

    // Circular dots at normal size
    symbolDotShape: 'circle',
    symbolDotRadius: 0.44,
  },
};
