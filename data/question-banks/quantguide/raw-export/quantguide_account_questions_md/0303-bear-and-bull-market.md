# QuantGuide Question

## 303. Bear and Bull Market

**Metadata**

- ID: `KqPbbi3dmHhMwMlUDK3d`
- URL: https://www.quantguide.io/questions/bear-and-bull-market
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Virtu Financial
- Source: Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

The price of a stock starts at $\$100$. The price then drops 1%, then grows 1%, then drops 1% again, and so on. What does the price converge to?

### Hint

Consider pairs of consecutive days.

### 解答

Consider pairs of consecutive days. The first day, the price drops to $\dfrac{99}{100}$. Then, the price rises to $\dfrac{101}{100}$. Therefore, every $2$ days, the price is multiplied by a factor of $$\dfrac{99}{100} \cdot \dfrac{101}{100} = \dfrac{9999}{10000} < 1$$ Thus, in the long run, the price converges to $0$, as it is exponentially decreasing.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "KqPbbi3dmHhMwMlUDK3d",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2368984,
    "source": "Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Bear and Bull Market",
    "topic": "brainteasers",
    "urlEnding": "bear-and-bull-market"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "KqPbbi3dmHhMwMlUDK3d",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Bear and Bull Market",
    "topic": "brainteasers",
    "urlEnding": "bear-and-bull-market"
  }
}
```
