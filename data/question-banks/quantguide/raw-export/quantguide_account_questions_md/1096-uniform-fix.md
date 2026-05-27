# QuantGuide Question

## 1096. Uniform Fix

**Metadata**

- ID: `FHpVyb5gmRguNHMLKwwh`
- URL: https://www.quantguide.io/questions/uniform-fix
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Hudson River Trading, Citadel, Squarepoint Capital, DRW, Goldman Sachs
- Source: classic
- Tags: Conditional Expectation, Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:26:54 America/New_York
- Last Edited By: Gabe

### 题干

Let $U \sim \text{Unif}(0,1)$ and $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID. Define $N = \text{min}\{n \in \mathbb{N} : X_n > U\}$. Find $\mathbb{E}[N]$. Enter $-1$ if the answer is infinite.

### Hint

The key here is to condition on $U$. What is the conditional distribution of $N \mid U = u$?

### 解答

The key here is to condition on $U$. This is because of the fact that $N \mid U = u \sim \text{Geom}(1-u)$, as each trial has probability $1-u$ of being larger than $u$. Therefore, $\mathbb{E}[N \mid U] = \dfrac{1}{1-U}$ by known formulas about geometric random variables. Using the Law of Total Expectation and LOTUS, we have that $$\mathbb{E}[N] = \mathbb{E}[\mathbb{E}[N \mid U]] = \mathbb{E}\left[\dfrac{1}{1-U}\right] = \displaystyle \int_0^1 \dfrac{du}{1-u} = \infty$$ Therefore, you should enter in $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "FHpVyb5gmRguNHMLKwwh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:26:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8957965,
    "source": "classic",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Fix",
    "topic": "probability",
    "urlEnding": "uniform-fix",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "FHpVyb5gmRguNHMLKwwh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Fix",
    "topic": "probability",
    "urlEnding": "uniform-fix"
  }
}
```
