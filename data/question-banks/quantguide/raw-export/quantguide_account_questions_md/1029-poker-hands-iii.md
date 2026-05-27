# QuantGuide Question

## 1029. Poker Hands III

**Metadata**

- ID: `3papEZRg86g5rJfacpK7`
- URL: https://www.quantguide.io/questions/poker-hands-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:15:58 America/New_York
- Last Edited By: Gabe

### 题干

A poker hand consists of five cards from a fair deck of 52 cards. What is the probability that you have two pairs (two cards of the same value and another two cards of the same value)?

### Hint

When counting the total number of hands with two pairs, calculate the number of possible face values and suit values that the two pairs can have and make sure to account for the fifth card.

### 解答

There are a total of ${52 \choose 5}$ total hand combinations. To count the number of hands that contain two pairs, we can look at the pairs in tandem. The pairs have ${13 \choose 2}$ possible face values and ${4 \choose 2}$ possible suit values each. The last card can be any of the remaining 44 cards that have a different value than the two pairs. Thus, the probability that you have two pairs is:$$\frac{{13 \choose 2} \times {4 \choose 2} \times {4 \choose 2} \times 44}{{52 \choose 5}}=\frac{198}{4165}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "198/4165"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3papEZRg86g5rJfacpK7",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:15:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8353483,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands III",
    "topic": "probability",
    "urlEnding": "poker-hands-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "3papEZRg86g5rJfacpK7",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands III",
    "topic": "probability",
    "urlEnding": "poker-hands-iii"
  }
}
```
