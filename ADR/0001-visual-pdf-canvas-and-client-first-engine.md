# ADR 0001: Visual PDF Studio and Client-First Processing Architecture

## Status
Accepted

## Context
PDF processing web applications often suffer from two major flaws:
1. **Lack of Visual Feedback**: Users must guess page numbers to split, rotate, or reorder pages instead of visually dragging and clicking thumbnails.
2. **Server Overhead & Privacy Concerns**: Sending sensitive PDF documents across the network to cloud servers introduces latency, bandwidth costs, and privacy exposure.

## Decision
1. Implement a **Visual PDF Canvas Component** that dynamically renders thumbnail previews of all pages in a document using client-side HTML5 Canvas.
2. Adopt a **Client-First Execution Pipeline**: Operations that can be performed locally in JavaScript using `pdf-lib` will execute directly inside the user's browser, bypassing the server entirely for maximum privacy and zero latency. The serverless `/api/jobs` pipeline remains as a fallback for heavy multi-file workloads.

## Alternatives Considered
- **Server-Side Ghostscript Image Rendering**: High server CPU costs, slow thumbnail delivery over network.
- **Pure Serverless Upload Pipeline**: Slower user feedback loop (500ms+ roundtrips), Vercel payload size limits.

## Consequences
- **Positive**: Instant processing (0ms network delay), 100% privacy guarantee for local mode, intuitive drag-and-drop page manipulation, and near-zero server infrastructure costs.
- **Negative**: High-page-count PDFs (500+ pages) require lazy-loaded thumbnail rendering in the browser to prevent UI thread lag.
