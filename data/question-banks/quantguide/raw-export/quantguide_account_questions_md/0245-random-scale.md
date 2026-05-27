# QuantGuide Question

## 245. Random Scale

**Metadata**

- ID: `PwwUegpOinHy5ySLoLmP`
- URL: https://www.quantguide.io/questions/random-scale
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-9 11:00:40 America/New_York
- Last Edited By: Gabe

### 题干

We have $6$ weights of mass $201,202,\dots,206$ grams. We randomly arrange $3$ weights on each side of a scale. Find the probability that the side with the $206$ gram weight is heavier.

### Hint

The $200$ in front doesn't matter, as subtracting $200$ uniformly from all the weights won't change the ordering. Therefore, we can consider this question as if it were weights $1-6$ grams. What is the sum of all the weights?

### 解答

The $200$ in front doesn't matter, as subtracting $200$ uniformly from all the weights won't change the ordering. Therefore, we can consider this question as if it were weights $1-6$ grams. Fix the weight of $6$ grams on one side. We know that the sum of all of the weights is $21$ grams, so the side with $11$ or more grams would be heavier. There are $\binom{5}{2} = 10$ ways to pick a pair of weights to be with the $6$ gram weight. Of those, all of them but $(1,2)$ and $(1,3)$ sum to at least $5$ grams. Therefore, the probability must be $\dfrac{10-2}{10} = \dfrac{4}{5}$, as $8$ of the $10$ possible combinations make that side heavier.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/5"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "PwwUegpOinHy5ySLoLmP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:00:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1934578,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Random Scale",
    "topic": "probability",
    "urlEnding": "random-scale",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "PwwUegpOinHy5ySLoLmP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Random Scale",
    "topic": "probability",
    "urlEnding": "random-scale"
  }
}
```
