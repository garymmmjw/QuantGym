# QuantGuide Question

## 1103. Remainders

**Metadata**

- ID: `w8cbC8ZkCy5DF6iSTwEo`
- URL: https://www.quantguide.io/questions/remainders
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-25 13:36:53 America/New_York
- Last Edited By: Gabe

### 题干

What is the smallest positive integer that has a remainder of $i$ when divided by $i+1$ for all $1 \leq i \leq 9$?

### Hint

Mathematically define what you are given and what you solving for. How can you manipulate what you are given to use the least common multiple?

### 解答

Let $X$ denote the smallest positive integer we are solving for. We can further define $X_2, X_3, ..., X_{10}$ as positive integers such that:

$$X = 2 \times X_2 + 1$$
$$X = 3 \times X_3 + 2$$
$$ \vdots $$
$$X = 10 \times X_{10} + 10$$

Let $X'_i = X_i + 1 \forall i \in \{2, 3, ..., 10\}$. Then, adding $1$ to both sides of each equations:

$$X + 1 = 2 \times X'_2$$
$$X + 1 = 3 \times X'_3$$
$$ \vdots $$
$$X + 1 = 10 \times X'_{10}$$

In other words, we are now looking for $X$ such that $X+1$ is perfectly divisible by 2, 3, 4, 5, 6, 7, 8, 9, and 10. The least common multiple of these numbers is 2520, and thus $X$ is 2519.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2519"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "w8cbC8ZkCy5DF6iSTwEo",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-25 13:36:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9016736,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Remainders",
    "topic": "brainteasers",
    "urlEnding": "remainders",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "w8cbC8ZkCy5DF6iSTwEo",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Remainders",
    "topic": "brainteasers",
    "urlEnding": "remainders"
  }
}
```
