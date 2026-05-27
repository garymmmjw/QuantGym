# QuantGuide Question

## 1116. Rowdy Root

**Metadata**

- ID: `W1bu2WQxEzc7nIlevRBj`
- URL: https://www.quantguide.io/questions/rowdy-root
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-31 17:27:28 America/New_York
- Last Edited By: Gabe

### 题干

Evaluate $\sqrt{120 \cdot 121 \cdot 122 \cdot 123 + 1}$.

### Hint

Make a small substitution to get all of the terms centered around some point.

### 解答

We can more generally consider this for a radical of the form $\sqrt{n(n+1)(n+2)(n+3) + 1}$ and plug in $n = 120$ to get the result. The key trick here is to get a common midpoint. In particular, we can write this as $$\sqrt{(m-3/2)(m-1/2)(m+1/2)(m+3/2) + 1}$$ where $m = n + 3/2$. We want to write it in this form because now we can use the difference of squares formula to reduce this. In particular, the interior becomes $(m^2 - 1/4)(m^2 - 9/4) + 1 = m^4 - \frac{5}{2}m^2 + \frac{25}{16} = \left(m^2 - \frac{5}{4}\right)^2$. This implies that the original expression is equal to $m^2 - \dfrac{5}{4}$, where $m = \dfrac{3}{2} + n$. Plugging back in $n$, we get $$m^2 - \dfrac{5}{4} = \left(n + \dfrac{3}{2}\right)^2 - \dfrac{5}{4} = n^2 + 3n + 1$$ Plugging in $n = 120$ into this expression, we have that our answer is $$120^2 + 3 \cdot 120 + 1 = 14761$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14761"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "W1bu2WQxEzc7nIlevRBj",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 17:27:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9155852,
    "source": "og",
    "status": "published",
    "tags": [],
    "title": "Rowdy Root",
    "topic": "brainteasers",
    "urlEnding": "rowdy-root",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "W1bu2WQxEzc7nIlevRBj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Rowdy Root",
    "topic": "brainteasers",
    "urlEnding": "rowdy-root"
  }
}
```
