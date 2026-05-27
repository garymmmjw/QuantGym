# QuantGuide Question

## 633. Racecar Driver

**Metadata**

- ID: `oqq8PnnSwT3qWL5wmE5x`
- URL: https://www.quantguide.io/questions/racecar-driver
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: MAO
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:32:36 America/New_York
- Last Edited By: Gabe

### 题干

Andy is a good driver. The probability that he runs any given stoplight is less than half. The probability the first stoplight Andy runs is the second one he sees is $\dfrac{9}{100}$. Find the probability that the fourth stoplight is the first one Andy runs. Assume that each stoplight Andy runs is independent of all others and that the probability is constant.

### Hint

Let $p$ be the probability that he runs a given stoplight. Then $p(1-p) = \dfrac{9}{100}$.

### 解答

Let $p$ be the probability that he runs a given stoplight. Then $p(1-p) = \dfrac{9}{100}$ by interpreting the question into math. We can quickly see that $p = \dfrac{1}{10}$, as we know the value is less than half. Therefore, the probability that the fourth light is the first he runs is $p(1-p)^3 = \dfrac{729}{10000}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "729/10000"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "oqq8PnnSwT3qWL5wmE5x",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:32:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5033980,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Racecar Driver",
    "topic": "probability",
    "urlEnding": "racecar-driver",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "oqq8PnnSwT3qWL5wmE5x",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Racecar Driver",
    "topic": "probability",
    "urlEnding": "racecar-driver"
  }
}
```
