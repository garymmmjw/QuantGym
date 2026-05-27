# QuantGuide Question

## 99. Poisson Review II

**Metadata**

- ID: `qRHsbPmRxLALvDPtd72T`
- URL: https://www.quantguide.io/questions/poisson-review-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-9 10:57:53 America/New_York
- Last Edited By: Gabe

### 题干

On average, $7$ customers arrive at the QuantGuide gift shop per hour following a Poisson process. Suppose it takes $10$ minutes to serve each customer. Compute the sum of the mean and variance of total service time in hours for customers arriving in a given $1$ hour period.

### Hint

What is the distribution of the arrivals per hour?

### 解答

Let $X \sim \text{Poisson}(7)$. In hours, the total service time is $\dfrac{1}{6} \cdot X$. We wish to compute $\mathbb{E}\left[\dfrac{1}{6}X \right] + \text{Var}\left[\dfrac{1}{6}X \right] = \frac{1}{6} \mathbb{E}\left[ X \right] + \frac{1}{36} \text{Var}\left[ X \right] = \frac{49}{36}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/36"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "qRHsbPmRxLALvDPtd72T",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 10:57:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 717617,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Review II",
    "topic": "probability",
    "urlEnding": "poisson-review-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "qRHsbPmRxLALvDPtd72T",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Review II",
    "topic": "probability",
    "urlEnding": "poisson-review-ii"
  }
}
```
