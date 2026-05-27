# Question Bank Sources

This directory stores source-level problem data before it is compiled into the app-wide catalog.

## Structure

```text
data/question-banks/
  catalog-manifest.json
  <book-slug>/
    metadata.json
    problems.json
    problems.js
```

- `catalog-manifest.json` lists every imported book or source.
- `<book-slug>/metadata.json` records the original LaTeX path, display name, and generated files.
- `<book-slug>/problems.json` is the canonical extracted problem list for that source.
- `data/problem-catalog.json` and `data/problem-catalog.js` are compiled outputs consumed by the API and browser.

## Current Batch Import

The current public catalog is generated from the prepared desktop folder:

```bash
node scripts/import-quant-books.mjs
```

This imports the current book-based sources and rebuilds the public catalog. The app catalog currently has 2,771 entries across 10 active sources:

- `green-book`: 绿皮书, 183
- `yellow-book`: 黄皮书, 153
- `red-book`: 红宝书, 240
- `hull-derivatives`: Hull 期权期货及其他衍生品, 763
- `stefanica-fe-math`: Stefanica 金融工程数学入门, 35
- `quantitative-primer`: Quantitative Primer, 41
- `dudeney-puzzles`: Dudeney 经典挑战谜题, 123
- `linalg-primer`: 金融工程线性代数入门, 18
- `probability-stochastic-10`: 概率与随机分析面试题 10 题, 11
- `quantguide`: QuantGuide, 1,204

`question-bank` is an archived disabled source and is not merged into the app catalog.

The Hull source TeX contains placeholder boxes, so the batch importer hydrates those prompts from the original PDF Practice Questions by number.

## Import A New Single LaTeX Book

```bash
node scripts/extract-latex-question-bank.mjs \
  --input /absolute/path/to/book.tex \
  --slug new-book \
  --name "新书名"
```

The importer writes the source files under `data/question-banks/<book-slug>/`, updates `catalog-manifest.json`, and rebuilds the compiled catalog.

If the LaTeX structure of a future book differs from the current batch set, add parsing rules to `scripts/import-quant-books.mjs` or `scripts/extract-latex-question-bank.mjs` rather than manually editing generated JSON.

## Rebuild The App Catalog

```bash
node scripts/build-problem-catalog.mjs
```

Run this after editing source-level problem files. The generated app catalog should remain the only file loaded by `index.html` and `api-server/server.py`.
