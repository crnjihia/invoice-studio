# ADR 0004: Using webContents.printToPDF vs. Third-Party PDF Libraries

## Status
Accepted

## Context
Invoice Studio requires a robust, pixel-perfect, deterministic PDF generation engine to export invoices. Freelancers need professional invoices with customized branding, color schemes, tabular breakdowns, M-Pesa routing blocks, and reliable multi-page pagination.

Two primary architectural options were evaluated:
1. **Third-Party PDF Library (e.g., PDFKit, jsPDF, Puppeteer)**: Generating PDFs imperatively in Node.js via coordinate-based rendering (`doc.text(x, y)`).
2. **Native Electron `webContents.printToPDF`**: Rendering HTML/CSS templates within an off-screen, locked-down, sandboxed `BrowserWindow` and generating standard A4 PDFs using Chromium's native Blink print pipeline.

## Decision
We chose **Chromium's native `webContents.printToPDF`** in an off-screen, locked-down `BrowserWindow`.

## Rationale
1. **Modern CSS vs Coordinate Math**: Layouts with tables, tax lines, dynamic multi-line item descriptions, and status badges are straightforward to author in HTML/CSS with standard responsive and print rules (`@page`, `@media print`, `break-inside: avoid`). Coordinate-based libraries require complex manual cursor management, font measurement, and tedious manual table wrapping.
2. **Zero Native Canvas / C++ Dependencies**: Libraries like PDFKit or jsPDF frequently require native node-canvas bindings for image manipulation and font rendering, introducing cross-platform compilation vulnerabilities, ABI conflicts, and build fragility across Windows, macOS, and Linux.
3. **Typography & Styling Fidelity**: Chromium's print pipeline supports modern fonts, SVG icons, and precise decimal sizing with identical output across all operating systems.
4. **Security & Isolation**: The off-screen window is instantiated with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, and strict CSP, rendering only locally generated, sanitized HTML without network exposure. The window is immediately destroyed upon PDF buffer emission.

## Consequences
- **Positive**: Clean template maintainability, pixel-perfect print layout, reliable page breaking, zero extra npm runtime bloat.
- **Negative**: Spawning a hidden BrowserWindow incurs a slight ephemeral memory footprint during generation (~25-50ms). This is mitigated by pooling or immediate destruction.

