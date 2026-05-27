# QuantGuide Question

## 546. Poker Hands V

**Metadata**

- ID: `ZA3OpDdJLQ5SRXwE5OrH`
- URL: https://www.quantguide.io/questions/poker-hands-v
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Own
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 22:56:08 America/New_York
- Last Edited By: Aaron

### 题干

A poker hand consists of five cards from a fair deck of 52 cards. What is the probability that you have three-of-a-kind (three cards of the same rank and two cards of two other ranks)?

### Hint

Consider the possible values and suits of the three-of-a-kind and then calculate the possibilities for the other two cards.  

### 解答

There are a total of ${52 \choose 5}$ total hand combinations. To count the number of hands that contain a three-of-a-kind, we need to look at the three-of-a-kind itself and the possible other cards. The three-of-a-kind has $13$ possible face values and ${4 \choose 3}$ possible suit values. The other cards have ${12 \choose 2}$ possible face values and $4$ possible suit values for each card. Thus, the probability that you have a three-of-a-kind is:

$$\frac{13 \cdot {4 \choose 3} \cdot {12 \choose 2} \cdot 4^2}{{52 \choose 5}}=\frac{88}{4165}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "88/4165"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZA3OpDdJLQ5SRXwE5OrH",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 22:56:08 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 4357939,
    "source": "Kaushik - Own",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands V",
    "topic": "probability",
    "urlEnding": "poker-hands-v",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ZA3OpDdJLQ5SRXwE5OrH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands V",
    "topic": "probability",
    "urlEnding": "poker-hands-v"
  }
}
```
