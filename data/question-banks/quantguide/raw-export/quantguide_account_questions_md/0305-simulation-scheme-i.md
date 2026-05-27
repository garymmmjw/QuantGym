# QuantGuide Question

## 305. Simulation Scheme

**Metadata**

- ID: `aiyS4xsBh90b8npUsgh6`
- URL: https://www.quantguide.io/questions/simulation-scheme-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver, Virtu Financial, WorldQuant, Akuna, Goldman Sachs, DE Shaw
- Source: original
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 8
- Last Edited: 2023-11-7 13:15:32 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we want to simulate an event with probability $\dfrac{1}{3}$. This is possible via the following scheme: Flip a fair coin twice. If the outcome is HH, we say the event happened. If the outcome is HT or TH, we say that the event did not happen. If the outcome is TT, we re-run the 2 flips experiment under the same rules. Find the expected amount of coin flips needed to simulate this event.

### Hint

Condition on whether or not the simulation is finished within the first $2$ flips.

### 解答

Let $N$ be the number of coin flips needed to simulate the event. With probability $\dfrac{3}{4}$, we determine whether or not the event happened on the first trial. If we obtain $TT$, which occurs with probability $\dfrac{1}{4}$, then we restart our trial process, but the number of flips we have done increases by $2$. Therefore, with probability $\dfrac{3}{4}$, it takes 2 flips to simulate, and with probability $\dfrac{1}{4}$, it takes $2 + \mathbb{E}[N]$ flips to simulate, as we have performed 2 flips and we end up exactly where we started with the next trial. Thus, we have that $\mathbb{E}[N] = \dfrac{3}{4} \cdot 2 + \dfrac{1}{4}\left(2 + \mathbb{E}[N]\right)$. Solving for $\mathbb{E}[N]$ yields $\mathbb{E}[N] = \dfrac{8}{3}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/3"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "aiyS4xsBh90b8npUsgh6",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:15:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2382565,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Simulation Scheme",
    "topic": "probability",
    "urlEnding": "simulation-scheme-i",
    "version": 8
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "id": "aiyS4xsBh90b8npUsgh6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Simulation Scheme",
    "topic": "probability",
    "urlEnding": "simulation-scheme-i"
  }
}
```
