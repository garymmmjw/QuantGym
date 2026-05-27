# QuantGuide Question

## 788. Distinct Biased Coins

**Metadata**

- ID: `mzHS9Omm7hAFYuv1eA6g`
- URL: https://www.quantguide.io/questions/distinct-biased-coins
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:09:14 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we have a bag of distinct biased coins such that a randomly chosen coin’s probability of heads has density $f(t) = 2t$ on $(0,1)$. You choose a coin at random, toss it 6 times, and win if you get 6 heads. What is your probability of winning?

### Hint

Note that this is a continuous distribution and thus an integral should be utilized.

### 解答

The probability of winning given $H=t$ is $t^6$. Thus:
$$P(win) = \int_{0} ^{1} 2t \times t^6 dt = \frac{1}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "mzHS9Omm7hAFYuv1eA6g",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:09:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6424896,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Distinct Biased Coins",
    "topic": "probability",
    "urlEnding": "distinct-biased-coins",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "mzHS9Omm7hAFYuv1eA6g",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Distinct Biased Coins",
    "topic": "probability",
    "urlEnding": "distinct-biased-coins"
  }
}
```
