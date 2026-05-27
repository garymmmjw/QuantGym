# QuantGuide Question

## 1013. Coin Streak

**Metadata**

- ID: `e2DS61pQto3rEQB1d0PB`
- URL: https://www.quantguide.io/questions/coin-streak
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: mse adapted
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the expected number of flips of a fair coin needed to either have $10$ more heads flipped than tails or $7$ more tails flipped than heads.

### Hint

This is a gambler's ruin problem in disguise.

### 解答

This is a gambler's ruin problem in disguise. If you obtain $\$1$ for each head and lose $\$1$ for each tail that appears, this is asking the expected time for you to either have $\$10$ or $-\$7$. The expected hitting time of the set $\{-a,b\}$ for $a,b > 0$ is a commonly known to be $-ab$. In this case, $a = 7$ and $b = 10$, so our expected hitting time is $70$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "70"
    ],
    "difficulty": "easy",
    "id": "e2DS61pQto3rEQB1d0PB",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8222908,
    "source": "mse adapted",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Streak",
    "topic": "probability",
    "urlEnding": "coin-streak"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "e2DS61pQto3rEQB1d0PB",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Streak",
    "topic": "probability",
    "urlEnding": "coin-streak"
  }
}
```
