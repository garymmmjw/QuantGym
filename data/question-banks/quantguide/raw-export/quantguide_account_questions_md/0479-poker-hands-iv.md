# QuantGuide Question

## 479. Poker Hands IV

**Metadata**

- ID: `jNZl0psyR8N9iDFpT0T8`
- URL: https://www.quantguide.io/questions/poker-hands-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Own
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-26 22:51:24 America/New_York
- Last Edited By: Aaron

### 题干

A poker hand consists of five cards from a fair deck of 52 cards. What is the probability that you have a single pair (two cards of the same value and the other three cards of different unique values)?

### Hint

Find all possible values and suits of the pair and then find the possibilities for the other three cards.

### 解答

There are a total of ${52 \choose 5}$ total hand combinations. To count the number of hands that contain a single pair, we need to look at the pair itself and the possible other cards. The pair has $13$ possible face values and ${4 \choose 2}$ possible suit values. The other cards have ${12 \choose 3}$ possible face values and $4$ possible suit values for each card. Thus, the probability that you have a single pair is:

$$\frac{13 \cdot {4 \choose 2} \cdot {12 \choose 3} \cdot 4^3}{{52 \choose 5}}=\frac{352}{833}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "352/833"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jNZl0psyR8N9iDFpT0T8",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 22:51:24 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 3820543,
    "source": "Kaushik - Own",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands IV",
    "topic": "probability",
    "urlEnding": "poker-hands-iv",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "jNZl0psyR8N9iDFpT0T8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands IV",
    "topic": "probability",
    "urlEnding": "poker-hands-iv"
  }
}
```
