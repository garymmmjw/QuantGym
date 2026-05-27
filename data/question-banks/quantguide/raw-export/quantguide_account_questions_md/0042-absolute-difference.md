# QuantGuide Question

## 42. Absolute Difference

**Metadata**

- ID: `8ODmAFC4VOjX6q7SGcbK`
- URL: https://www.quantguide.io/questions/absolute-difference
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: DRW
- Source: DRW
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:28:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $x_0 = 0$ and let $x_1,\dots,x_{10}$ satisfy that $|x_i - x_{i-1}| = 1$ for $1 \leq i \leq 10$ and $x_{10} = 4$. How many such sequences are there satisfying these conditions?

### Hint

Consider a walk where you move up $1$ for heads and move down $1$ for tails.

### 解答

Let's put this problem in a different light. Consider a walk where you move up $1$ for heads and move down $1$ for tails. The condition states that in the $10$ flips, we have $4$ more heads than tails, so this means that there are $7$ movements up and $3$ movements down. In other words, each valid sequence corresponds to some ordering of $UUUUUUUDDD$. There are $\displaystyle \binom{10}{3} = 120$ such arrangements, so this is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8ODmAFC4VOjX6q7SGcbK",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:28:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 313496,
    "source": "DRW",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Absolute Difference",
    "topic": "probability",
    "urlEnding": "absolute-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "8ODmAFC4VOjX6q7SGcbK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Absolute Difference",
    "topic": "probability",
    "urlEnding": "absolute-difference"
  }
}
```
