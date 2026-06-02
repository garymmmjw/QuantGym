# QuantGym Question Bank Audit And Update Guide

Last updated: 2026-06-02 01:35 PDT

This document records how the QuantGym question banks are stored, how to audit them, how to update them from LaTeX/QuantGuide sources, and the current cleanup status.

## Current Status

The compiled public catalog currently contains 2,997 problems across 15 active sources:

| Source | Count | Current State |
|---|---:|---|
| `green-book` | 183 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. PDF parser, Chinese translation, figure screenshots, and reviewed category/difficulty mapping were refreshed. |
| `yellow-book` | 153 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Several math prompts were corrected from the scanned PDF, Figure 3.1/3.2 screenshots were attached, and reviewed category/difficulty mapping was added. |
| `red-book` | 242 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Added missing Q2.58/Q2.59 smile-model entries, captured Figures 2.1/2.2/2.3/2.8-2.12/6.1, repaired several OCR spillovers, and switched reviewed category/difficulty mapping to use source question labels. |
| `hull-derivatives` | 763 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. English prompts are hydrated from PDF where possible, 36 PDF reference-page screenshots are attached for cited tables/figures, chapter spillovers were removed, reviewed category/difficulty mapping was added, and the official Hull answer pack has been imported: 744 PDF worked solutions plus 19 Excel workbook solutions with 61 rendered workbook previews. |
| `stefanica-fe-math` | 35 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. The source LaTeX and translated LaTeX were rebuilt from the reviewed catalog, all 35 prompts now have concise aligned English/Chinese wording, explanations are bilingual summaries, and reviewed category/difficulty mapping was added. |
| `quantitative-primer` | 41 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Source and translated LaTeX were rebuilt from the reviewed catalog; Q2/Q33/Q36/Q41 structural extraction errors were repaired; answer screenshots were captured for Q1/Q2/Q10/Q15/Q17/Q24/Q25/Q29; reviewed category/difficulty mapping was added. |
| `dudeney-puzzles` | 123 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. English and Chinese LaTeX were rebuilt from the reviewed catalog; Q32/Q35/Q38/Q40 extraction spillovers were repaired; misassigned prompt/solution images around Q40/Q46/Q72/Q73/Q84/Q92/Q94/Q104 were corrected; reviewed category/difficulty mapping was added. |
| `linalg-primer` | 18 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Source and translated LaTeX were rebuilt as reviewed bilingual concept cards, all 18 classifications were reviewed, and placeholder concept notes were replaced with concise explanations. |
| `probability-stochastic-10` | 10 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Source and translated LaTeX were rebuilt from reviewed bilingual solutions; the old 11th row was removed because it was a spillover from the next PDF question and outside the "First 10 Questions" scope. |
| `quantguide` | 1,204 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. English source text was normalized for broken QuantGuide display-math separators, Chinese title/prompt is complete, Chinese explanation coverage is 1,204 / 1,204, image references were source-checked, and category/difficulty review is marked complete. |
| `stat110-strategic-practice` | 184 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Imported from official Harvard Stat 110 strategic practice/homework PDFs, matched all official solutions, translated title/prompt/explanation fields to Chinese, attached 9 PDF-cropped media assets across 7 figure-bearing problems, and marked course-level probability classification/difficulty review complete. |
| `stanford-msande214-hw3` | 5 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Imported from official public Stanford MS&E 214 HW3 files, added generated solver-verified non-official answers, reconstructed the missing Problem 5 pipeline figure from the official edge table, and marked optimization/market classifications reviewed. |
| `probabilitycourse-solved-samples` | 16 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Imported a curated set of public in-chapter ProbabilityCourse solved examples with paraphrased prompts, locally reviewed bilingual answers/explanations, and an explicit exclusion of the separately sold student solutions guide. |
| `boyd-cvxbook-additional-exercises` | 10 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Imported a curated set of public non-computational Boyd/Vandenberghe additional exercises with generated/reviewed non-official bilingual answers because the public repository does not include solutions. |
| `etheridge-finmath-problem-sheets` | 10 | Clean for the three current review dimensions: LaTeX/translation issue count 0, missing-image issue count 0, classification/difficulty issue count 0. Imported a curated set of public Oxford stochastic-calculus-for-finance problems with generated/reviewed non-official bilingual answers because no public solution file was found in the cached source. |

Current audit snapshot from `artifacts/question-bank-audit/summary.json`:

| Metric | Value |
|---|---:|
| Problems audited | 2,997 |
| Issue flags | 0 |
| Errors | 0 |
| Warnings | 0 |
| Info flags | 0 |

Top issue categories:

| Issue Code | Count | Meaning |
|---|---:|---|
| none | 0 | Current audit has no issue flags. |

## Research Report Intake

Source report:

- `/Users/miujiawei/Downloads/量化金融面试经典书目与开源题集研究报告.pdf`
- Extracted text: `artifacts/source-research-report/report-extracted.txt`

Important intake rule:

- Do not download pirated or unofficial full copies of commercial books listed in the report.
- Only import resources from official author, university, publisher sample, or official GitHub/course pages.
- Commercial books marked as not publicly downloadable should remain in the watchlist or wait for a user-provided copy.

Stat110 import completed:

| Item | Value |
|---|---|
| Source slug | `stat110-strategic-practice` |
| Official page | `https://stat110.hsites.harvard.edu/strategic-practice-problems` |
| Local book folder | `量化书籍/有题目的/Harvard Stat 110 概率论战略练习 Statistics 110 Strategic Practice/` |
| Download cache | `artifacts/source-research-report/downloads/stat110/` |
| Source JSON | `data/question-banks/stat110-strategic-practice/problems.json` |
| Metadata JSON | `data/question-banks/stat110-strategic-practice/metadata.json` |
| Import script | `scripts/import-stat110-strategic-practice.py` |
| Translation script | `scripts/translate-stat110-zh.mjs` |
| Translation cache | `artifacts/question-bank-audit/stat110-zh-cache.json` |
| Translation report | `artifacts/question-bank-audit/stat110-zh-translation-report.json` |
| Media folder | `assets/problem-media/stat110-strategic-practice/` |
| Problem count | 184 |
| Chinese title/prompt/explanation coverage | 184 / 184 |
| Solution matching gaps | 0 |
| Attached media assets | 9 files, 15 prompt/solution image references |
| Difficulty distribution | Easy 15, Medium 99, Hard 70 |
| SQLite public count | 184 |

Stanford MS&E 214 HW3 import completed:

| Item | Value |
|---|---|
| Source slug | `stanford-msande214-hw3` |
| Official page | `https://web.stanford.edu/~ashishg/msande214/spr_2024/handouts/index.html` |
| Official HW3 zip | `https://web.stanford.edu/~ashishg/msande214/spr_2024/handouts/hw3_files.zip` |
| Local book folder | `量化书籍/有题目的/Stanford MS&E 214 优化金融讲义 Stanford MS&E 214 Handouts/` |
| Download cache | `artifacts/source-research-report/downloads/stanford-msande214/` |
| Source JSON | `data/question-banks/stanford-msande214-hw3/problems.json` |
| Metadata JSON | `data/question-banks/stanford-msande214-hw3/metadata.json` |
| Import script | `scripts/import-stanford-msande214-hw3.py` |
| Chinese coverage script | `scripts/translate-stanford-msande214-hw3-zh.mjs` |
| Media folder | `assets/problem-media/stanford-msande214-hw3/` |
| Problem count | 5 |
| Chinese title/prompt/answer/explanation coverage | 5 / 5 |
| Answer policy | Generated and solver-verified; not official course solutions because no public official solution file is included in the HW3 bundle. |
| Attached media assets | 1 reconstructed pipeline network PNG for Problem 5 |
| Difficulty distribution | Medium 2, Hard 3 |
| Category distribution | Optimization 4, Market 1 |
| SQLite public count | 5 |

ProbabilityCourse public solved samples import completed:

| Item | Value |
|---|---|
| Source slug | `probabilitycourse-solved-samples` |
| Official homepage | `https://www.probabilitycourse.com/` |
| Public solved pages | Chapter 1.4.5, 5.1.6, 7.1.3, 8.2.5, 9.1.10, 11.1.5, 11.4.3 solved-problem pages |
| Download cache | `artifacts/source-research-report/downloads/probabilitycourse/solved-pages/` |
| Source JSON | `data/question-banks/probabilitycourse-solved-samples/problems.json` |
| Metadata JSON | `data/question-banks/probabilitycourse-solved-samples/metadata.json` |
| Import script | `scripts/import-probabilitycourse-solved-samples.py` |
| Problem count | 16 |
| Chinese title/prompt/answer/explanation coverage | 16 / 16 |
| Answer policy | Paraphrased and locally reviewed from public in-chapter solved examples; not copied from the separately sold student solutions guide. |
| Attached media assets | 0; selected examples do not require figures. |
| Difficulty distribution | Easy 5, Medium 10, Hard 1 |
| Category distribution | Probability/Expectation 13, Statistics 3 |
| SQLite public count | 16 |
| Targeted LLM review | `artifacts/llm-question-bank-review/probabilitycourse-solved-samples-import-recheck/llm-review-report.json`: 16 reviewed, failed 0, issueRows 0, blockers 0, major 0 |

ProbabilityCourse update logic:

1. Use only the official public ProbabilityCourse website and cache the exact public solved-problem pages.
2. Keep the rights boundary explicit: the homepage describes the main textbook as open access, while the student solutions guide for odd-numbered end-of-chapter problems is sold separately.
3. Import only curated public in-chapter solved examples, not end-of-chapter solution-guide content.
4. Paraphrase prompts and write locally reviewed bilingual answers/explanations, preserving source URLs for attribution.
5. Mark classifications reviewed; use `probabilityExpectation` for probability-process examples and `statistics` for estimator/Bayesian examples.
6. Rebuild `data/problem-catalog.json`, sync SQLite by importing `api-server/server.py`, then run deterministic review, targeted LLM review, and build.

ProbabilityCourse verification commands:

```bash
python3 scripts/import-probabilitycourse-solved-samples.py --rebuild
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
node scripts/llm-review-question-bank.mjs \
  --output artifacts/llm-question-bank-review/probabilitycourse-solved-samples-import-recheck \
  --ids probabilitycourse-solved-samples-problem-001,probabilitycourse-solved-samples-problem-002,probabilitycourse-solved-samples-problem-003,probabilitycourse-solved-samples-problem-004,probabilitycourse-solved-samples-problem-005,probabilitycourse-solved-samples-problem-006,probabilitycourse-solved-samples-problem-007,probabilitycourse-solved-samples-problem-008,probabilitycourse-solved-samples-problem-009,probabilitycourse-solved-samples-problem-010,probabilitycourse-solved-samples-problem-011,probabilitycourse-solved-samples-problem-012,probabilitycourse-solved-samples-problem-013,probabilitycourse-solved-samples-problem-014,probabilitycourse-solved-samples-problem-015,probabilitycourse-solved-samples-problem-016
python3 - <<'PY'
import importlib.util
import sqlite3
from pathlib import Path
path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_server_check', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with sqlite3.connect(module.DB_PATH) as conn:
    public_count = conn.execute("SELECT COUNT(*) FROM problems WHERE visibility='public'").fetchone()[0]
    sample_count = conn.execute("SELECT COUNT(*) FROM problems WHERE source=?", ('probabilitycourse-solved-samples',)).fetchone()[0]
print({'importedCatalogCount': module.IMPORTED_CATALOG_COUNT,
       'publicProblemRows': public_count,
       'probabilitycourseRows': sample_count,
       'dbPath': str(module.DB_PATH)})
PY
npm run build
```

Boyd Convex Optimization additional exercises import completed:

| Item | Value |
|---|---|
| Source slug | `boyd-cvxbook-additional-exercises` |
| Official cvxbook page | `https://web.stanford.edu/~boyd/cvxbook/` |
| Official public repo | `https://github.com/cvxgrp/cvxbook_additional_exercises` |
| Cached shallow clone | `artifacts/source-research-report/downloads/boyd-convex-optimization/cvxbook_additional_exercises/` |
| Source PDF | `artifacts/source-research-report/downloads/boyd-convex-optimization/cvxbook_additional_exercises/additional_exercises.pdf` |
| Source JSON | `data/question-banks/boyd-cvxbook-additional-exercises/problems.json` |
| Metadata JSON | `data/question-banks/boyd-cvxbook-additional-exercises/metadata.json` |
| Import script | `scripts/import-boyd-cvxbook-additional-exercises.py` |
| Repo commit | `6423524f947a7b3f14314015c06d8077a403502f` |
| Problem count | 10 |
| Chinese title/prompt/answer/explanation coverage | 10 / 10 |
| Answer policy | Generated and locally reviewed; not official Boyd/Vandenberghe solutions because public solutions are not included in the repo/PDF. |
| Attached media assets | 0; selected examples do not require figures or data files. |
| Difficulty distribution | Easy 3, Medium 6, Hard 1 |
| Category distribution | Optimization 10 |
| SQLite public count | 10 |
| Targeted LLM review | `artifacts/llm-question-bank-review/boyd-cvxbook-additional-exercises-import-recheck/llm-review-report.json`: 10 reviewed, failed 0, issueRows 0, blockers 0, major 0 |

Boyd update logic:

1. Use the official cvxbook page and the official `cvxgrp/cvxbook_additional_exercises` GitHub repo linked from it.
2. Preserve the rights boundary: the official cvxbook page says complete solutions are available to instructors by email request, and the public repo README also says instructors can request solutions.
3. Import only a small non-computational subset that does not need figure/data assets.
4. Mark all answers as generated/reviewed and non-official; do not claim official solution provenance.
5. Rebuild `data/problem-catalog.json`, sync SQLite by importing `api-server/server.py`, then run deterministic review, targeted LLM review, and build.

Boyd verification commands:

```bash
python3 scripts/import-boyd-cvxbook-additional-exercises.py --rebuild
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
node scripts/llm-review-question-bank.mjs \
  --output artifacts/llm-question-bank-review/boyd-cvxbook-additional-exercises-import-recheck \
  --ids boyd-cvxbook-additional-exercises-problem-001,boyd-cvxbook-additional-exercises-problem-002,boyd-cvxbook-additional-exercises-problem-003,boyd-cvxbook-additional-exercises-problem-004,boyd-cvxbook-additional-exercises-problem-005,boyd-cvxbook-additional-exercises-problem-006,boyd-cvxbook-additional-exercises-problem-007,boyd-cvxbook-additional-exercises-problem-008,boyd-cvxbook-additional-exercises-problem-009,boyd-cvxbook-additional-exercises-problem-010
python3 - <<'PY'
import importlib.util
import sqlite3
from pathlib import Path
path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_server_check', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with sqlite3.connect(module.DB_PATH) as conn:
    public_count = conn.execute("SELECT COUNT(*) FROM problems WHERE visibility='public'").fetchone()[0]
    boyd_count = conn.execute("SELECT COUNT(*) FROM problems WHERE source=?", ('boyd-cvxbook-additional-exercises',)).fetchone()[0]
print({'importedCatalogCount': module.IMPORTED_CATALOG_COUNT,
       'publicProblemRows': public_count,
       'boydRows': boyd_count,
       'dbPath': str(module.DB_PATH)})
PY
npm run build
```

Alison Etheridge stochastic calculus for finance import completed:

| Item | Value |
|---|---|
| Source slug | `etheridge-finmath-problem-sheets` |
| Official author/course page | `https://www.stats.ox.ac.uk/~etheridg/finmath/index.html` |
| Public problem sheet HTML | `https://www.stats.ox.ac.uk/~etheridg/finmath/finanq/finanq.html` |
| Public problem sheet PDF | `https://www.stats.ox.ac.uk/~etheridg/finmath/finanq.pdf` |
| Download cache | `artifacts/source-research-report/downloads/alison-etheridge-finmath/` |
| Source JSON | `data/question-banks/etheridge-finmath-problem-sheets/problems.json` |
| Metadata JSON | `data/question-banks/etheridge-finmath-problem-sheets/metadata.json` |
| Import script | `scripts/import-etheridge-finmath-problem-sheets.py` |
| Problem count | 10 |
| Chinese title/prompt/answer/explanation coverage | 10 / 10 |
| Answer policy | Generated and locally reviewed; not official course solutions because no public official solution file was found in the cached source. |
| Attached media assets | 0; selected examples do not require figures. |
| Difficulty distribution | Easy 2, Medium 6, Hard 2 |
| Category distribution | Option 5, Probability/Expectation 5 |
| SQLite public count | 10 |
| Targeted LLM review | `artifacts/llm-question-bank-review/etheridge-finmath-problem-sheets-import-recheck/llm-review-report.json`: 10 reviewed, failed 0, issueRows 0, blockers 0, major 0 |

Etheridge update logic:

1. Use the official Oxford author/course page and its linked public problem-sheet HTML/PDF.
2. Cache the public source files under `artifacts/source-research-report/downloads/alison-etheridge-finmath/`.
3. Import only a small curated subset with stable standalone statements and no figure dependencies.
4. Mark all answers as generated/reviewed and non-official because no public solution file was found.
5. Rebuild `data/problem-catalog.json`, sync SQLite by importing `api-server/server.py`, then run deterministic review, targeted LLM review, and build.

Etheridge verification commands:

```bash
python3 scripts/import-etheridge-finmath-problem-sheets.py --rebuild
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
node scripts/llm-review-question-bank.mjs \
  --output artifacts/llm-question-bank-review/etheridge-finmath-problem-sheets-import-recheck \
  --ids etheridge-finmath-problem-sheets-problem-001,etheridge-finmath-problem-sheets-problem-002,etheridge-finmath-problem-sheets-problem-003,etheridge-finmath-problem-sheets-problem-004,etheridge-finmath-problem-sheets-problem-005,etheridge-finmath-problem-sheets-problem-006,etheridge-finmath-problem-sheets-problem-007,etheridge-finmath-problem-sheets-problem-008,etheridge-finmath-problem-sheets-problem-009,etheridge-finmath-problem-sheets-problem-010
python3 - <<'PY'
import importlib.util
import sqlite3
from pathlib import Path
path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_server_check', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with sqlite3.connect(module.DB_PATH) as conn:
    public_count = conn.execute("SELECT COUNT(*) FROM problems WHERE visibility='public'").fetchone()[0]
    etheridge_count = conn.execute("SELECT COUNT(*) FROM problems WHERE source=?", ('etheridge-finmath-problem-sheets',)).fetchone()[0]
print({'importedCatalogCount': module.IMPORTED_CATALOG_COUNT,
       'publicProblemRows': public_count,
       'etheridgeRows': etheridge_count,
       'dbPath': str(module.DB_PATH)})
PY
npm run build
```

Stanford update logic:

1. Use the official Stanford handout page and HW3 zip already cached locally.
2. Preserve `hw3.tex`, `hw3.pdf`, and `homework3.xlsx` as source files.
3. Import the 5 HW3 problems as a course-homework source with explicit answer policy.
4. Generate solver-verified non-official answers for staffing LP, min-cost flow, currency hedge/arbitrage LP, long-only QP, and pipeline reliability/max-flow.
5. Reconstruct the missing `ps4` pipeline figure from the official edge table because the downloaded public zip has no image file and the PDF has no embedded image object for it.
6. Mark classifications reviewed and use the new `optimization` category for LP/QP/network-flow problems.
7. Rebuild `data/problem-catalog.json`, sync SQLite by importing `api-server/server.py`, then run deterministic review, targeted LLM review, and build.

Stanford verification commands:

```bash
python3 scripts/import-stanford-msande214-hw3.py --rebuild
node scripts/translate-stanford-msande214-hw3-zh.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
node scripts/llm-review-question-bank.mjs \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --output artifacts/llm-question-bank-review/stanford-msande214-hw3-import-recheck \
  --ids stanford-msande214-hw3-problem-001,stanford-msande214-hw3-problem-002,stanford-msande214-hw3-problem-003,stanford-msande214-hw3-problem-004,stanford-msande214-hw3-problem-005
python3 - <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, str(Path('api-server').resolve()))
import server
print({'importedCatalogCount': server.IMPORTED_CATALOG_COUNT,
       'dbPath': str(server.DB_PATH)})
PY
npm run build
```

Stat110 update logic:

1. Download official Harvard PDFs from the Stat110 strategic practice page, then keep originals under the Stat110 book folder.
2. Extract each PDF with PyMuPDF and split it into Strategic Practice, Strategic Practice Solutions, Homework, and Homework Solutions.
3. Use a Stat110 section-title allowlist to avoid OCR page-number spillovers becoming fake topic tags.
4. Match solutions by section/problem key, with ordered sequence fallback for PDFs whose solution headings do not exactly match the prompt heading.
5. Escape currency dollars such as `\$1000` during source cleanup so they are not interpreted as math delimiters.
6. Crop true PDF figures into `assets/problem-media/stat110-strategic-practice/`; attach them with `promptImages` and/or `solutionImages`.
7. Mark reviewed false-positive image mentions with `figureReview`.
8. Translate `titleEn`, `promptEn`, and `explanationEn` into Simplified Chinese using cached batch translation.
9. Rebuild `data/problem-catalog.json`, sync SQLite by importing `api-server/server.py`, then run deterministic review and build.

Stat110 verification commands:

```bash
python scripts/import-stat110-strategic-practice.py
node scripts/translate-stat110-zh.mjs --apply --batch-size 2 --concurrency 3
node scripts/translate-stat110-zh.mjs --apply --batch-size 1 --concurrency 2 --ids "<failed ids if any>"
node scripts/review-question-bank-quality.mjs --catalog data/problem-catalog.json
node scripts/audit-question-bank.mjs
python - <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, str(Path('api-server').resolve()))
import server
print(server.IMPORTED_CATALOG_COUNT)
PY
npm run build
```

Current deterministic verification result:

| Check | Result |
|---|---:|
| `review-question-bank-quality` LaTeX/translation issues | 0 |
| `review-question-bank-quality` missing image issues | 0 |
| `review-question-bank-quality` classification/difficulty issues | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |

Next public/open candidates from the report:

| Candidate | Status | Notes |
|---|---|---|
| ProbabilityCourse.com | Public solved samples imported | Imported 16 curated public in-chapter solved examples as `probabilitycourse-solved-samples`; commercial student solutions guide remains excluded. |
| Boyd & Vandenberghe Convex Optimization | Small additional-exercise source imported | Imported 10 curated public non-computational additional exercises as `boyd-cvxbook-additional-exercises` with generated/reviewed non-official answers; public official solutions are not included. |
| Alison Etheridge stochastic calculus for finance | Small problem-sheet source imported | Imported 10 curated public stochastic-finance problems as `etheridge-finmath-problem-sheets` with generated/reviewed non-official answers; no public solution file was found. |
| Stanford MS&E 214 handouts | HW3 imported | Public HW3 bundle imported as `stanford-msande214-hw3` with 5 solver-verified non-official homework answers and a reconstructed pipeline-network image. HW1/HW2 extracted payloads remain 0-byte and should not be parsed until a non-empty official source is found. |
| Mike Giles numerical finance PDFs | Watchlist / not imported | Public Oxford lecture-survey PDF cached. Rechecked 2026-06-02: 20 pages, 0 Exercise/Exercises hits, 0 Homework hits; "problem" occurrences are prose, not a problem set. |
| Bath Market Microstructure PDF | Watchlist / not imported | Public PDF cached. Rechecked 2026-06-02: 322 pages, 0 Exercise/Exercises hits, 0 Homework hits; "problem" occurrences are lecture prose, not a structured problem set. |
| EPI Judge | External-only / not imported | Official GitHub triaged at HEAD `b736406dfb6e8e6be2612e8a57e710baf90a2d3e`. README describes stubs, test cases, and judge framework for the EPI book; license is CC BY-NC-ND 4.0, so normalized bilingual prompt/answer import would create adapted material. Keep as external practice link unless permissions change. |
| Commercial books in the report | Blocked until user provides copies or official samples | Do not download unofficial full texts. Keep as `纯textbook/候选教材书单 Quant Textbook Watchlist` or per-book folders when the user supplies files. |

## Full LLM Review Snapshot

Full-library LLM review has now been run over all active catalog problems:

```bash
node scripts/llm-review-question-bank.mjs \
  --batch-size 4 \
  --concurrency 3 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --output artifacts/llm-question-bank-review/full-2772
```

The first run used `--force`; after a slow request stalled, the script was updated with `--timeout-ms` support and resumed from `llm-review-cache.json` without `--force`.

Full-review outputs:

- `artifacts/llm-question-bank-review/full-2772/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/llm-review-items.jsonl`
- `artifacts/llm-question-bank-review/full-2772/llm-review-issues.csv`
- `artifacts/llm-question-bank-review/full-2772/major-summary.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage.csv`
- `artifacts/llm-question-bank-review/full-2772/major-summary-open.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open.csv`

Full-review result before post-review filtering:

| Metric | Value |
|---|---:|
| Candidates | 2,772 |
| Reviewed in current/resumed run | 2,316 |
| Loaded from cache | 456 |
| Failed | 0 |
| Blocker issue rows | 0 |
| Major issue rows | 600 |
| Unique problems with major/blocker rows | 292 |

After post-review automatic fixes, the open triage file filters issues that are already fixed in the current catalog, such as QuantGuide `answerZh` fields copied from numeric/formula answers. The original open LLM-major triage contained 290 rows. After `quantguide-repair-batch-001` resolved 20 QuantGuide major rows, `dudeney-repair-batch-001` resolved all 11 Dudeney major rows, `qprimer-repair-batch-001` resolved both Quantitative Primer rows, `hull-repair-batch-001` resolved all 17 Hull rows, `quantguide-batch-002` resolved the remaining 39 QuantGuide rows, `green-book-batch-001` resolved 20 Green Book rows, `green-book-batch-002` resolved the remaining 33 Green Book rows, `red-book-batch-001` resolved 20 Red Book rows, `red-book-batch-002` resolved 15 Red Book rows, `red-book-batch-003` resolved 20 Red Book rows, `red-book-batch-004` resolved the remaining 14 Red Book rows, `yellow-book-batch-001` resolved 16 Yellow Book rows, `yellow-book-batch-002` resolved 20 Yellow Book rows, `yellow-book-batch-003` resolved 20 Yellow Book rows, and `yellow-book-batch-004` resolved the remaining 23 Yellow Book rows, the current working open-major snapshot is:

| Source | Open Major Problems |
|---|---:|
| none | 0 |
| **Total** | **0** |

Current post-batch triage files:

- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-004.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-004.csv`

Current open issue dimensions in the post-Yellow-batch-004 snapshot:

| Dimension | Open Problems Touching Dimension |
|---|---:|
| none | 0 |

Interpretation:

- The rule-based audit is clean: no deterministic flags for empty fields, missing image references, or reviewed classification/difficulty gaps.
- The full-review open-major queue is now closed: the latest post-batch snapshot has 0 blocker/major problems remaining.
- Future imports should still be checked with deterministic audits plus targeted LLM review for changed ids, because new OCR or source changes may introduce fresh content issues.

Post-review automatic fixes already applied:

- Added timeout support to `scripts/llm-review-question-bank.mjs` via `--timeout-ms`.
- Copied numeric/formula QuantGuide `answer` values into `answerZh` where `answerZh` was empty.
- Rebuilt catalog with `node scripts/import-quant-books.mjs`.
- Re-ran:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

Both deterministic checks remain at 0 issues.

## QuantGuide Repair Batch 001

Batch goal: take the first high-confidence QuantGuide major rows from `major-triage-open.json`, repair source JSON and compiled catalog fields, then recheck with deterministic audits and targeted LLM review.

Reproducible repair script:

```bash
node scripts/apply-reviewed-quantguide-repairs.mjs --apply --rebuild
node scripts/review-quantguide-quality.mjs --apply --rebuild
```

What the batch fixed:

- 20 QuantGuide problems from the original open-major list.
- Bond practice prompts that displayed rates as `0.05%` / `0.03%` / `0.06%` / `0.09%` even though the solutions use annual decimal rates `0.05` / `0.03` / `0.06` / `0.09`, converted to semiannual rates.
- Incorrect or unclear explanations in `Contracts and Pricing III`, `Hatching Eggs II`, `Diverse Distributions`, `No More Than Four`, `Log Comparison`, `Variance of Sum of BM`, `Random Particles`, and `Rainbow Trains`.
- Full arbitrage-vector answers for `Contract Arbitrage`, `Put Arbitrage`, and `Put-Call Arbitrage`.
- Translation fidelity issues including `Likely Targets II` interval `[-1-\epsilon,-1+\epsilon]`, `Non-Disjoint Subsets` placeholder/counted-complement wording, `Paper Draw` Chinese explanation, and `European puts` -> `欧式看跌期权`.
- QuantGuide URL-like tags were removed from 66 problems; source URLs remain preserved in `problem.quantguide.source`.

Resolved ids:

```text
quantguide-bond-practice-iii
quantguide-bond-practice-iv
quantguide-bond-practice-v
quantguide-bond-practice-vi
quantguide-casted-shadow
quantguide-contract-arbitrage
quantguide-contracts-and-pricing-iii
quantguide-diverse-distributions
quantguide-hatching-eggs-ii
quantguide-likely-target-ii
quantguide-log-comparison
quantguide-no-more-than-four
quantguide-nondisjoint-subsets
quantguide-put-arbitrage
quantguide-putcall-arbitrage
quantguide-rainbow-trains
quantguide-random-particles
quantguide-splitwise
quantguide-threepeat-dice
quantguide-variance-of-sum-of-bm
```

Verification reports:

- `artifacts/question-bank-quality-review/quantguide-reviewed-repairs-report.json`
- `artifacts/question-bank-quality-review/quantguide-quality-review-report.json`
- `artifacts/llm-question-bank-review/quantguide-repair-batch-001-style-recheck-after-rebuild/llm-review-report.json`
- `artifacts/llm-question-bank-review/quantguide-repair-batch-001-final-minor-recheck/llm-review-report.json`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
node scripts/llm-review-question-bank.mjs \
  --ids quantguide-bond-practice-iv,quantguide-contract-arbitrage,quantguide-threepeat-dice \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/quantguide-repair-batch-001-style-recheck-after-rebuild
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| Targeted LLM recheck candidates | 3 |
| Targeted LLM recheck issues | 0 |
| Batch-resolved original QuantGuide major rows | 20 |
| Remaining QuantGuide open-major rows | 39 |

## Dudeney Repair Batch 001

Batch goal: repair all 11 Dudeney open-major rows from `major-triage-open-after-quantguide-batch-001`, especially OCR/PDF column spillovers, broken Chinese translations, missing answer statements, and a missing solution image.

Reproducible repair script and media capture:

```bash
node scripts/capture-dudeney-manual-images.mjs
node scripts/apply-reviewed-dudeney-repairs.mjs --apply --sync-source --rebuild
```

What the batch fixed:

- 11 Dudeney problems from the open-major list: Q8, Q10, Q12, Q23, Q25, Q89, Q93, Q98, Q99, Q101, and Q119.
- Repaired corrupted or unrelated Chinese prompts in `The Three Groups`, `The Cab Numbers`, `The Four Elopements`, `Stealing the Castle Treasure`, and `The Card Frame Puzzle`.
- Replaced PDF column spillovers in Q10, Q99, and Q101 with complete, source-checked answer/explanation text.
- Corrected Q89 rectangle-counting formulas and final counts: 1,296 total rectangles, 204 squares, and 1,092 non-square rectangles on an 8x8 board.
- Corrected chess terminology in Q93 (`mate` -> `将死`) and restored the Chinese move sequence.
- Added explicit bilingual answer fields for the repaired rows.
- Added source-cropped Q101 solution image:
  `assets/problem-media/dudeney-puzzles/dudeney-problem-101-solution-card-frame.png`.
- Rebuilt Dudeney English/Chinese LaTeX from the reviewed catalog and rebuilt the compiled catalog.

Resolved ids:

```text
dudeney-puzzles-problem-008
dudeney-puzzles-problem-010
dudeney-puzzles-problem-012
dudeney-puzzles-problem-023
dudeney-puzzles-problem-025
dudeney-puzzles-problem-089
dudeney-puzzles-problem-093
dudeney-puzzles-problem-098
dudeney-puzzles-problem-099
dudeney-puzzles-problem-101
dudeney-puzzles-problem-119
```

Verification reports:

- `artifacts/question-bank-quality-review/dudeney-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/dudeney-repair-batch-001-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/dudeney-repair-batch-001-recheck-final-3/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-dudeney-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-dudeney-batch-001.csv`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
npm run build
node scripts/llm-review-question-bank.mjs \
  --ids dudeney-puzzles-problem-008,dudeney-puzzles-problem-025,dudeney-puzzles-problem-093 \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/dudeney-repair-batch-001-recheck-final-3
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 3 |
| Targeted LLM recheck blockers / majors | 0 / 0 |
| Batch-resolved original Dudeney major rows | 11 |
| Remaining Dudeney open-major rows | 0 |

## Quantitative Primer Repair Batch 001

Batch goal: repair the two Quantitative Primer rows that remained in the open-major snapshot after Dudeney cleanup.

Reproducible repair script:

```bash
node scripts/apply-reviewed-qprimer-repairs.mjs --apply --sync-source --rebuild
```

What the batch fixed:

- Q25 `Find the celebrity at a party`: added concise bilingual answer fields, replaced verbose machine-translated explanation with a clear directed-graph/candidate-elimination solution, described the David/Victoria two-special-person variant, and retagged the problem as `Graph Theory` instead of `probability`.
- Q26 `Find a duplicate without sorting`: added concise bilingual answer fields, replaced the truncated merge-sort/Python snippet with complete hash-set and sorting approaches, and explained merge sort at interview-answer level.
- Rebuilt Quantitative Primer English/Chinese LaTeX from the reviewed catalog and rebuilt the compiled catalog.

Resolved ids:

```text
quantitative-primer-problem-025
quantitative-primer-problem-026
```

Verification reports:

- `artifacts/question-bank-quality-review/qprimer-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/qprimer-repair-batch-001-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-qprimer-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-qprimer-batch-001.csv`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
npm run build
node scripts/llm-review-question-bank.mjs \
  --ids quantitative-primer-problem-025,quantitative-primer-problem-026 \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/qprimer-repair-batch-001-recheck-final
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 2 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 0 |
| Batch-resolved original Quantitative Primer rows | 2 |
| Remaining Quantitative Primer open-major rows | 0 |

## Hull Repair Batch 001

Batch goal: repair all 17 Hull Derivatives rows that remained in the open-major snapshot after Quantitative Primer cleanup.

Reproducible repair script:

```bash
node scripts/apply-reviewed-hull-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 17 Hull Derivatives problems from the open-major list.
- Replaced broken OCR fragments, formula render issues, and unclear bilingual text in problems 4, 5, 27, 30, 35, 37, 160, 215, 234, 321, 347, 373, 399, 436, 467, 470, and 609.
- Added or tightened direct bilingual answer fields for the repaired rows.
- Corrected derivative payoff and strategy explanations, including stopping-out mechanics, option strategy payoffs, moneyness language, futures/currency hedging, and binomial/Black-Scholes interpretation.
- Rebuilt the compiled catalog from the reviewed Hull source JSON.

Resolved ids:

```text
hull-derivatives-problem-004
hull-derivatives-problem-005
hull-derivatives-problem-027
hull-derivatives-problem-030
hull-derivatives-problem-035
hull-derivatives-problem-037
hull-derivatives-problem-160
hull-derivatives-problem-215
hull-derivatives-problem-234
hull-derivatives-problem-321
hull-derivatives-problem-347
hull-derivatives-problem-373
hull-derivatives-problem-399
hull-derivatives-problem-436
hull-derivatives-problem-467
hull-derivatives-problem-470
hull-derivatives-problem-609
```

Verification reports:

- `artifacts/question-bank-quality-review/hull-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/hull-repair-batch-001-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-hull-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-hull-batch-001.csv`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
npm run build
node scripts/llm-review-question-bank.mjs \
  --ids hull-derivatives-problem-004,hull-derivatives-problem-005,hull-derivatives-problem-027,hull-derivatives-problem-030,hull-derivatives-problem-035,hull-derivatives-problem-037,hull-derivatives-problem-160,hull-derivatives-problem-215,hull-derivatives-problem-234,hull-derivatives-problem-321,hull-derivatives-problem-347,hull-derivatives-problem-373,hull-derivatives-problem-399,hull-derivatives-problem-436,hull-derivatives-problem-467,hull-derivatives-problem-470,hull-derivatives-problem-609 \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/hull-repair-batch-001-recheck-final
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 17 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 15 |
| Batch-resolved original Hull rows | 17 |
| Remaining Hull open-major rows | 0 |

## QuantGuide Repair Batch 002

Batch goal: repair the 39 QuantGuide rows that remained in the open-major snapshot after Hull cleanup.

Reproducible repair script:

```bash
node scripts/apply-reviewed-quantguide-batch-002-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 39 QuantGuide problems from the open-major list.
- Rewrote incomplete or misleading explanations for probability, combinatorics, options, statistics, martingale, Brownian motion, and unit-fraction problems.
- Corrected math/notation issues in `5 Pairwise Sum`, `9 For 1`, `Bull Call Spread I`, `Covariance Review V`, `Find the Triangle`, `Fixed Point Limit I`, `Particle Reach VIII`, `Power Digits`, `Statistical Test Review VII`, and related Chinese explanations.
- Preserved source answers where the answer was correct but the LLM-major issue came from ambiguous reasoning, including `Bowl of Cherries IV`, `Marble Mischief`, `Non-Uniform Fix`, and `Points on a Circle III`.
- Rebuilt the compiled catalog from the reviewed QuantGuide source JSON.

Resolved ids:

```text
quantguide-5-pairwise-sum
quantguide-77-multiple-ii
quantguide-9-for-1
quantguide-bank-account-arbitrage
quantguide-basic-dice-game-iv
quantguide-beer-barrel-i
quantguide-beer-barrel-ii
quantguide-bowl-of-cherries-iii
quantguide-bowl-of-cherries-iv
quantguide-brownian-supremum
quantguide-bull-call-spread-i
quantguide-card-diff
quantguide-circular-slice-ii
quantguide-coin-pair-iv
quantguide-consecutive-pairs
quantguide-couple-pairs
quantguide-covariance-review-v
quantguide-find-the-triangle
quantguide-fixed-point-limit-i
quantguide-increasing-uniform-chain
quantguide-king-activity
quantguide-longest-rope
quantguide-make-your-martingale-i
quantguide-marble-mischief
quantguide-meek-mill
quantguide-nonuniform-fix
quantguide-normal-lotus-ii
quantguide-odd-coefficients
quantguide-options-dice-iii
quantguide-paired-pumpkins
quantguide-particle-reach-viii
quantguide-points-on-a-circle-iii
quantguide-power-digits
quantguide-regional-manager-ii
quantguide-square-shade
quantguide-statistical-test-review-vii
quantguide-unit-fraction-representation
quantguide-upface-correlation
quantguide-zero-volatility-returns
```

Verification reports:

- `artifacts/question-bank-quality-review/quantguide-batch-002-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/quantguide-batch-002-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-quantguide-batch-002.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-quantguide-batch-002.csv`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
npm run build
node scripts/llm-review-question-bank.mjs \
  --ids quantguide-5-pairwise-sum,quantguide-77-multiple-ii,quantguide-9-for-1,quantguide-bank-account-arbitrage,quantguide-basic-dice-game-iv,quantguide-beer-barrel-i,quantguide-beer-barrel-ii,quantguide-bowl-of-cherries-iii,quantguide-bowl-of-cherries-iv,quantguide-brownian-supremum,quantguide-bull-call-spread-i,quantguide-card-diff,quantguide-circular-slice-ii,quantguide-coin-pair-iv,quantguide-consecutive-pairs,quantguide-couple-pairs,quantguide-covariance-review-v,quantguide-find-the-triangle,quantguide-fixed-point-limit-i,quantguide-increasing-uniform-chain,quantguide-king-activity,quantguide-longest-rope,quantguide-make-your-martingale-i,quantguide-marble-mischief,quantguide-meek-mill,quantguide-nonuniform-fix,quantguide-normal-lotus-ii,quantguide-odd-coefficients,quantguide-options-dice-iii,quantguide-paired-pumpkins,quantguide-particle-reach-viii,quantguide-points-on-a-circle-iii,quantguide-power-digits,quantguide-regional-manager-ii,quantguide-square-shade,quantguide-statistical-test-review-vii,quantguide-unit-fraction-representation,quantguide-upface-correlation,quantguide-zero-volatility-returns \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/quantguide-batch-002-recheck-final
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 39 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 19 |
| Batch-resolved original QuantGuide rows | 39 |
| Remaining QuantGuide open-major rows | 0 |

## Green Book Repair Batch 001

Batch goal: repair the first 20 Green Book rows from the post-QuantGuide-batch-002 open-major snapshot, focusing on OCR-corrupted probability explanations, calculus notation, complex-number notation, linear-algebra statements, and bad category/tag metadata.

Reproducible repair script:

```bash
node scripts/apply-reviewed-green-book-batch-001-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 20 Green Book problems from the open-major list.
- Repaired mistranslated prompts and corrupted math notation for card-game, infinite tower, socks, normal conditional expectation, birthday-line, dice, candy, bridge-aces, gambler's ruin, and Polya-urn problems.
- Rewrote broken calculus/analysis rows for L'Hospital's rule, logarithm/secant integrals, Steinmetz solid volume, Bernoulli inequality, and an ordinary differential equation.
- Cleaned OCR-corrupted tags such as `Jr I 6`, `A. What is i;?`, and malformed inequality/ODE text.
- Added first-class math categories in app/review code: `calculus`, `algebra`, `linearAlgebra`, and `complexNumbers`; kept QuantGuide's broad category review from being disturbed by answer-only math signals.
- Rebuilt the compiled catalog from the reviewed Green Book source JSON.

Resolved ids:

```text
green-book-problem-005
green-book-problem-010
green-book-problem-025
green-book-problem-041
green-book-problem-042
green-book-problem-043
green-book-problem-044
green-book-problem-046
green-book-problem-048
green-book-problem-049
green-book-problem-054
green-book-problem-060
green-book-problem-061
green-book-problem-073
green-book-problem-081
green-book-problem-082
green-book-problem-085
green-book-problem-091
green-book-problem-092
green-book-problem-093
```

Verification reports:

- `artifacts/question-bank-quality-review/green-book-batch-001-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/green-book-batch-001-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-green-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-green-batch-001.csv`

Final verification commands:

```bash
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
npm run build
node scripts/llm-review-question-bank.mjs \
  --ids green-book-problem-005,green-book-problem-010,green-book-problem-025,green-book-problem-041,green-book-problem-042,green-book-problem-043,green-book-problem-044,green-book-problem-046,green-book-problem-048,green-book-problem-049,green-book-problem-054,green-book-problem-060,green-book-problem-061,green-book-problem-073,green-book-problem-081,green-book-problem-082,green-book-problem-085,green-book-problem-091,green-book-problem-092,green-book-problem-093 \
  --batch-size 1 \
  --concurrency 2 \
  --timeout-ms 120000 \
  --model gpt-4.1-mini \
  --force \
  --output artifacts/llm-question-bank-review/green-book-batch-001-recheck-final
```

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 20 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 11 |
| Batch-resolved original Green rows | 20 |
| Remaining Green open-major rows | 33 |

## Green Book Repair Batch 002

Batch goal: repair the remaining 33 Green Book rows from `major-triage-open-after-green-batch-001`, clearing Green Book from the open-major queue.

Reproducible repair script:

```bash
node scripts/apply-reviewed-green-book-batch-002-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 33 Green Book problems from the remaining open-major list.
- Rewrote OCR-corrupted calculus, ODE, Gaussian-integral, and snowplow explanations.
- Repaired probability/order-statistics/random-walk/dynamic-programming rows with explicit answers and clean bilingual formulas.
- Repaired option-pricing and market-risk rows including Black-Scholes PDE, one-touch replication, inverse-stock payoff, ATM call approximation, VaR, and inverse-floater duration.
- Repaired algorithm/C++ rows including swap without storage, unique values, Horner's method, moving average, sorting, reservoir sampling, exponential search, sorted-grid search, Kadane's algorithm, power-of-two bit test, shift multiplication, probability simulation, Monte Carlo option pricing, and normal random generation.
- Changed obvious misclassifications: pure calculus rows to `calculus`, Monte Carlo option pricing to `option`, and normal random generation to `probabilityExpectation`.

Verification reports:

- `artifacts/question-bank-quality-review/green-book-batch-002-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/green-book-batch-002-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-green-batch-002.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-green-batch-002.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 33 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 6 |
| Batch-resolved original Green rows | 33 |
| Remaining Green open-major rows | 0 |
| Remaining total open-major rows | 148 |

## Red Book Repair Batch 001

Batch goal: repair the first 20 Red Book open-major rows from `major-triage-open-after-green-batch-002`, covering early option-pricing and probability questions with corrupted formulas or missing direct answers.

Reproducible repair script:

```bash
node scripts/apply-reviewed-red-book-batch-001-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 20 Red Book problems from chapters 2 and 3.
- Rewrote Black-Scholes PDE derivations/explanations and added direct answer summaries for questions 2.1-2.4.
- Repaired digital-call skew, normal-model ATM volatility, FX forward no-arbitrage, digital exchange option, Black forward option formula, series-betting replication, mean-reversion hedging volatility, and one-step binomial option price/Delta.
- Repaired probability rows for die expectation, multiplicative fair-coin game, stopping at two equal tosses, biased-coin waiting times, Bayes double-headed coin, expected HHHHHHTTTTTT count, two-ace draws, and the pirate plank random walk.

Verification reports:

- `artifacts/question-bank-quality-review/red-book-batch-001-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/red-book-batch-001-recheck-final/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-001.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 20 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 11 |
| Batch-resolved original Red rows | 20 |
| Remaining Red open-major rows | 49 |
| Remaining total open-major rows | 128 |

## Red Book Repair Batch 002

Batch goal: repair the next 15 Red Book open-major rows from `major-triage-open-after-red-batch-001`, covering probability, order statistics, stochastic calculus, Brownian bridge, and introductory interest-rate questions.

Reproducible repair script:

```bash
node scripts/apply-reviewed-red-book-batch-002-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 15 Red Book problems from chapters 3 and 4.
- Repaired the broken-stick triangle probability, expected uniform maximum/range, transformed density formula, kth order statistic distribution, CLT statement, normal second moment/MGF, GBM square SDE, log-GBM SDE, Ito formula for `2^{W_t}`, Brownian bridge conditional distribution, the meaning of `(dW_t)^2=dt`, and the interview proof sketch for Ito's lemma.
- Repaired the six-month-to-one-year forward-rate calculation, par swap-rate formula, and mean-reverting interest-rate-model explanation.
- Reclassified obvious non-option probability/statistics rows away from the Red Book source default while retaining chapter/book tags.

Verification reports:

- `artifacts/question-bank-quality-review/red-book-batch-002-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/red-book-batch-002-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-002.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-002.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 15 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 2 |
| Batch-resolved original Red rows | 15 |
| Remaining Red open-major rows | 34 |
| Remaining total open-major rows | 113 |

## Red Book Repair Batch 003

Batch goal: repair the next 20 Red Book open-major rows from `major-triage-open-after-red-batch-002`, covering Chapter 5 algorithm/code questions and Chapter 7 C++ concept/implementation questions.

Reproducible repair script:

```bash
node scripts/apply-reviewed-red-book-batch-003-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 20 Red Book problems from chapters 5 and 7.
- Rewrote missing-number, date increment, histogram, airplane seating simulation, maximum subarray, comparison-sort lower bound, Fisher-Yates shuffle, sorted-matrix search, duplicate detection, linear interpolation, and rare-event digital-call Monte Carlo rows.
- Rewrote virtual function, `strcmp`, polar Box-Muller uniform-draw estimate, string reversal, square-root iteration, binary tree, `const`, `static`, and C++ terminology rows.
- Added a `cppProgramming` category and wired it through skill definitions, audit/review allowlists, category normalization, interview pools, and local interview hints/feedback.

Verification reports:

- `artifacts/question-bank-quality-review/red-book-batch-003-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/red-book-batch-003-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-003.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-003.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 20 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 3 |
| Batch-resolved original Red rows | 20 |
| Remaining Red open-major rows | 14 |
| Remaining total open-major rows | 93 |

## Red Book Repair Batch 004

Batch goal: repair the final 14 Red Book open-major rows from `major-triage-open-after-red-batch-003`, covering Chapter 6 mathematics and Chapter 8 puzzle rows.

Reproducible repair script:

```bash
node scripts/apply-reviewed-red-book-batch-004-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 14 Red Book problems from chapters 6 and 8.
- Rewrote corrupted limit, exponent comparison, continued fraction, matrix square root/Cholesky factor, derivatives, integrals, and double-integral rows with clean LaTeX and bilingual explanations.
- Repaired cube surface shortest path, snowplow logarithmic equation, and two-sack black/white ball strategy.
- Corrected several source-category defaults to `calculus`, `algebra`, `linearAlgebra`, or `probabilityExpectation` where appropriate.

Verification reports:

- `artifacts/question-bank-quality-review/red-book-batch-004-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/red-book-batch-004-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-004.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-red-batch-004.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 14 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 3 |
| Batch-resolved original Red rows | 14 |
| Remaining Red open-major rows | 0 |
| Remaining total open-major rows | 79 |

## Yellow Book Repair Batch 001

Batch goal: repair the first 16 Yellow Book open-major rows from `major-triage-open-after-red-batch-004`, covering early probability/math rows and the Black-Scholes PDE derivation.

Reproducible repair script:

```bash
node scripts/apply-reviewed-yellow-book-batch-001-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 16 Yellow Book problems spanning put-option arbitrage, Brownian time integral, correlation-matrix PSD range, uniform-sampling count, Fibonacci C++ code, complex powers, exponent comparisons, AM-GM, derivatives, infinite power tower, series convergence, integrals, ODEs, logistic equation, and Black-Scholes PDE.
- Corrected several broad/default categories to `cppProgramming`, `complexNumbers`, `algebra`, `calculus`, or `probabilityExpectation`.

Verification reports:

- `artifacts/question-bank-quality-review/yellow-book-batch-001-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/yellow-book-batch-001-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-001.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-001.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 16 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 2 |
| Batch-resolved original Yellow rows | 16 |
| Remaining Yellow open-major rows | 63 |
| Remaining total open-major rows | 63 |

## Yellow Book Repair Batch 002

Batch goal: repair the next 20 Yellow Book open-major rows from `major-triage-open-after-yellow-batch-001`, covering covariance/correlation, linear algebra, one-step option pricing, forwards/futures, VaR, and early C++ rows.

Reproducible repair script:

```bash
node scripts/apply-reviewed-yellow-book-batch-002-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 20 Yellow Book problems spanning covariance/correlation PSD proofs, equicorrelation bounds, matrix square roots and Cholesky factors, eigenbasis multiplication, commutator trace contradiction, stochastic/probability matrices, binomial put valuation, ATM option approximations, Delta intuition, put-call parity, swap/forward/futures pricing, duration approximation, VaR scaling, and C++ const/template/shallow-copy pointer questions.
- Restored several OCR-corrupted matrices and code snippets from source context, then normalized categories/tags to `statistics`, `linearAlgebra`, `option`, `market`, and `cppProgramming` as appropriate.
- Tightened minor wording after model review: Cholesky factor wording, Chinese titles/prompts, forward-pricing discounting convention, and VaR rounding precision.

Verification reports:

- `artifacts/question-bank-quality-review/yellow-book-batch-002-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/yellow-book-batch-002-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-002.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-002.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 20 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 2 |
| Batch-resolved original Yellow rows | 20 |
| Remaining Yellow open-major rows | 43 |
| Remaining total open-major rows | 43 |

## Yellow Book Repair Batch 003

Batch goal: repair the next 20 Yellow Book open-major rows from `major-triage-open-after-yellow-batch-002`, covering C++ algorithms, Monte Carlo/numerical methods, probability distributions, and stochastic-calculus integrals.

Reproducible repair script:

```bash
node scripts/apply-reviewed-yellow-book-batch-003-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 20 Yellow Book problems spanning factorial, maximum subarray, prime factors, bit swapping, linked-list reversal, Monte Carlo pi estimation, GBM path simulation, 12-uniform normal approximation, Monte Carlo convergence, Newton convergence, exponential race probability, Poisson moments, unit-disk expected distance, normal CDF expectation, central limit theorem, Brownian quadratic variation, Wiener covariance, and Ito-isometry variance calculations.
- Restored the original scanned-PDF formula for `yellow-book-problem-111`: `X=\int_0^1 \sqrt{t}e^{W_t^2/8}\,dW_t`, with variance `2/3(8-5\sqrt2)`.
- Tightened minor wording after model review: Chinese C++/GBM/Monte Carlo terms, shorter linked-list answer to avoid review truncation, and standard-normal CDF phrasing.

Verification reports:

- `artifacts/question-bank-quality-review/yellow-book-batch-003-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/yellow-book-batch-003-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-003.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-003.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 20 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 0 |
| Batch-resolved original Yellow rows | 20 |
| Remaining Yellow open-major rows | 23 |
| Remaining total open-major rows | 23 |

## Yellow Book Repair Batch 004

Batch goal: repair the final 23 Yellow Book open-major rows from `major-triage-open-after-yellow-batch-003`, closing the remaining stochastic calculus, brainteaser, probability, and algorithm rows.

Reproducible repair script:

```bash
node scripts/apply-reviewed-yellow-book-batch-004-repairs.mjs --apply --rebuild
```

What the batch fixed:

- 23 Yellow Book problems spanning integrated Brownian motion, SDE solutions, Heston model notation, Fibonacci/counting puzzles, coin waiting times, no-consecutive-heads probability, ant surface distance, visible cubes, Mulder escape, amoeba extinction, digit counts, subset alternating sums, tic-tac-toe/magic-square strategy, handshake puzzle, World Series betting, colored-ball weighings, comparison counts, decreasing uniform sequences, exponential donation stopping, broken-stick expectation, and clock-hand meeting time.
- Restored corrupted formulas and missing answer fields for stochastic-calculus rows, including integrated Brownian motion variance, geometric Brownian motion, linear SDE integrating factors, and the Heston SDE system.
- Repaired OCR and translation damage in the remaining puzzle rows, including dollar-amount rendering safety for the World Series bet and cleaned Chinese titles/prompts for several rows.
- Tightened minor wording after model review: Fibonacci indexing, first-head waiting-time phrasing, Mulder angular-position wording, amoeba terminology, ant shortest-path units, comparison prompt typo, and charity-event title translation.

Verification reports:

- `artifacts/question-bank-quality-review/yellow-book-batch-004-reviewed-repairs-report.json`
- `artifacts/llm-question-bank-review/yellow-book-batch-004-recheck/llm-review-report.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-004.json`
- `artifacts/llm-question-bank-review/full-2772/major-triage-open-after-yellow-batch-004.csv`

Final results:

| Check | Result |
|---|---:|
| `review-question-bank-quality` issue count | 0 |
| `audit-question-bank` issue flags | 0 |
| `npm run build` | passed |
| Targeted LLM recheck candidates | 23 |
| Targeted LLM recheck blockers / majors / issue rows | 0 / 0 / 0 |
| Batch-resolved original Yellow rows | 23 |
| Remaining Yellow open-major rows | 0 |
| Remaining total open-major rows | 0 |

QuantGuide title/prompt translation status:

- Cache file: `artifacts/question-bank-audit/quantguide-zh-cache.json`
- External translation folder: `artifacts/external-translation/`
- External import report: `artifacts/external-translation/external-translation-import-report.json`
- External import issues: `artifacts/external-translation/external-translation-import-issues.csv`
- Glossary cleanup report: `artifacts/question-bank-audit/quantguide-zh-glossary-cleanup-report.json`
- External batches imported: 25 files, 1,201 items.
- Previously applied small test batch: 3 items.
- Current QuantGuide `titleZh/promptZh` coverage: 1,204 / 1,204.
- Current QuantGuide `explanationZh` coverage: 1,204 / 1,204.
- Current `artifacts/question-bank-audit/quantguide-zh-todo.jsonl` row count: 0.
- External import issues after cleanup: 0.
- QuantGuide glossary cleanup touched 152 ids across source and external translation files.
- QuantGuide explanation cache: `artifacts/question-bank-audit/quantguide-explanation-zh-cache.json`.
- QuantGuide LaTeX/text normalization report: `artifacts/question-bank-audit/quantguide-latex-normalize-report.json` (`540` problems and `1,157` text fields changed).
- Translation command used earlier for the first small batch:

```bash
node scripts/translate-quantguide-zh.mjs --limit 3 --batch-size 3 --apply --rebuild
```

External batches were then applied with:

```bash
node scripts/import-external-quantguide-zh.mjs --force --apply --rebuild
node scripts/audit-question-bank.mjs
```

The audit dropped from 8,627 issue flags to 0 after QuantGuide Chinese prompts/titles/explanations were applied, common QuantGuide terms were cleaned, false-positive `$...$` math warnings were removed, Dudeney/Hull/Green Book LaTeX was repaired, every active book source was refreshed, QuantGuide image/classification review rows were resolved, broken QuantGuide display-math separators were normalized, and the Hull official answer pack was imported.

Latest verification run:

- `python3 量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/convert_green_book.py`: regenerated 183 Green Book problems from styled PDF markers; no `Solution:` remains inside problem boxes.
- `python3 量化书籍/工具脚本/generate_bilingual.py --path 量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book.tex --force`: regenerated Green Book Chinese LaTeX; 183 translated entries.
- `python3 scripts/extract-green-book-pdf-figures.py`: extracted 27 numbered Green Book figures plus 3 manual clips for unnumbered diagrams/tables, then inserted images into English and Chinese LaTeX.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources.
- `python3 scripts/extract-yellow-book-pdf-figures.py`: extracted Yellow Book Figure 3.1 and Figure 3.2 from the scanned PDF and inserted them into English and Chinese LaTeX.
- `python3 scripts/extract-red-book-pdf-figures.py`: extracted Red Book Figures 2.1, 2.2, 2.3, 2.8, 2.9, 2.10, 2.11, 2.12, and 6.1; inserted Q2.58/Q2.59 plus missing figure blocks into English and Chinese LaTeX.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources.
- `node scripts/repair-hull-source.mjs`: trimmed Hull chapter spillovers and manually repaired known truncated/misaligned bilingual Hull prompts.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources and rendered 36 Hull PDF reference-page screenshots under `assets/problem-media/hull-derivatives/`.
- `node scripts/repair-stefanica-source.mjs`: rebuilt Stefanica English and Chinese LaTeX from the reviewed 35-item catalog so source LaTeX, translated LaTeX, and database-normalized fields stay aligned. The legacy OCR-cleaning path remains available with `--legacy-clean`.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources.
- `node scripts/capture-qprimer-answer-images.mjs`: clipped Quantitative Primer answer images from the original PDF for Q1, Q2, Q10, Q15, Q17, Q24, Q25, and Q29.
- `node scripts/import-quant-books.mjs`: applied Quantitative Primer reviewed prompts/titles, fixed Q2/Q33/Q36/Q41 extraction errors, attached answer images, and applied `quantitative-primer-topic-map-v1`.
- `node scripts/rebuild-qprimer-source.mjs`: rebuilt Quantitative Primer English and Chinese LaTeX from the reviewed 41-item catalog so source LaTeX, translated LaTeX, and database-normalized fields stay aligned.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources.
- `node scripts/capture-dudeney-manual-images.mjs`: clipped reviewed Dudeney figures from the source PDF for Q35, Q40, Q46, Q72, Q73, Q84, Q92, Q94, and Q104.
- `node scripts/import-quant-books.mjs`: applied Dudeney reviewed text repairs, corrected image ownership/false-positive image reviews, stabilized in-repo media path handling, and applied `dudeney-topic-map-v1`.
- `node scripts/rebuild-dudeney-source.mjs`: rebuilt Dudeney English and Chinese LaTeX from the reviewed 123-item catalog so source LaTeX, translated LaTeX, and database-normalized fields stay aligned.
- `node scripts/import-quant-books.mjs`: rebuilt 2,773 catalog problems from 10 active sources.
- `node scripts/rebuild-linalg-source.mjs`: rebuilt Linear Algebra English and Chinese LaTeX from the reviewed 18-item catalog so the section source is represented as clean bilingual concept cards.
- `node scripts/import-quant-books.mjs`: applied Linear Algebra reviewed prompts, explanations, and `linalg-primer-topic-map-v1`.
- `node scripts/import-quant-books.mjs`: rebuilt 2,772 catalog problems from 10 active sources after Probability/Stochastic 10 was reduced to the actual first 10 questions.
- `node scripts/rebuild-prob10-source.mjs`: rebuilt Probability/Stochastic English and Chinese LaTeX from the reviewed 10-item catalog and removed the old spillover Question 11 from the source files.
- `node scripts/import-quant-books.mjs`: applied Probability/Stochastic reviewed bilingual solutions and `probability-stochastic-10-topic-map-v1`.
- `node scripts/review-quantguide-quality.mjs --apply --rebuild`: reviewed 142 QuantGuide classification warnings, changed 82 categories, retained 60 existing categories with review markers, and marked 4 image-reference rows as source-checked no-image/textual false positives.
- `node scripts/build-problem-catalog.mjs`: rebuilt 2,772 catalog problems after two QuantGuide bare-money prompt fixes (`\$3000`, `\$10`).
- `node scripts/export-quantguide-explanation-zh-tasks.mjs --batchSize 40`: exported 31 external translation batches for the remaining 1,204 missing QuantGuide Chinese explanations under `artifacts/external-translation/quantguide-explanations/`.
- `node scripts/import-external-quantguide-explanation-zh.mjs`: dry-run verified the explanation importer; it skips the 31 source-batch files until returned files contain `explanationZh`.
- `node scripts/translate-quantguide-explanations-zh.mjs --batch-size 8 --concurrency 3 --model gpt-4.1-mini --apply --rebuild`: translated the first 1,050 QuantGuide explanations through direct API translation and cached successful rows.
- `node scripts/translate-quantguide-explanations-zh.mjs --batch-size 1 --concurrency 4 --model gpt-4.1-mini --apply --rebuild`: retried the remaining rows one-by-one and translated 151 of 152 failed batch rows.
- Manual reviewed fix for `quantguide-shifty-cylinder`: corrected broken English LaTeX, added `explanationZh`, and changed category from `statistics` to `probabilityExpectation`.
- `node scripts/review-quantguide-quality.mjs --apply --rebuild`: reviewed 24 new QuantGuide category warnings after explanation translation, changed 6 categories, and marked the rest reviewed.
- `node scripts/normalize-quantguide-latex-text.mjs --apply --rebuild`: normalized broken QuantGuide `$$$$`, `$$\\$$`, and `$$2$`-style inline/display math separators across 540 problems and 1,157 text fields.
- `node scripts/translate-quantguide-explanations-zh.mjs --ids ... --force --batch-size 1 --concurrency 4 --model gpt-4.1-mini --apply --rebuild`: retranslated 11 high-risk QuantGuide explanation rows after source-text normalization.
- Manual reviewed fix for `quantguide-matrix-editor`: removed the final English prose residue in `explanationZh` and corrected the English phrase `these matrix` to `these matrices`.
- Extra QuantGuide English-residue scan: `missingExplanationZh=0`, `likelyEnglishResidue=0`.
- `node scripts/review-question-bank-quality.mjs`: 0 current quality-review items; every source is 0/0/0 across LaTeX/translation, image, and classification/difficulty dimensions.
- `node scripts/import-quant-books.mjs`: imported Hull official answer pack from `量化书籍/纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/answers/`; hydrated 744 PDF worked solutions, linked 19 Excel workbook solutions, rendered 925 PDF answer screenshots, and rendered 61 workbook preview images under `assets/problem-media/hull-derivatives/`.
- `node scripts/review-question-bank-quality.mjs`: 0 current quality-review items; every source is 0/0/0 across LaTeX/translation, image, and classification/difficulty dimensions.
- `node scripts/audit-question-bank.mjs`: 0 remaining issue flags.
- `node scripts/apply-reviewed-quantguide-repairs.mjs --apply --rebuild`: applied `quantguide-repair-batch-001`, repairing 20 original QuantGuide open-major rows.
- `node scripts/review-quantguide-quality.mjs --apply --rebuild`: removed URL-like tags from 66 QuantGuide problems while preserving raw source URLs in `problem.quantguide.source`.
- `node scripts/llm-review-question-bank.mjs --ids quantguide-bond-practice-iv,quantguide-contract-arbitrage,quantguide-threepeat-dice --batch-size 1 --concurrency 2 --timeout-ms 120000 --model gpt-4.1-mini --force --output artifacts/llm-question-bank-review/quantguide-repair-batch-001-style-recheck-after-rebuild`: targeted post-fix LLM recheck completed with 3/3 pass and 0 issues.
- SQLite sync through `api-server/server.py`: last verified `imported=2772`; public SQLite problem count is `2772`, QuantGuide public count is `1204`, Hull public count is `763` (`744` PDF-answer rows and `19` spreadsheet-answer rows), Probability/Stochastic 10 public count is `10`, Linear Algebra public count is `18`, and Dudeney public count is `123`.
- SQLite post-batch spot checks: `quantguide-contract-arbitrage.answer = "-1 + 0 - 2 + 4"` and `quantguide-contracts-and-pricing-iii.category = "option"`.
- `npm run build`: production build succeeded; Vite still reports the known classic-script bundling warnings for `config.js` and static catalog scripts, and `config.js` endpoint fallback remains empty in the generated static output.

## Data Flow

The app has three layers of question-bank data:

1. Source files
   - Book sources live under `量化书籍/`.
   - Main LaTeX files look like `量化书籍/<book>/quant_*_book.tex`.
   - Translated LaTeX files usually look like `quant_*_book_zh.tex` or `quant_*_book_en.tex`.
   - QuantGuide raw/private export lives under `QuantGuide/data/` and should not be publicly redistributed without rights review.

2. Normalized source packages
   - Stored under `data/question-banks/<source>/problems.json`.
   - One source folder per book/platform.
   - `data/question-banks/catalog-manifest.json` controls which sources are active.

3. Compiled runtime catalog
   - `data/problem-catalog.json`
   - `data/problem-catalog.js`
   - Browser and API consume these files.
   - The API imports `data/problem-catalog.json` into SQLite at startup/import time.

SQLite database:

```text
api-server/data/quantgym.sqlite3
```

The `problems.problem_json` column stores the full JSON object, so extended fields such as `explanationZh`, `explanationEn`, `promptImages`, and `solutionImages` are preserved.

## Important Scripts

### Import Book LaTeX

```bash
node scripts/import-quant-books.mjs
```

What it does:

- Reads book LaTeX from `量化书籍/`.
- Reads matching translated LaTeX when configured.
- Extracts `problembox` as prompt and text after `\solution` as explanation.
- Writes normalized packages under `data/question-banks/<source>/`.
- Rebuilds `data/problem-catalog.json` and `data/problem-catalog.js`.

Current enhancements:

- Uses repository-local `量化书籍/` by default.
- Preserves `promptEn/promptZh`.
- Preserves `explanationEn/explanationZh`.
- Keeps placeholder explanations for sources that genuinely lack answers.
- Recognizes `\includegraphics{...}` and copies media into `assets/problem-media/<source>/` when image files exist.
- Hull prompts are hydrated from the PDF where possible; `15.18` currently falls back to LaTeX because PDF extraction misses it.
- Hull workbook previews are rendered by `scripts/hull-answer-pack.mjs` through Python `xlrd` + Pillow. If a fresh environment skips workbook previews, install the reader with `python3 -m pip install xlrd` and rerun `node scripts/import-quant-books.mjs`.

### Build Catalog Only

```bash
node scripts/build-problem-catalog.mjs
```

Use this when `data/question-banks/*/problems.json` already exists and only the compiled app catalog needs refreshing.

### Audit All Questions

```bash
node scripts/audit-question-bank.mjs
```

Outputs:

```text
artifacts/question-bank-audit/README.md
artifacts/question-bank-audit/summary.json
artifacts/question-bank-audit/source-audit.json
artifacts/question-bank-audit/per-problem.csv
artifacts/question-bank-audit/issues.csv
artifacts/question-bank-audit/quantguide-zh-todo.jsonl
```

Use these files to inspect every problem, not just samples.

The most useful files:

- `issues.csv`: one row per detected issue.
- `per-problem.csv`: one row per problem with field lengths and issue codes.
- `summary.json`: source-level and issue-level counts.
- `quantguide-zh-todo.jsonl`: QuantGuide items still missing Chinese title/prompt. This is currently empty.

### Review Requested Quality Problems

This is the main review script for the three issue classes currently under cleanup:

1. Book-to-LaTeX conversion and translation accuracy.
2. Answers/explanations that mention diagrams or figures but have no captured image.
3. Category and difficulty values that are missing, default-looking, or likely inaccurate.

Run:

```bash
node scripts/review-question-bank-quality.mjs
```

Outputs:

```text
artifacts/question-bank-quality-review/README.md
artifacts/question-bank-quality-review/summary.json
artifacts/question-bank-quality-review/per-problem-review.csv
artifacts/question-bank-quality-review/latex-translation-review.csv
artifacts/question-bank-quality-review/missing-answer-images.csv
artifacts/question-bank-quality-review/classification-difficulty-review.csv
artifacts/question-bank-quality-review/manual-review-queue.csv
```

Current quality-review snapshot:

| Dimension | Issue Flags | Errors | Warnings | Info |
|---|---:|---:|---:|---:|
| LaTeX / translation accuracy | 0 | 0 | 0 | 0 |
| Missing answer images | 0 | 0 | 0 | 0 |
| Category / difficulty | 0 | 0 | 0 | 0 |

Source cleanup highlights from this snapshot:

- `green-book`: 183 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `yellow-book`: 153 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `red-book`: 242 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `hull-derivatives`: 763 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags; official answers are hydrated from the Hull answer pack.
- `stefanica-fe-math`: 35 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `quantitative-primer`: 41 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `dudeney-puzzles`: 123 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `linalg-primer`: 18 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `probability-stochastic-10`: 10 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags.
- `quantguide`: 1,204 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 classification/difficulty flags; Chinese title/prompt/explanation coverage is complete.

Use `manual-review-queue.csv` first because it is sorted by priority. Then batch fixes by dimension:

- `latex-translation-review.csv`: compare catalog fields against source and translated LaTeX entries; flags untranslated Chinese, suspicious truncation, OCR/LaTeX noise, source alignment problems, and QuantGuide missing Chinese explanations.
- `missing-answer-images.csv`: lists prompt/answer rows where the text refers to a figure, diagram, or shown image but no image field is attached.
- `classification-difficulty-review.csv`: lists invalid/default-looking values and heuristic category/difficulty suggestions. Treat suggestions as review hints, not automatic truth.

### Green Book PDF, Translation, Figure, And Classification Refresh

Current Green Book regeneration sequence:

```bash
python3 量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/convert_green_book.py
python3 量化书籍/工具脚本/generate_bilingual.py --path 量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book.tex --force
python3 scripts/extract-green-book-pdf-figures.py
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- `convert_green_book.py` now parses styled PDF lines instead of splitting only on `Solution:`. It uses problem headings, A/B/C continuation prompts, section/chapter boundaries, and page-footnote filtering.
- The parser now excludes chapter introductions, section introductions, and footnote spillover from the previous problem solution.
- `generate_bilingual.py` now adds a request timeout, progress output, periodic cache saves, and less aggressive skipping for formula-heavy prose.
- `extract-green-book-pdf-figures.py` captures numbered figures and a small manual list of unnumbered diagrams/tables, then writes `\includegraphics` blocks back into both English and Chinese LaTeX.
- Green Book category/difficulty is marked reviewed through `green-book-section-topic-map-v1`, a section-aware mapping in `scripts/import-quant-books.mjs`.

### Yellow Book OCR, Figure, And Classification Refresh

Current Yellow Book refresh sequence:

```bash
python3 scripts/extract-yellow-book-pdf-figures.py
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- `quant_yellow_book.tex` and `quant_yellow_book_zh.tex` were corrected for several high-impact math OCR prompts checked against the scanned PDF page image: `i^i`, `\pi^e` vs. `e^\pi`, Jensen/AM-GM inequality, derivative of `x^x`, nested radical, infinite power tower, three convergence series, two integrals, the ODE, and the logistic ODE prompt.
- `extract-yellow-book-pdf-figures.py` renders the scanned PDF and clips Figure 3.1 and Figure 3.2. The script is idempotent: it removes previous Yellow Book auto-image blocks before inserting fresh `\includegraphics` references.
- `scripts/import-quant-books.mjs` now has `yellow-book-section-topic-map-v1`, which assigns reviewed categories/difficulties from the Yellow Book section and problem number, with C++/data-structure questions mapped to `leetcode`, Monte Carlo/numerical-methods questions mapped mainly to `statistics`, financial-instrument questions mapped to `option` or `market`, and brainteasers mapped to `mentalMath` or `probabilityExpectation`.
- The Yellow Book display cleanup normalizes common OCR artifacts such as page headers, line-break hyphenation, `€` used for membership, and code snippets where braces were misread.
- Current Yellow Book result: 153 problems, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Red Book OCR, Figure, And Classification Refresh

Current Red Book refresh sequence:

```bash
python3 scripts/extract-red-book-pdf-figures.py
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- `quant_red_book.tex` and `quant_red_book_zh.tex` now include Q2.58 and Q2.59, which were visible in the original PDF but were previously lost when the OCR skipped the incomplete-markets smile pages.
- `extract-red-book-pdf-figures.py` clips Figures 2.1, 2.2, 2.3, 2.8, 2.9, 2.10, 2.11, 2.12, and 6.1 from the scanned PDF and writes idempotent `\includegraphics` blocks into both English and Chinese LaTeX.
- Fixed red-book OCR spillovers in Q2.57/Q2.58/Q2.59, Q3.23, Q6.26, the Chapter 7 boundary, and the Chapter 8 boundary. This removed pasted chapter introductions and C++ question lists from previous answers.
- `scripts/import-quant-books.mjs` now cuts plain-text chapter headers when extracting solutions, cleans prompt page-header spillover, preserves `Chapter 3` references inside real answer prose, and uses source question labels for Red Book categories/difficulties instead of relying on array positions.
- Current Red Book result: 242 problems, source/translated LaTeX counts both 242, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Quantitative Primer Structural, Image, And Classification Refresh

Current Quantitative Primer refresh sequence:

```bash
node scripts/capture-qprimer-answer-images.mjs
node scripts/import-quant-books.mjs
node scripts/rebuild-qprimer-source.mjs
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- Q2 was structurally wrong: the problem box had swallowed appendix/code material instead of the bivariate-normal maximum question. The reviewed catalog now restores the correct prompt and a clean bilingual derivation of `E[max(X,Y)] = sqrt((1-rho)/pi)`.
- Q33 and Q36 had real answers embedded in the previous problem's solution while their own solutions were placeholders. The catalog now has reviewed SQL and R-data-structure explanations in both English and Chinese.
- Q41 had swallowed the later "Old friends", appendix, and regression-theory material. The solution is now trimmed to the Bayes-law coin problem and repaired to the correct posterior `1024/2023`.
- `capture-qprimer-answer-images.mjs` clips the actual source diagrams/plots from the original PDF for Q1, Q2, Q10, Q15, Q17, Q24, Q25, and Q29 and stores them under `assets/problem-media/quantitative-primer/`.
- `scripts/import-quant-books.mjs` now applies `quantitative-primer-topic-map-v1`, attaches those solution images, and marks all 41 classifications as reviewed.
- `rebuild-qprimer-source.mjs` rebuilds `quant_qprimer_book.tex` and `quant_qprimer_book_zh.tex` from the reviewed catalog so the LaTeX source, translated LaTeX, normalized package, compiled catalog, and SQLite import stay aligned.
- Current Quantitative Primer result: 41 problems, source/translated LaTeX counts both 41, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Dudeney Structural, Image, And Classification Refresh

Current Dudeney refresh sequence:

```bash
node scripts/capture-dudeney-manual-images.mjs
node scripts/import-quant-books.mjs
node scripts/rebuild-dudeney-source.mjs
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- Q32 was structurally wrong: the artillerymen problem had swallowed the geometry/dissection chapter preface and unrelated images. The reviewed catalog now keeps only the true cannon-ball prompt and a concise bilingual solution for the 4,900-ball square-pyramid result.
- Q35 had the Q32 cannon-ball solution pasted into the joiner solution. The reviewed catalog now restores the five-piece square-plus-half-square dissection and attaches the correct solution diagram.
- Q38 had swallowed the Q40 patchwork explanation. The Tangram solution is now trimmed to the actual paradox explanation, while Q40 receives the square-number patchwork solution.
- Several PDF images had been assigned to the neighboring problem because the figure appeared before the next title on the same page. Manual crops now correct Q40, Q46, Q72, Q73, Q84, Q92, Q94, and Q104, and answer-side references for Q29/Q30/Q47/Q74/Q88 are covered by their prompt diagrams.
- Q3/Q25/Q58/Q67 figure mentions were checked against the source PDF and marked as text-only or false-positive references, so the image review no longer asks for nonexistent screenshots.
- `scripts/import-quant-books.mjs` now prevents repeated in-repo media filenames when rebuilt LaTeX already points at `assets/problem-media/<source>/...`.
- `scripts/import-quant-books.mjs` applies `dudeney-topic-map-v1` and marks all 123 category/difficulty assignments as reviewed.
- `rebuild-dudeney-source.mjs` rebuilds `quant_dudeney_book.tex` and `quant_dudeney_book_zh.tex` from the reviewed catalog so source LaTeX, translated LaTeX, normalized package, compiled catalog, and SQLite import stay aligned.
- Current Dudeney result: 123 problems, source/translated LaTeX counts both 123, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Linear Algebra Primer Review

Current Linear Algebra refresh sequence:

```bash
node scripts/import-quant-books.mjs
node scripts/rebuild-linalg-source.mjs
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- The source is a short textbook-section extraction rather than a true interview Q&A list, so the catalog was normalized into 18 reviewed bilingual concept cards.
- Each card now has aligned English/Chinese title, prompt, and explanation. The previous placeholder-style answers were replaced with concise explanations covering vectors and matrices, triangular solves, market one-period models, eigenvalues, Cholesky, covariance, OLS, and Markowitz portfolios.
- Image review found no required figures after the prompt rewrite; stale prompt/solution image fields are removed.
- `scripts/import-quant-books.mjs` applies `linalg-primer-topic-map-v1` and marks all 18 category/difficulty assignments as reviewed.
- `rebuild-linalg-source.mjs` rebuilds `quant_linalg_book.tex` and `quant_linalg_book_zh.tex` from the reviewed catalog.
- Current Linear Algebra result: 18 problems, source/translated LaTeX counts both 18, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Probability/Stochastic 10 Review

Current Probability/Stochastic refresh sequence:

```bash
node scripts/import-quant-books.mjs
node scripts/rebuild-prob10-source.mjs
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What changed in this pass:

- The old 11th row was an incomplete spillover from the next PDF question. Because this source is explicitly "First 10 Questions", it was removed from the normalized catalog and rebuilt LaTeX.
- All 10 prompts were checked against the source PDF text extracted with PyMuPDF, then rewritten as concise aligned English/Chinese problem statements.
- OCR artifacts such as chapter headers, broken sums, missing denominators, and mixed English in Chinese explanations were replaced with reviewed bilingual solutions.
- Key corrected answers include Q2 `n(n - 1)/4`, Q3 `1/315`, Q4 `7/12`, Q5 "not identifiable", Q6 `k = 18`, Q8 coupon collector expectation, Q9 `n`, and Q10 impossibility by AM-GM.
- No figures or screenshots are required for these 10 questions.
- `scripts/import-quant-books.mjs` applies `probability-stochastic-10-topic-map-v1` and marks all 10 category/difficulty assignments as reviewed.
- `rebuild-prob10-source.mjs` rebuilds `quant_prob10_book.tex` and `quant_prob10_book_zh.tex` from the reviewed catalog.
- Current Probability/Stochastic result: 10 problems, source/translated LaTeX counts both 10, 0 LaTeX/translation flags, 0 missing-image flags, 0 category/difficulty flags, and 0 general audit issues.

### Translate QuantGuide Chinese Title/Prompt

This is now complete for the current 1,204 QuantGuide problems. Keep this script for newly added QuantGuide items or for regenerating a selected batch.

```bash
node scripts/translate-quantguide-zh.mjs --batch-size 12 --concurrency 3 --apply --rebuild
```

Behavior:

- Translates only QuantGuide `titleZh` and `promptZh`.
- Uses `OPENAI_API_KEY` from environment or `.env`.
- Preserves math/code/URL segments using placeholder tokens.
- Writes cache to `artifacts/question-bank-audit/quantguide-zh-cache.json`.
- With `--apply`, updates `data/question-banks/quantguide/problems.json`.
- With `--rebuild`, rebuilds `data/problem-catalog.json/js`.

Safer dry run:

```bash
node scripts/translate-quantguide-zh.mjs --limit 5 --batch-size 5
```

Apply only a small batch:

```bash
node scripts/translate-quantguide-zh.mjs --limit 20 --batch-size 10 --apply --rebuild
```

Recommended full run for newly added/untranslated items:

```bash
node scripts/translate-quantguide-zh.mjs --batch-size 12 --concurrency 3 --apply --rebuild
```

If interrupted, rerun the same command. Cached translations are reused.

### Import External QuantGuide Chinese Title/Prompt

Use this when translated batches are placed under `artifacts/external-translation/`.

Expected input file patterns:

```text
artifacts/external-translation/*.zh.json
artifacts/external-translation/translated-001.json
```

Each file may contain either a JSON array or an object with an `items` array. Each item should contain:

```json
{
  "id": "quantguide-example-id",
  "titleZh": "中文标题",
  "promptZh": "中文题目"
}
```

Dry run:

```bash
node scripts/import-external-quantguide-zh.mjs
```

Apply and rebuild catalog:

```bash
node scripts/import-external-quantguide-zh.mjs --apply --rebuild
```

Force re-apply already translated IDs from the external files:

```bash
node scripts/import-external-quantguide-zh.mjs --force --apply --rebuild
```

Outputs:

```text
artifacts/external-translation/external-translation-import-report.json
artifacts/external-translation/external-translation-import-issues.csv
```

Current external import status:

- 25 files read.
- 1,201 external items imported.
- 1,201 source rows updated by the latest forced import.
- 0 remaining QuantGuide Chinese prompt gaps.
- 0 external import validation issues.

### Clean QuantGuide Chinese Glossary Terms

Use this after importing external QuantGuide translations if the Chinese fields still contain high-frequency English finance/probability terms.

Dry run:

```bash
node scripts/cleanup-quantguide-zh-terms.mjs
```

Apply and rebuild catalog:

```bash
node scripts/cleanup-quantguide-zh-terms.mjs --apply --rebuild
```

Output:

```text
artifacts/question-bank-audit/quantguide-zh-glossary-cleanup-report.json
```

The current glossary includes terms such as Brownian Motion, Poisson process, martingale, call option, put option, straddle, implied volatility, payoff, underlying, and asset. It updates both `data/question-banks/quantguide/problems.json` and matching files under `artifacts/external-translation/`, so rerunning the external import will not undo the cleanup.

### Review QuantGuide Images And Categories

Use this when `missing-answer-images.csv` or `classification-difficulty-review.csv` contains QuantGuide rows.

```bash
node scripts/review-quantguide-quality.mjs --apply --rebuild
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

What the current review does:

- Reads the current quality-review CSV for QuantGuide category warnings.
- Reviews each flagged row against QuantGuide raw topic/tags/title/prompt.
- Marks 142 category warnings as reviewed through `quantguide-topic-review-v1`.
- Changes 82 categories and retains 60 existing categories with review notes.
- Marks 4 image-reference rows as `source_checked_no_image`, `false_positive`, or `textual_reference` because the raw QuantGuide export has no embedded image for those prompts/solutions.
- Writes `artifacts/question-bank-quality-review/quantguide-quality-review-report.json`.

Current result: QuantGuide has 0 missing-image rows and 0 classification/difficulty rows.

### Translate QuantGuide Chinese Explanations

Current `explanationZh` status: 1,204 / 1,204 translated. The current quality-review snapshot has 0 QuantGuide LaTeX/translation issues.

Direct API translation command used for the bulk pass:

```bash
node scripts/translate-quantguide-explanations-zh.mjs --batch-size 8 --concurrency 3 --model gpt-4.1-mini --apply --rebuild
```

Retry missing or failed rows one-by-one:

```bash
node scripts/translate-quantguide-explanations-zh.mjs --batch-size 1 --concurrency 4 --model gpt-4.1-mini --apply --rebuild
```

Force-regenerate selected ids after source cleanup or manual QA:

```bash
node scripts/translate-quantguide-explanations-zh.mjs --ids quantguide-id-1,quantguide-id-2 --force --batch-size 1 --concurrency 4 --model gpt-4.1-mini --apply --rebuild
```

The script:

- Uses `OPENAI_API_KEY` from environment or `.env`.
- Translates only `explanation` / `explanationEn` into `explanationZh`.
- Preserves math, code, URLs, and placeholder tokens.
- Writes cache to `artifacts/question-bank-audit/quantguide-explanation-zh-cache.json`.
- Writes the latest run report to `artifacts/question-bank-audit/quantguide-explanation-zh-translation-report.json`.

Normalize QuantGuide source text before translating or retranslating rows with suspicious English residue:

```bash
node scripts/normalize-quantguide-latex-text.mjs --apply --rebuild
```

This removes broken QuantGuide separators such as `$$$$`, `$$\\$$`, and accidental `$$2$` inline-math starts. The latest run changed 540 problems and 1,157 text fields.

External LLM workflow is still available for future batches or if direct API translation is not desired. Export source batches:

```bash
node scripts/export-quantguide-explanation-zh-tasks.mjs --batchSize 40
```

Outputs:

```text
artifacts/external-translation/quantguide-explanations/PROMPT.md
artifacts/external-translation/quantguide-explanations/manifest.json
artifacts/external-translation/quantguide-explanations/quantguide-explanations-001.json
...
artifacts/external-translation/quantguide-explanations/quantguide-explanations-031.json
```

Give `PROMPT.md` plus one batch JSON file to an LLM. The returned JSON should contain:

```json
{
  "items": [
    {
      "id": "quantguide-example-id",
      "explanationZh": "中文解答"
    }
  ]
}
```

Dry-run import returned translation files:

```bash
node scripts/import-external-quantguide-explanation-zh.mjs
```

Apply returned explanation translations and rebuild:

```bash
node scripts/import-external-quantguide-explanation-zh.mjs --apply --rebuild
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
```

The importer skips the exported source batches until files contain `explanationZh`, so returned translation JSON files can be placed in the same folder. For the current dataset this path is no longer required because all 1,204 explanations have been applied.

### Import Compiled Catalog Into SQLite

The API imports the compiled catalog when `api-server/server.py` is loaded. To update the local SQLite database without starting a server:

```bash
python3 - <<'PY'
import importlib.util
from pathlib import Path
module_path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_api_server_import', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(f'imported={module.IMPORTED_CATALOG_COUNT}')
PY
```

Verify public problem count:

```bash
python3 - <<'PY'
import sqlite3
conn = sqlite3.connect('api-server/data/quantgym.sqlite3')
print(conn.execute("select count(*) from problems where visibility='public'").fetchone()[0])
conn.close()
PY
```

Expected count currently: `2772`.

## Standard Update Workflow

Run this when book LaTeX files or QuantGuide normalized data have changed:

```bash
node scripts/import-quant-books.mjs
node scripts/review-question-bank-quality.mjs
node scripts/audit-question-bank.mjs
python3 - <<'PY'
import importlib.util
from pathlib import Path
module_path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_api_server_import', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(f'imported={module.IMPORTED_CATALOG_COUNT}')
PY
npm run build
```

Run this when external QuantGuide title/prompt translations have been added:

```bash
node scripts/import-external-quantguide-zh.mjs --force --apply --rebuild
node scripts/cleanup-quantguide-zh-terms.mjs --apply --rebuild
node scripts/audit-question-bank.mjs
python3 - <<'PY'
import importlib.util
from pathlib import Path
module_path = Path('api-server/server.py').resolve()
spec = importlib.util.spec_from_file_location('quantgym_api_server_import', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(f'imported={module.IMPORTED_CATALOG_COUNT}')
PY
```

## How To Read Audit Issues

Treat issue severity as triage hints, not final truth.

`error`:

- Usually means a field is missing or a known required translation is absent.
- There are currently no remaining audit or quality-review errors.

`warning`:

- Likely quality problem: untranslated text, OCR noise, missing figure, suspicious truncation, mixed language.
- Needs human or LLM review before marking clean.

`info`:

- Expected limitation or intentionally deferred item.
- There are currently no audit info flags.

Common issue codes:

- `zh_prompt_same_as_en`: Chinese prompt has not been translated.
- `zh_prompt_likely_english`: Chinese field appears to still contain English prose.
- `en_explanation_contains_chinese`: English explanation was contaminated by Chinese translation.
- `mentions_figure_without_image`: problem likely needs a screenshot/diagram.
- `placeholder_or_missing_solution`: answer is intentionally missing or not extracted.
- `ocr_or_latex_noise`: likely OCR artifact, broken symbol, or escaped LaTeX artifact.
- `translated_latex_command`: translation damaged a LaTeX command, for example `\Large` becoming `\大`.

## Current Known Gaps

1. Hull Excel-only answers are now inline-previewed, but the previews intentionally truncate very large sheets.
   - The workbook paths are stored in `solutionFiles` and `answerSourceFiles`.
   - Use the original `.xls` files for complete model/data inspection.

2. QuantGuide image, category, and explanation review is clean for the current heuristic.
   - The previous 4 QuantGuide image-reference rows were checked against the raw export and marked as no-image/textual false positives.
   - The previous 142 QuantGuide category rows were reviewed and marked with `quantguide-topic-review-v1`.
   - The 24 post-explanation category warnings were reviewed; 6 categories changed and 18 existing categories were retained with review notes.
   - Current title/prompt/explanation coverage is 1,204 / 1,204.

3. QuantGuide source text has been normalized, but future imports may reintroduce raw export artifacts.
   - Rerun `scripts/normalize-quantguide-latex-text.mjs --apply --rebuild` after importing new QuantGuide rows.
   - Then rerun the English-residue scan or quality review before database sync.

4. QuantGuide source data remains private/licensed context.
   - Keep `QuantGuide/data/` and generated external translation batches private unless rights are reviewed.

## Files Changed In This Cleanup Pass

Core logic:

- `scripts/import-quant-books.mjs`
- `scripts/audit-question-bank.mjs`
- `scripts/review-question-bank-quality.mjs`
- `scripts/hull-answer-pack.mjs`
- `scripts/repair-hull-source.mjs`
- `scripts/repair-stefanica-source.mjs`
- `scripts/capture-qprimer-answer-images.mjs`
- `scripts/rebuild-qprimer-source.mjs`
- `scripts/capture-dudeney-manual-images.mjs`
- `scripts/rebuild-dudeney-source.mjs`
- `scripts/rebuild-linalg-source.mjs`
- `scripts/rebuild-prob10-source.mjs`
- `scripts/review-quantguide-quality.mjs`
- `scripts/export-quantguide-explanation-zh-tasks.mjs`
- `scripts/import-external-quantguide-explanation-zh.mjs`
- `scripts/translate-quantguide-explanations-zh.mjs`
- `scripts/normalize-quantguide-latex-text.mjs`
- `scripts/translate-quantguide-zh.mjs`
- `scripts/import-external-quantguide-zh.mjs`
- `scripts/cleanup-quantguide-zh-terms.mjs`
- `scripts/apply-reviewed-quantguide-batch-002-repairs.mjs`
- `scripts/apply-reviewed-green-book-batch-001-repairs.mjs`
- `scripts/apply-reviewed-green-book-batch-002-repairs.mjs`
- `scripts/apply-reviewed-red-book-batch-001-repairs.mjs`
- `scripts/apply-reviewed-red-book-batch-002-repairs.mjs`
- `scripts/apply-reviewed-red-book-batch-003-repairs.mjs`
- `scripts/apply-reviewed-red-book-batch-004-repairs.mjs`
- `scripts/apply-reviewed-yellow-book-batch-001-repairs.mjs`
- `scripts/apply-reviewed-yellow-book-batch-002-repairs.mjs`
- `scripts/apply-reviewed-yellow-book-batch-003-repairs.mjs`
- `scripts/apply-reviewed-yellow-book-batch-004-repairs.mjs`
- `scripts/import-stanford-msande214-hw3.py`
- `scripts/translate-stanford-msande214-hw3-zh.mjs`
- `scripts/import-probabilitycourse-solved-samples.py`
- `scripts/import-boyd-cvxbook-additional-exercises.py`
- `scripts/import-etheridge-finmath-problem-sheets.py`
- `scripts/apply-reviewed-hull-repairs.mjs`
- `scripts/review-question-bank-quality.mjs`
- `scripts/extract-green-book-pdf-figures.py`
- `scripts/extract-dudeney-pdf-images.py`
- `scripts/build-static-site.mjs`
- `api-server/server.py`
- `src/skills.js`
- `src/main.js`
- `量化书籍/工具脚本/generate_bilingual.py`
- `量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/convert_green_book.py`
- `量化书籍/有题目的/Quantitative Primer/quant_qprimer_book.tex`
- `量化书籍/有题目的/Quantitative Primer/quant_qprimer_book_zh.tex`
- `量化书籍/有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book.tex`
- `量化书籍/有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book_zh.tex`
- `量化书籍/纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book.tex`
- `量化书籍/纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book_zh.tex`
- `量化书籍/有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book.tex`
- `量化书籍/有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book_zh.tex`

Generated/updated data:

- `data/question-banks/*/problems.json`
- `data/question-banks/*/metadata.json`
- `data/question-banks/catalog-manifest.json`
- `data/problem-catalog.json`
- `data/problem-catalog.js`
- `api-server/data/quantgym.sqlite3`
- `artifacts/source-research-report/downloads/probabilitycourse/solved-pages/*`
- `artifacts/source-research-report/downloads/boyd-convex-optimization/cvxbook_additional_exercises/*`
- `artifacts/source-research-report/downloads/epijudge-triage.md`
- `artifacts/source-research-report/downloads/alison-etheridge-finmath/*`
- `artifacts/llm-question-bank-review/probabilitycourse-solved-samples-import-recheck/*`
- `artifacts/llm-question-bank-review/boyd-cvxbook-additional-exercises-import-recheck/*`
- `artifacts/llm-question-bank-review/etheridge-finmath-problem-sheets-import-recheck/*`
- `artifacts/question-bank-audit/*`
- `artifacts/question-bank-quality-review/*`
- `artifacts/external-translation/*`
- `artifacts/external-translation/quantguide-explanations/*`
- `assets/problem-media/green-book/*`
- `assets/problem-media/dudeney-puzzles/*`
- `assets/problem-media/quantitative-primer/*`
- `assets/problem-media/hull-derivatives/hull-answer-*.png`
- `量化书籍/纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/answers/*`

## Suggested Next Priorities

1. Continue research-report source triage with strict rights boundaries: remaining report-listed public PDFs are mostly lecture/watchlist material unless explicit homework + answer structures are found; EPI Judge should remain external-only unless permissions change.
2. Keep Stanford HW1/HW2 on hold until a non-empty official source is found; their currently extracted payloads are 0-byte.
3. Spot-check a sample of the 61 Hull workbook preview images to decide whether any very large model sheets need custom clipping.
4. Spot-check a sample of QuantGuide Chinese explanations for phrasing quality now that automated issue queues are clean.
5. Rerun normalize, audit, quality review, SQLite sync, targeted LLM review, and build after every new QuantGuide import or book-source change.
