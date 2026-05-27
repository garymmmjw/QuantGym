# QuantGuide Question

## 661. Expecting Heads

**Metadata**

- ID: `NHR9z7UK7FV9nUnYb0R1`
- URL: https://www.quantguide.io/questions/expecting-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Conditional Expectation, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:22:20 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we are flipping a fair coin $5$ times. Find the expected number of heads we obtain given that the first and last flips are of opposite parity (i.e. one is heads and one is tails).

### Hint

We always expect one head between the first and last coins. What distribution do the remaining three coins follow?

### 解答

We always expect one head between the first and last coins. The three middle coins follow a Binom$(3,0.5)$, where the expectation is $\dfrac{3}{2}$. Thus, the expected number of heads is $\dfrac{5}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/2"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "NHR9z7UK7FV9nUnYb0R1",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:22:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5307893,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expecting Heads",
    "topic": "probability",
    "urlEnding": "expecting-heads",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "NHR9z7UK7FV9nUnYb0R1",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expecting Heads",
    "topic": "probability",
    "urlEnding": "expecting-heads"
  }
}
```
