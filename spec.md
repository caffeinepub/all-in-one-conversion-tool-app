# Specification

## Summary
**Goal:** Update the Background Remover module to support a Paint-to-Select + Erase button workflow, allowing users to manually paint over areas they want to remove and then erase only those painted pixels.

**Planned changes:**
- Add a dedicated "Paint" button in the BrushToolPanel that activates paint/brush mode, highlighting painted areas with a semi-transparent red overlay.
- Add a dedicated "Erase" button that appears/becomes enabled only when the paint mask is non-empty (i.e., brush strokes exist on the canvas).
- Clicking "Erase" removes only the painted pixels — making them transparent for PNG output or replacing them with the selected solid color for JPG output — and updates the canvas and before/after preview immediately.
- Hide or disable the "Erase" button when no brush strokes have been painted.
- Style the "Erase" button using the existing `tool-btn` and teal/cyan accent CSS classes consistent with the glassmorphism design system.
- Keep the existing Auto Detect and Remove Background flow in RemovalPanel.tsx unchanged.
- Preserve the existing brush undo functionality and erase-mode toggle (for unpainting strokes).

**User-visible outcome:** Users can manually paint over any region of an image in the Background Remover, then click the "Erase" button to remove only that painted area, giving them precise manual control over which parts of the image are erased.
