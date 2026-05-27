# QuantGuide Question

## 356. Ascending Stairs

**Metadata**

- ID: `KRzCKRzpRjGXcKcWTF7j`
- URL: https://www.quantguide.io/questions/ascending-stairs
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You are at the bottom of a staircase with 5 steps. You can either take one or two steps at a time. How many different ways are there for you to ascend the staircase?

### Hint

How can you write a recursive function to represent this question? Does this remind you of any well-known sequence?

### 解答

Let $f(x)$ be the number of ways to ascend to step $x$. You can only step to $x$ from either step $x-1$ or $x-2$. In other words, $f(x) = f(x-1) + f(x-2)$. We know that $f(1) = 1$ and $f(2) = 2$, so we can solve for $f(5) = 8$ recursively.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "difficulty": "easy",
    "id": "KRzCKRzpRjGXcKcWTF7j",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2723680,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Ascending Stairs",
    "topic": "brainteasers",
    "urlEnding": "ascending-stairs"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "KRzCKRzpRjGXcKcWTF7j",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Ascending Stairs",
    "topic": "brainteasers",
    "urlEnding": "ascending-stairs"
  }
}
```
