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
    symbolBg: '#080812',

    glyphOn: '#c8c8ff',
    glyphOff: '#22223c',
    glyphHighOn: '#ff6b9d',
    glyphHighOff: '#38182e',

    symbolContainerBg: '#080812',
    glyphBtnBg: '#0e0e20',
    glyphBtnHighBg: '#1e101c',
    glyphBtnBorder: '#2a2a44',
    glyphBtnHighBorder: '#ff6b9d55',
    glyphLabelColor: '#6060a0',
    glyphLabelHighColor: '#ff6b9d',
  },
  light: {
    // Capped cells: bright warm gold — like wax-sealed honey
    symbolOn: '#f59e0b',
    // Empty holes: near-black dark brown — looking into an empty cell
    symbolOff: '#1c0800',
    // Wax between cells: medium amber — closer to capped cell color per spec
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
  },
};
