# QuantGuide Question

## 701. Bolt Variance II

**Metadata**

- ID: `DIRx1vpOSLspprnTDd1V`
- URL: https://www.quantguide.io/questions/bolt-variance-ii
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

A manufacturer produces nuts and bolts. A random sample of twelve bolts returned a sample variance of .0003, while a random sample of twelve bolts from a competitor returned a sample variance of .0001. They wish to test if there is sufficient data to indicate a smaller variation in bolt diameter from their competitor. What is the value of the relevant test statistic? Assume independence, variance homogeneity, and that diameter variance is approximately normally distributed.

### Hint

The F test is best-suited here (ANOVA).

### 解答

The manufacturer is testing $H_0: \sigma_1 ^2 = \sigma_2 ^2$ against $H_a : \sigma_1 ^2 > \sigma_2 ^2$. The appropriate test statistic is: 

$$F = \frac{s_1 ^2}{s_2 ^2} = \frac{0.0003}{0.0001} = 3$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "easy",
    "id": "DIRx1vpOSLspprnTDd1V",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5738699,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Bolt Variance II",
    "topic": "statistics",
    "urlEnding": "bolt-variance-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "DIRx1vpOSLspprnTDd1V",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Bolt Variance II",
    "topic": "statistics",
    "urlEnding": "bolt-variance-ii"
  }
}
```
