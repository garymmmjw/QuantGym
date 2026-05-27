# QuantGuide Question

## 182. First Right

**Metadata**

- ID: `Xn3KSomdedh7ysn0kHfn`
- URL: https://www.quantguide.io/questions/first-right
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street
- Source: Jane Street Glassdoor
- Tags: Expected Value, Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:29:49 America/New_York
- Last Edited By: Gabe

### 题干

You and your opponent flip a coin. If the first player gets heads, the second player pays him $\$30$. If he flips tails, the coin goes to the second player. If the second player flips heads, he wins $\$30$ from the first player. If the second player also gets tails, the process repeats. What is the maximum amount (in dollars) you would pay for the right to go first?

### Hint

Let $x$ be the expected value of the game if you go first. With probability $\dfrac{1}{2}$, you will receive $\$30$. What are the other cases?

### 解答

Let $x$ be the expected value of the game if you go first. With probability $\dfrac{1}{2}$, you will receive $\$30$. With probability $\dfrac{1}{4}$ (you land tails and your opponent lands heads), you will lose $\$30$. Then, with probability $\dfrac{1}{4}$, the game resets and your expected gain is $x$. This yields the equation $$x = 0.5(30) + 0.25(-30) + 0.25(x)$$ When solved, this yields $x = 10$, so the right is worth at most $\$10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Xn3KSomdedh7ysn0kHfn",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:29:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1427550,
    "randomizable": "",
    "source": "Jane Street Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "First Right",
    "topic": "probability",
    "urlEnding": "first-right",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "Xn3KSomdedh7ysn0kHfn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "First Right",
    "topic": "probability",
    "urlEnding": "first-right"
  }
}
```
