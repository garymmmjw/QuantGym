# QuantGuide Question

## 1088. Poker Hands II

**Metadata**

- ID: `wLfK6pGmfMFUgUXZzkgd`
- URL: https://www.quantguide.io/questions/poker-hands-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:22:30 America/New_York
- Last Edited By: Gabe

### 题干

A poker hand consists of five cards from a fair deck of 52 cards. What is the probability that you have a full house (three cards of the same value and another two cards of the same value)?

### Hint

When calculating the total number of hands that contain a full house, look at the triplet and pair separately. How many possible face values and how many possible suit values can the triplet and pair have?

### 解答

There are a total of ${52 \choose 5}$ total hand combinations. To count the number of hands that contain a full house, we can look at the triplet and pair separately. The triplet has 13 possible face values and ${4 \choose 3}$ possible suit values. The pair has 12 possible face values and ${4 \choose 2}$ possible suit values. Thus, the probability that you have a full house is:

$$\frac{13 \times {4 \choose 3} \times 12 \times {4 \choose 2}}{{52 \choose 5}}=\frac{6}{4165}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/4165"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wLfK6pGmfMFUgUXZzkgd",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:22:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8881706,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands II",
    "topic": "probability",
    "urlEnding": "poker-hands-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "wLfK6pGmfMFUgUXZzkgd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Poker Hands II",
    "topic": "probability",
    "urlEnding": "poker-hands-ii"
  }
}
```
