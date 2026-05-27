# QuantGuide Question

## 1118. Wood Chop

**Metadata**

- ID: `yeoccS7nGDTAeWjImAuP`
- URL: https://www.quantguide.io/questions/cut-up-wood
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: https://glassdoor.com/Interview/We-cut-zero-one-interval-into-6-parts-by-dealing-the-5-separator-points-uniformly-and-independently-from-zero-one-interval-QTN_2566578.htm
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 07:52:14 America/New_York
- Last Edited By: Gabe

### 题干

We have a stick of length $1$ that we are cutting into $6$ parts with $5$ uniform and random cuts. What is the probability that no piece is greater than $\frac{1}{2}$ in length?

### Hint

The only way to create a situation in which we have a section of the stick greater than $\frac{1}{2}$ in length is if all our cuts happen on half of the stick.

### 解答

The only way to create a situation in which we have a section of the stick greater than $\frac{1}{2}$ in length is if all our cuts happen on half of the stick. If all of our cuts happen in the same half of the stick, the region to the right of the last cut (or before the first cut dependent on the location of the cuts), will be at least $\frac{1}{2}$ in length. A cut happening on a certain half of the stick has a $\frac{1}{2}$ to occur, and all $5$ cuts happening on one half occurs with a probability of $2 \cdot \left(\dfrac{1}{2}\right)^5 = \dfrac{1}{16}$. This is because there are two halves of the stick.
$$$$
Since we want to know the probability that no piece is greater than $\frac{1}{2}$ in length, our final answer is the complement of the above. Therefore, our final answer is $1 - \frac{1}{16} = \frac{15}{16}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15/16"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "yeoccS7nGDTAeWjImAuP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 07:52:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9171212,
    "source": "https://glassdoor.com/Interview/We-cut-zero-one-interval-into-6-parts-by-dealing-the-5-separator-points-uniformly-and-independently-from-zero-one-interval-QTN_2566578.htm",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Wood Chop",
    "topic": "probability",
    "urlEnding": "cut-up-wood",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "yeoccS7nGDTAeWjImAuP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Wood Chop",
    "topic": "probability",
    "urlEnding": "cut-up-wood"
  }
}
```
