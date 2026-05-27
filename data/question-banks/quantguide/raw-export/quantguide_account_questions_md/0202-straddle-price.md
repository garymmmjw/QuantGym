# QuantGuide Question

## 202. Straddle Price

**Metadata**

- ID: `7t1OOMnO6vH0d41mbSD1`
- URL: https://www.quantguide.io/questions/straddle-price
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:15:34 America/New_York
- Last Edited By: Gabe

### 题干

What is the price of an at-the-money straddle with underlying $S = 20$, time-until-expiry $T = 0.36$, and volatility $\sigma = 0.4$? Round to $2$ decimal points. 

### Hint

How can we approximate at-the-money options? 

### 解答

For at-the-money calls and puts, we can approximate the option price with the following formula:

$$V = \sqrt{\frac{T-t}{2\pi}}\sigma S$$

A straddle is long a call and put, so we just have to plug everything into the equation and multiply by $2$. Plugging everything in, we get:

$$V = 2*\sqrt{\frac{.36}{2\pi}}(0.4)(20) = 3.83$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.83"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7t1OOMnO6vH0d41mbSD1",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:15:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1525992,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Price",
    "topic": "finance",
    "urlEnding": "straddle-price",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "7t1OOMnO6vH0d41mbSD1",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Price",
    "topic": "finance",
    "urlEnding": "straddle-price"
  }
}
```
