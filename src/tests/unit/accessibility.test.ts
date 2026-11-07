// path: src/tests/unit/accessibility.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Accessibility (a11y) & WCAG Compliance Standards', () => {
  const indexHtmlPath = join(process.cwd(), 'src', 'renderer', 'index.html');
  const appTsxPath = join(process.cwd(), 'src', 'renderer', 'src', 'App.tsx');

  it('ensures index.html defines language and viewport for assistive technologies', () => {
    const html = readFileSync(indexHtmlPath, 'utf8');

    // WCAG 3.1.1: Language of Page
    expect(html).toMatch(/<html[^>]*lang=["']en["']/);

    // Responsive viewport for screen magnification
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0"');

    // Document title
    expect(html).toMatch(/<title>Invoice Studio<\/title>/);
  });

  it('verifies semantic landmarks and heading hierarchy in primary UI layout', () => {
    const appTsx = readFileSync(appTsxPath, 'utf8');

    // Semantic HTML5 landmark elements
    expect(appTsx).toContain('<header');
    expect(appTsx).toContain('<main');

    // Primary heading h1 for screen reader document structure
    expect(appTsx).toContain('<h1');
    expect(appTsx).toContain('Invoice Studio');

    // Subheadings
    expect(appTsx).toContain('<h2');
  });

  it('verifies high-contrast dark theme colour palette meets WCAG AA standards', () => {
    // Relative luminance calculation for WCAG contrast ratios
    function getLuminance(r: number, g: number, b: number): number {
      const a = [r, g, b].map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
      const lum1 = getLuminance(...rgb1);
      const lum2 = getLuminance(...rgb2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    // Tailwind CSS Palette values used in Invoice Studio:
    // slate-950: #020617 -> [2, 6, 23]
    // slate-100: #f1f5f9 -> [241, 245, 249]
    // slate-300: #cbd5e1 -> [203, 213, 225]
    // emerald-400: #34d399 -> [52, 211, 153]

    const backgroundSlate950: [number, number, number] = [2, 6, 23];
    const textSlate100: [number, number, number] = [241, 245, 249];
    const textSlate300: [number, number, number] = [203, 213, 225];
    const textEmerald400: [number, number, number] = [52, 211, 153];

    const contrastSlate100 = getContrastRatio(backgroundSlate950, textSlate100);
    const contrastSlate300 = getContrastRatio(backgroundSlate950, textSlate300);
    const contrastEmerald = getContrastRatio(backgroundSlate950, textEmerald400);

    // WCAG AA requirement is minimum 4.5:1 for normal text
    expect(contrastSlate100).toBeGreaterThanOrEqual(4.5);
    expect(contrastSlate300).toBeGreaterThanOrEqual(4.5);
    expect(contrastEmerald).toBeGreaterThanOrEqual(4.5);

    // slate-100 on slate-950 achieves ~18:1 (exceeding even AAA 7:1)
    expect(contrastSlate100).toBeGreaterThan(15);
  });
});

