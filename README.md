# doc·editor

A PDF editor that runs entirely in the browser. Open a PDF, mark it up, rearrange its pages and save a new PDF. Files never leave your computer.

## What it does

- **Text**: click anywhere to type, double-click existing text to change it. Colour and size (a dropdown of standard sizes) apply to the text you're typing or the selected text box, and become the default for new text.
- **Draw**: freehand ink for signatures, ticks and marks.
- **Highlight**: drag over content.
- **White-out**: cover existing content, then type over it.
- **Image**: place a PNG/JPEG (other formats are converted), then resize it from its corner.
- **Pages**: drag thumbnails to reorder them, rotate or delete pages, insert blank pages, and append another PDF (button or drag-and-drop).
- Undo/redo for every edit, zoom, keyboard shortcuts, and a warning before you leave with unsaved changes.
- **Password-protected PDFs** open after you enter the password. When you save, you can keep the protection (AES-256, the original password unless you change it) or save without one.
- **Save PDF** writes a new file (`<name>-edited.pdf`) with everything flattened in. Chrome and Edge show a "Save as" dialog; other browsers download the file.
- **Split by range** saves an inclusive start/end page range as `<name>-pages-<start>-<end>.pdf`, using the current page order, edits and rotations. The open document is kept intact.

## Running it

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (geometry, store, PDF export)
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Limitations

- **White-out hides content but doesn't remove it.** The original text is still in the file and can be copied or extracted. Don't use it to redact sensitive information.
- Existing PDF text can't be edited in place. Use White-out plus Text instead.
- Added text uses the standard PDF Helvetica font, so characters outside Western European scripts are saved as `?`.

## How it's built

React + TypeScript + Vite. [pdf.js](https://mozilla.github.io/pdf.js/) draws pages on screen. [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib), a pdf-lib fork that adds decryption and encryption, writes the output.

```
src/
  core/                    framework-free model, no React and no pdf.js
    geometry.ts            points, rects, rotation helpers
    annotations/           annotation types and how each kind moves/rotates/resizes
    document/              DocumentState: pages + annotations (immutable)
    commands/              undoable edits (add/move/resize annotation, insert/move/rotate/delete page)
    history/               linear undo/redo
    store/EditorStore.ts   single source of truth; execute / preview / commit commands
    coordinates/           screen space → PDF user space for each page rotation
    pages/PageSource.ts    interface for "where a page comes from"
  pdf/                     pdf.js loading, page sources (PDF page, blank page), exporter
  editor/                  tools (Select, Text, Draw, Highlight, White-out, Image) and EditorActions
  ui/                      React components
```

Design notes:

- **Commands and previews.** Every document change is a `DocumentCommand`, a pure `state → state` function, so undo/redo is just history. A drag or stroke is shown with `store.preview(command)` and recorded with one `commitPreview()` when the gesture ends.
- **Registries instead of switches.** Each annotation type has an entry in three typed registries: geometry (`core/annotations/geometry.ts`), screen rendering (`ui/annotations/annotationRenderers.tsx`) and PDF writing (`pdf/export/annotationWriters.ts`). TypeScript flags any registry that is missing a new type.
- **Tools are classes.** They implement `Tool` (pointer down/move/up/double-click) and are listed in `toolRegistry.ts`. Highlight and White-out share `RectangleTool`.
- **Coordinates.** Annotations are stored in page points as the page appears on screen (origin top-left). `PageCoordinateMapper` converts them to PDF space for each rotation. When a page is rotated, its annotations are moved to stay over the same content.

### Adding an annotation type

1. Add the type to the `Annotation` union in `core/annotations/types.ts`.
2. Add an entry to the geometry, renderer and writer registries. The compiler points out each one.
3. Optionally add a tool (extend `BaseTool`) and a properties section.
