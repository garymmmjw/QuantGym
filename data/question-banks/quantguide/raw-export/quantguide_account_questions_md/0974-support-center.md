# QuantGuide Question

## 974. Support Center

**Metadata**

- ID: `EXTyptd5Dviu45zXqwXz`
- URL: https://www.quantguide.io/questions/support-center
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

An IT support center receives 270 calls per hour, on average. What is the probability that more than 40 calls will be received in the next 10 minutes? Round your answer to the nearest thousandth.

### Hint

An IT support center receives 270 calls per hour, on average. What is the probability that more than 40 calls will be received in the next 10 minutes?

### 解答

Let $X$ be the number of calls the IT support center receives in 10 minutes. On average, the center receives 270 calls per hour, or 45 calls per 10 minutes. From this information, we can define $X \sim P(45)$. Using a CDF calculator, we can calculate the following:

$$P(X>40) = 1-P(X\leq 40) = 1- 0.25555 \approx 0.744$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.744"
    ],
    "difficulty": "easy",
    "id": "EXTyptd5Dviu45zXqwXz",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7935044,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Support Center",
    "topic": "statistics",
    "urlEnding": "support-center"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "EXTyptd5Dviu45zXqwXz",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Support Center",
    "topic": "statistics",
    "urlEnding": "support-center"
  }
}
```
