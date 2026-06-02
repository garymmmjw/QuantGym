# Question Bank Sources

This directory stores normalized source-level problem packages before they are compiled into the app-wide catalog.

## Structure

```text
data/question-banks/
  catalog-manifest.json
  <source-slug>/
    metadata.json
    problems.json
```

- `catalog-manifest.json` lists imported sources and whether each source is active.
- `<source-slug>/metadata.json` stores source statistics and generated-file names.
- `<source-slug>/problems.json` is the canonical normalized source package.
- `data/problem-catalog.json` and `data/problem-catalog.js` are compiled outputs consumed by the API and browser.

Raw exports, OCR pages, PDFs, and private account dumps should stay local and ignored. Commit normalized catalogs only when distribution rights are clear.

## Current Catalog

The app catalog currently has 2,997 entries across 15 active sources:

- `green-book`: 183
- `yellow-book`: 153
- `red-book`: 242
- `hull-derivatives`: 763
- `stefanica-fe-math`: 35
- `quantitative-primer`: 41
- `dudeney-puzzles`: 123
- `linalg-primer`: 18
- `probability-stochastic-10`: 10
- `quantguide`: 1,204
- `stat110-strategic-practice`: 184
- `stanford-msande214-hw3`: 5
- `probabilitycourse-solved-samples`: 16
- `boyd-cvxbook-additional-exercises`: 10
- `etheridge-finmath-problem-sheets`: 10

`question-bank` is an archived disabled source and is not merged into the app catalog.

## Rebuild

Rebuild the app catalog from existing normalized source packages:

```bash
node scripts/build-problem-catalog.mjs
```

Re-import the configured local book sources and rebuild:

```bash
node scripts/import-quant-books.mjs
```

If the local book folder is elsewhere:

```bash
node scripts/import-quant-books.mjs --book-root /absolute/path/to/books
```

Import a one-off LaTeX source:

```bash
node scripts/extract-latex-question-bank.mjs \
  --input /absolute/path/to/book.tex \
  --slug new-book \
  --name "New Book"
```

If a source's structure changes, update the importer scripts instead of manually editing generated JSON.
