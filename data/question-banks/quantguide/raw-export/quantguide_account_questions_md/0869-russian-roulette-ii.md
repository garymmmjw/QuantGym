# QuantGuide Question

## 869. Russian Roulette II

**Metadata**

- ID: `ZiAP3Ef9TEKp572Zm5la`
- URL: https://www.quantguide.io/questions/russian-roulette-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, TransMarket Group
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:57:23 America/New_York
- Last Edited By: Gabe

### 题干

You're playing a game of Russian Roulette with a friend. The six-chambered revolver is loaded with one bullet. Initially, the cylinder is spun to randomize the order of the chambers. The two of you take turns pulling the trigger until the person who fires the gun loses. Given that the cylinder is re-spun after each turn, what is the probability that you win if your friend goes first?

### Hint

How can you condition the probability that you lose on the first trigger pull?

### 解答

Let $p$ be the probability that the first player, your friend, loses and $1-p$ be the probability that the second player, you, loses. We can condition the probability $p$ on the first trigger pull. The first player loses with certainty $\frac{1}{6}$ of the time. Else, he essentially becomes the second player in the game with a conditional probability $1-p$ of losing. Thus, $$p = \frac{1}{6} \times 1 + \frac{5}{6} \times (1-p) \Rightarrow p = \frac{6}{11}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/11"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZiAP3Ef9TEKp572Zm5la",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:57:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7080377,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette II",
    "topic": "probability",
    "urlEnding": "russian-roulette-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "ZiAP3Ef9TEKp572Zm5la",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette II",
    "topic": "probability",
    "urlEnding": "russian-roulette-ii"
  }
}
```
