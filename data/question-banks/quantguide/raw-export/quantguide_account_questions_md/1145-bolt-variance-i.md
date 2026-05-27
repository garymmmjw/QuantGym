# QuantGuide Question

## 1145. Bolt Variance I

**Metadata**

- ID: `A7wMgkQZHgAaOyw40IVl`
- URL: https://www.quantguide.io/questions/bolt-variance-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A manufacturer produces nuts and bolts that have a diameter variance no larger than .0002 centimeters. A random sample of twelve bolts returned a sample variance of .0003. What is the value of the appropriate test statistic to test, at the 5$\%$ level, $H_0: \sigma ^2 = .0002$ against $H_a : \sigma ^2 > .0002$? Assume independence, variance homogeneity, and that diameter variance is approximately normally distributed.

### Hint

Note that we are testing a hypothesis concerning variance. What is the appropriate test statistic for this?

### 解答

Note that we are testing a hypothesis concerning variance. The appropriate test statistic is $$\chi ^2 = \frac{(n-1)s^2}{\sigma ^2} = \frac{(12-1) \times .0003}{.0002} = 16.5$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16.5"
    ],
    "difficulty": "easy",
    "id": "A7wMgkQZHgAaOyw40IVl",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9433558,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Bolt Variance I",
    "topic": "statistics",
    "urlEnding": "bolt-variance-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "A7wMgkQZHgAaOyw40IVl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Bolt Variance I",
    "topic": "statistics",
    "urlEnding": "bolt-variance-i"
  }
}
```
