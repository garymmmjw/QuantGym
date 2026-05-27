# QuantGuide Question

## 403. Nested Root

**Metadata**

- ID: `p18hdlp7NjI9C9nhqrnc`
- URL: https://www.quantguide.io/questions/nested-root
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original, edited from 150 question
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the value of $\sqrt{6 + \sqrt{6 + \sqrt{6 + \dots}}}$.

### Hint

Let $x$ be the value of this expression. Can you nest $x$ inside the square root?

### 解答

Let $x$ be the value of this expression. Then $x = \sqrt{6 + x}$ from the nesting demonstrated here. Squaring both sides, we see that $x^2 = x + 6$, so $x^2 - x - 6 = 0$ This factors to $(x-3)(x+2) = 0$, so $x = 3,-2$. However, as the value of this expression must be positive, we can conclude that $x = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "p18hdlp7NjI9C9nhqrnc",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3160724,
    "source": "original, edited from 150 question",
    "status": "published",
    "tags": [],
    "title": "Nested Root",
    "topic": "brainteasers",
    "urlEnding": "nested-root"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "p18hdlp7NjI9C9nhqrnc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Nested Root",
    "topic": "brainteasers",
    "urlEnding": "nested-root"
  }
}
```
