# QuantGuide Question

## 589. Friendly Competition

**Metadata**

- ID: `8fPgt9jHM8wXy4jLtE2B`
- URL: https://www.quantguide.io/questions/friendly-competition
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver, SIG, Old Mission, Citadel, Squarepoint Capital
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-29 09:35:58 America/New_York
- Last Edited By: Gabe

### 题干

Players $1$ and $2$ respectively start with $\$1$ and $\$2$. They flip a coin with probability $\dfrac{2}{3}$ of heads on each toss. Player $1$ receives $\$1$ from Player 2 if the coin shows heads. Otherwise, Player 2 receives $\$1$ from Player 1. Find the probability Player 2 goes broke first i.e. Player 1 wins.

### Hint

Let $p$ be the probability player $1$ wins. Consider what happens under the two coin flip sequences $TT,TH,HT,HH$.

### 解答

Let $p$ be the probability player $1$ wins. If the first flip is tails, then player $1$ loses automatically. If we go $HT$, then we are back where we started and player $1$ has probability $p$ of winning. This occurs with probability $\dfrac{2}{3} \cdot \dfrac{1}{3} = \dfrac{2}{9}$ by independence of the coins. If we go $HH$, then player $1$ wins. This occurs with probability $\dfrac{2}{3} \cdot \dfrac{2}{3} = \dfrac{4}{9}$ Therefore, by Law of Total Probability, $p = \dfrac{2}{9}p + \dfrac{4}{9}$. Solving this for $p$ yields $p = \dfrac{4}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/7"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8fPgt9jHM8wXy4jLtE2B",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 09:35:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4730180,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Friendly Competition",
    "topic": "probability",
    "urlEnding": "friendly-competition",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "8fPgt9jHM8wXy4jLtE2B",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Friendly Competition",
    "topic": "probability",
    "urlEnding": "friendly-competition"
  }
}
```
