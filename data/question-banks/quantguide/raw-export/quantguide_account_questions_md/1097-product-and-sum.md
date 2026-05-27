# QuantGuide Question

## 1097. Product and Sum

**Metadata**

- ID: `AI0kcLLy5eVF29KRl8Di`
- URL: https://www.quantguide.io/questions/product-and-sum
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: belv oa
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 20:17:22 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $x$ and $y$ satisfy $x + y = 10$ and $xy = 20$. Find the value of $x^4 + y^4$.

### Hint

Expand out $(x+y)^4$ and try to write it in terms of $xy$ and $x+y$.

### 解答

Note that $$(x+y)^4 = x^4 + 4x^3y + 6x^2y^2 + 4xy^3 + y^4 = (x^4 + y^4) + 2xy\left[2x^2 + 3xy + 2y^2\right] = (x^4 + y^4) + 2xy\left[2(x+y)^2 - xy\right]$$ Since we know the values of $x+y$ and $xy$, we can say that $x^4 + y^4 = (x+y)^4 - 2xy\left[2(x+y)^2 - xy\right]$ and substitute in the values. Namely, we get that $x^4 + y^4 = 10^4 - 2(20)(2 \cdot 100 - 20) = 10000 - 7200 = 2800$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2800"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AI0kcLLy5eVF29KRl8Di",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 20:17:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8977175,
    "source": "belv oa",
    "status": "published",
    "tags": [],
    "title": "Product and Sum",
    "topic": "brainteasers",
    "urlEnding": "product-and-sum"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "AI0kcLLy5eVF29KRl8Di",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Product and Sum",
    "topic": "brainteasers",
    "urlEnding": "product-and-sum"
  }
}
```
