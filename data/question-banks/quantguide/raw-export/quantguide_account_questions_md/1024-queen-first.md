# QuantGuide Question

## 1024. Queen First

**Metadata**

- ID: `YzV9XdmVP4sAHsRsVErO`
- URL: https://www.quantguide.io/questions/queen-first
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Citadel
- Source: Citadel and SIG OA
- Tags: Combinatorics, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:29:23 America/New_York
- Last Edited By: Gabe

### 题干

Hannah shuffles a standard deck of cards. She wins $\$100$ if the last queen appears before the last king. Her friend Alissa looks at the card order and tells Hannah that there are exactly two queens before the first king. Given this additional information, how much should Hannah expect to earn?


### Hint

We only need to consider possible orderings of queens and kings between 8 arbitrary spots.

### 解答

Suppose that we are given that all the queens and all the kings appear in the $x_1, x_2, \ldots, x_8$-th spots, where $1 \leq x_1 < x_2 < \cdots < x_8 \leq 52$. Each possible ordering of the queens and kings among the 8 spots occurs with the same probability. Hence, we only need to consider possible orderings of queens and kings between 8 arbitrary spots.

$$$$

Since we are given that the first 2 cards are queens, and the third card is a king, our problem becomes: how many different orderings of the remaining 5 cards (3 kings and 2 queens) end with a king. This probability is simply $\frac{3}{5}$, since there is a $\frac{3}{5}$ chance that the last card is a king. Putting it all together, we find that Hannah's total expected earnings is $\frac{3}{5} \cdot 100 = 60$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "60"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "YzV9XdmVP4sAHsRsVErO",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:29:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8322216,
    "source": "Citadel and SIG OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Queen First",
    "topic": "probability",
    "urlEnding": "queen-first",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "YzV9XdmVP4sAHsRsVErO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Queen First",
    "topic": "probability",
    "urlEnding": "queen-first"
  }
}
```
