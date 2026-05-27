# QuantGuide Question

## 137. Alternating Sum

**Metadata**

- ID: `4byvwzrJeLVq1M6Schvm`
- URL: https://www.quantguide.io/questions/alternating-sum
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group
- Source: tmg
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 10:48:21 America/New_York
- Last Edited By: Gabe

### 题干

Find the value of $100^2 - 99^2 + 98^2 - 97^2 + \dots + 2^2 - 1^2$

### Hint

Use difference of squares on consecutive terms

### 解答

Write this as $(100^2 - 99^2) + (98^2 - 97^2) + \dots + (2^2 - 1^2)$. We use the identity $a^2 - b^2 = (a+b)(a-b)$ for all the terms. In particular, since $b = a-1$ in this scenario, we have that $a^2 - (a-1)^2 = 2a-1$ from the identity above. Therefore, we can write each of these terms as $$199 + 195 + \dots + 7 + 3 = \displaystyle\sum_{k=1}^{50} (4k-1) = 4 \cdot \dfrac{50(51)}{2} - 50 = 5050$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5050"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4byvwzrJeLVq1M6Schvm",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:48:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1933553,
    "source": "tmg",
    "status": "published",
    "tags": [],
    "title": "Alternating Sum",
    "topic": "brainteasers",
    "urlEnding": "alternating-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "uWuLd5qrtI7zt5SDcxup",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Alternating Sum",
    "topic": "brainteasers",
    "urlEnding": "alternating-sum"
  }
}
```
