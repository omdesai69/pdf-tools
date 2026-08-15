# TODO — Multi-Phase Implementation Roadmap

## Milestone 1: Interactive Visual PDF Canvas & Page Organizer (Completed)
- [x] Install `pdfjs-dist` for high-fidelity client-side PDF rendering.
- [x] Build `<VisualPageGrid />` component:
  - [x] Render canvas thumbnails for all pages of any loaded PDF.
  - [x] Drag-and-drop page reordering.
  - [x] Per-page 🔄 Rotate button.
  - [x] Per-page 🗑️ Delete button.
  - [x] Visual page selection checkbox for Split/Extract.
- [x] Connect `<VisualPageGrid />` seamlessly into `src/app/tools/[toolId]/page.tsx` for Organize, Rotate, Delete, and Split tools.

## Milestone 2: Sign PDF & Digital Signature Suite (Completed)
- [x] Build `<SignatureModal />` component with vector drawing, multi-color ink (black, blue, red).
- [x] Add Typed Signature with handwritten cursive fonts.
- [x] Add Upload Signature with transparent background support.
- [x] Build `<SignOverlay />` drag-and-drop placement overlay to position signature anywhere on any page.
- [x] Export signed PDF with embedded signature image at exact coordinates using `pdf-lib`.

## Milestone 3: Zero-Knowledge In-Browser Mode (Completed)
- [x] Implement direct `pdf-lib` client-side pipeline in the browser for instant 0ms execution.
- [x] Add "🔒 100% Private — Processed locally in your browser" trust badge.

## Milestone 4: High-Value Power Tools (Completed)
- [x] Dark Mode PDF Color Inversion.
- [x] PDF Sanitizer / Privacy Metadata Scrubber.
- [x] Multi-Page Booklet Printing Imposition.
