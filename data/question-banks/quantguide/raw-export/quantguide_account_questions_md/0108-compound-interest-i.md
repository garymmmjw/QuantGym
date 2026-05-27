# QuantGuide Question

## 108. Compound Interest I

**Metadata**

- ID: `qBX0tYPXTtTy5Ct1HY1u`
- URL: https://www.quantguide.io/questions/compound-interest-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: Five Rings
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-25 20:24:22 America/New_York
- Last Edited By: Gabe

### 题干

You start with $\$100$ in your bank account today. You invest in a stock that yields $1\%$ interest that is compounded daily. To the nearest dollar, how much will you have in your bank account after $100$ days?

### Hint

The answer will be $100(1 + 0.01)^{100}$ by simple interest formula. How do you approximate it?

### 解答

The answer will be $100(1 + 0.01)^{100}$ by simple interest formula. Estimating that requires some skill. Noting the fact that $(1+1/n)^n \approx e$ for large $n$, we know it is about $100e \approx 271$. However, we must adjust down a little bit, so one may guess it is $\$270$. $270$ is indeed correct, though it is on the boundary between $270$ and $271$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "270"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "qBX0tYPXTtTy5Ct1HY1u",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 20:24:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 768508,
    "source": "Five Rings",
    "status": "published",
    "tags": [],
    "title": "Compound Interest I",
    "topic": "brainteasers",
    "urlEnding": "compound-interest-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "qBX0tYPXTtTy5Ct1HY1u",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Compound Interest I",
    "topic": "brainteasers",
    "urlEnding": "compound-interest-i"
  }
}
```
