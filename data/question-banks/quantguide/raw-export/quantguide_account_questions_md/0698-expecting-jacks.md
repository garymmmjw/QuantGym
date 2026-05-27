# QuantGuide Question

## 698. Expecting Jacks

**Metadata**

- ID: `XjP6oyQy3UXzETY8JlhK`
- URL: https://www.quantguide.io/questions/expecting-jacks
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: andy
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:30:55 America/New_York
- Last Edited By: Gabe

### 题干

Bill draws from a deck of cards repeatedly, with replacement. What is the expected number of draws to get four jacks in a row?

### Hint

If Bill does not draw a jack on the first draw, he essentially starts again, wasting a turn. How does this affect his expected value, and how can this be expanded to the cases where he successfully draws one, two, or three jacks, but then fails on the next draw?

### 解答

Suppose Bill does not draw a jack on the first draw (which occurs with probability $\frac{12}{13}$). Then, he must start over again. If Bill drew a jack on the previous draw, he must draw another jack to continue; otherwise, with probability $\frac{1}{13} \times \frac{12}{13}$, he must start over. We follow this reasoning for all four jack draws: \[\begin{aligned}     \mathbb{E}[X] &= \frac{12}{13} \left( \mathbb{E}[X] + 1 \right) + \frac{12}{13^2} \left( \mathbb{E}[X] + 2 \right) + \frac{12}{13^3} \left( \mathbb{E}[X] + 3 \right) + \frac{12}{13^4} \left( \mathbb{E}[X] + 4 \right) + \frac{1}{13^4} \cdot 4 \\ &= 30940 \end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "30940"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XjP6oyQy3UXzETY8JlhK",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:30:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5719670,
    "source": "andy",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Expecting Jacks",
    "topic": "probability",
    "urlEnding": "expecting-jacks",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "XjP6oyQy3UXzETY8JlhK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Expecting Jacks",
    "topic": "probability",
    "urlEnding": "expecting-jacks"
  }
}
```
