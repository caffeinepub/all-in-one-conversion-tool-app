# Specification

## Summary
**Goal:** Overhaul the PDF Scanner component by replacing the live camera with a file picker, adding automatic edge detection and perspective crop, per-page image adjustments, a multi-page thumbnail list, and a full scan-to-PDF export workflow.

**Planned changes:**
- Remove the "Live Scanner" camera button and all camera/getUserMedia/video-element code from PDFScanner.tsx.
- Add a "Choose from Files" button (labeled "Choose from Files (Google Files / Scanner)" on mobile) that opens a native file picker accepting JPG, PNG, JPEG, WEBP, and PDF files.
- Selected image files are added directly as scanned page entries; selected PDFs have each page rendered via PDF.js (CDN) and appended as individual entries.
- After import, automatically detect document edges on each image using Canvas-based pixel contrast analysis and apply an automatic perspective crop as the default preview.
- Provide a "Manual Crop" fallback mode with draggable corner handles, an "Apply Crop" button to confirm, and a "Reset" button to revert to the uncropped original.
- Add per-page independent Brightness slider (−100 to +100), Contrast slider (−100 to +100), and a "Darken Text" toggle that applies a Canvas threshold filter; all adjustments update the preview in real time and are stored per page.
- Display a scanned pages thumbnail list showing page numbers and a ✕ remove button per page; users can append more pages at any time.
- Add a "Convert to PDF" button that applies each page's crop and adjustment settings and generates a single PDF using pdf-lib (CDN), with a loading/progress indicator during generation.
- After generation, show a "Download PDF" button that triggers a browser file download.
- Add a filename input pre-filled with "scanned-document.pdf"; append ".pdf" automatically if omitted, and block download if the field is empty.
- Apply the existing dark-first glassmorphism design system (glass-card surfaces, tool-btn buttons, teal/cyan accents) to all new/updated UI elements; ensure full mobile-responsive vertical stacking.

**User-visible outcome:** Users can import images or PDFs from their device, have document edges auto-cropped, adjust brightness/contrast/text darkness per page, manage a multi-page list, and export the final result as a named PDF file — all without any camera access.
