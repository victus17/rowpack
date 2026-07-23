# Architecture

Rowpack has two products in one repository: a Node.js compiler and a browser runtime.

## Compilation

1. The CLI reads CSV, TSV or an array-of-objects JSON file.
2. The inference layer normalizes column identifiers and detects common field types.
3. The result is validated as a versioned `RowpackDocument`.
4. The compiler escapes the document and places it inside the built runtime’s non-executable JSON script element.
5. The finished HTML is written as a single portable artifact.

## Runtime

The Preact runtime reads the embedded document, validates it again and renders the selected view. Edits are held in a bounded in-memory history. Saving clones the current document, replaces its embedded JSON and serializes the page back into a complete HTML file.

The generated file does not load assets from the repository. JavaScript, CSS, data and the favicon are inline.

## Main directories

```text
src/
  cli/       input loading and HTML compilation
  runtime/   the standalone Preact application
  shared/    schema, inference, CSV safety and types
tests/
  unit/      compiler and data behavior
  e2e/       desktop/mobile product flows
examples/    realistic source datasets
```

## Format compatibility

The embedded document includes a numeric `version`. A future format migration must be explicit and tested; existing files should never be silently reinterpreted.
