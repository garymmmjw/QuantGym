# QuantGuide Question

## 621. Product Over Sum

**Metadata**

- ID: `AFNg5BjzABwzSAJ4CZUH`
- URL: https://www.quantguide.io/questions/product-over-sum
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:29:10 America/New_York
- Last Edited By: Gabe

### 题干

Roll two fair standard $6-$sided dice. Find the probability that the sum of the upfaces is at least the product of the upfaces.

### Hint

Let $X$ and $Y$ be the outcomes of the two rolls. Then we want to find when $X + Y \geq XY$.

### 解答

Let $X$ and $Y$ be the outcomes of the two rolls. Then we want to find when $X + Y \geq XY$. Solving for $Y$, we see that $Y \leq \dfrac{X}{X-1}$. If $X = 1$, then this holds for any $Y$. If $X = 2$, then this holds for $Y = 1,2$. However, for $X > 2$, this only holds when $Y = 1$ by plugging into the inequality. Therefore, the condition is just equivalent to when is there at least one $1$ rolled or we get the outcome $(2,2)$. The probability of this is $\dfrac{12}{36} = \dfrac{1}{3}$ by drawing out the table or using Inclusion-Exclusion and adding in the case of $(2,2)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AFNg5BjzABwzSAJ4CZUH",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:29:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4911489,
    "source": "5r",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Product Over Sum",
    "topic": "probability",
    "urlEnding": "product-over-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "AFNg5BjzABwzSAJ4CZUH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Product Over Sum",
    "topic": "probability",
    "urlEnding": "product-over-sum"
  }
}
```
