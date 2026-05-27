# QuantGuide Question

## 88. High-Low Guess

**Metadata**

- ID: `uRy2Vg0lwGXmTWmDtHI5`
- URL: https://www.quantguide.io/questions/highlow-guess
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group
- Source: tmg
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 10:58:21 America/New_York
- Last Edited By: Gabe

### 题干

You and your friend play a game where your friend first selects a random number between $1$ to $1000$. Afterwards, you must guess the number. At each turn, your friend must reveal if your guess is higher or lower than the actual number he guessed.  Let $n$ be the minimum number of guesses you must perform to find your friend's number, regardless of what they selected. Find $n$.

### Hint

This is a simple binary search problem.

### 解答

This is a simple binary search problem. On the first turn, you should select $500$, and in each consecutive turn, based on whether your friend says higher or lower, you guess the midpoint of the remaining region. This eliminates half of the "search space" at each turn, so the number of values you can search in $k$ turns is $2^k$, meaning that $n$ is the smallest integer such that $2^n \geq 1000$, which is $n = 10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "uRy2Vg0lwGXmTWmDtHI5",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:58:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 620348,
    "source": "tmg",
    "status": "published",
    "tags": [],
    "title": "High-Low Guess",
    "topic": "brainteasers",
    "urlEnding": "highlow-guess",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "uRy2Vg0lwGXmTWmDtHI5",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "High-Low Guess",
    "topic": "brainteasers",
    "urlEnding": "highlow-guess"
  }
}
```
