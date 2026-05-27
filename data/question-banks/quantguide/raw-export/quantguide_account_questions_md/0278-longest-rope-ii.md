# QuantGuide Question

## 278. Longest Rope II

**Metadata**

- ID: `k1EJjCm65Un09eJqfNwV`
- URL: https://www.quantguide.io/questions/longest-rope-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r edited
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:48:00 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have a rope that is $1$ meter in length. You cut the rope uniformly at random along the length. Find the variance of the length of the longer piece (in meters).

### Hint

Let $X$ be the distance from the LHS that the rope is cut. Then we know that $X \sim \text{Unif}(0,1)$ and $L = \text{max}\{X,1-X\}$ is the length of the longer piece, as the division at point $X$ yields two pieces of length $X$ and $1-X$. Try to find the distribution of $L$.

### 解答

Let $X$ be the distance from the LHS that the rope is cut. Then we know that $X \sim \text{Unif}(0,1)$ and $L = \text{max}\{X,1-X\}$ is the length of the longer piece, as the division at point $X$ yields two pieces of length $X$ and $1-X$. We know that $L \geq 0.5$, as at least one of the two pieces must be longer than $1/2$ in length. However, we see that the event $\{L = c\}$ corresponds to $X = c$ or $X = 1-c$, so we get that $L \sim \text{Unif}(0.5,1)$, meaning that $\text{Var}(L) = \dfrac{(0.5)^2}{12} = \dfrac{1}{48}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/48"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "k1EJjCm65Un09eJqfNwV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:48:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2139466,
    "source": "5r edited",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Longest Rope II",
    "topic": "probability",
    "urlEnding": "longest-rope-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "k1EJjCm65Un09eJqfNwV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Longest Rope II",
    "topic": "probability",
    "urlEnding": "longest-rope-ii"
  }
}
```
