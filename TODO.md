# TODO — Multi-Phase Implementation Roadmap

## Milestone 1: Interactive Visual PDF Canvas & Page Organizer (In Progress)
- [ ] Install `pdfjs-dist` for high-fidelity client-side PDF rendering.
- [ ] Build `<VisualPageGrid />` component:
  - [ ] Render canvas thumbnails for all pages of any loaded PDF.
  - [ ] Drag-and-drop page reordering.
  - [ ] Per-page 🔄 Rotate button.
  - [ ] Per-page 🗑️ Delete button.
  - [ ] Visual page selection checkbox for Split/Extract.
- [ ] Connect `<VisualPageGrid />` seamlessly into `src/app/tools/[toolId]/page.tsx` for Organize, Rotate, Delete, and Split tools.

## Milestone 2: Sign PDF & Annotation Suite
- [ ] Build `<SignaturePad />` component with smooth vector drawing, eraser, color selector (black, blue, red).
- [ ] Add Typed Signature with handwritten calligraphic fonts.
- [ ] Add Drag-and-Drop Placement overlay to place signature/stamp anywhere on document pages.
- [ ] Export signed PDF with embedded signature image at exact coordinates using `pdf-lib`.

## Milestone 3: Zero-Knowledge In-Browser Mode
- [ ] Implement direct `pdf-lib` client-side pipeline in the browser for single-file tools.
- [ ] Add "100% Private - In-Browser Mode" badge to UI.

## Milestone 4: High-Value Power Tools
- [ ] Dark Mode PDF Color Inversion.
- [ ] PDF Sanitizer / Privacy Metadata Scrubber.
- [ ] Multi-Page Booklet Printing Imposition.
