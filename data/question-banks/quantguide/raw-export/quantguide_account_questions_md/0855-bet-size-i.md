# QuantGuide Question

## 855. Bet Size I

**Metadata**

- ID: `JHWuKoHejcYk4A7Klen7`
- URL: https://www.quantguide.io/questions/bet-size-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC, SIG, Old Mission
- Source: Myself
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 16:42:02 America/New_York
- Last Edited By: Gabe

### 题干

Say you are betting on a game where you win $75\%$ where you get paid $1:1$ on it. Assuming optimal strategy, what percentage of your bankroll should you bet on this game?

### Hint

Use Kelly Criterion.

### 解答

Use Kelly Criterion formula. The formula follows $\frac{p(b+1)-1}{b}$ where $p$ is the probability of winning the bet and b is the profit ratio. In this case, $p$ is $0.75$ and $b$ is $1$. Thus you should bet $\frac{0.75(1+1)-1}{1} = 0.5$. Thus you should bet $50\%$ of your bankroll on this bet. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.5",
      "1/2",
      "50"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JHWuKoHejcYk4A7Klen7",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 16:42:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6970018,
    "source": "Myself",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bet Size I",
    "topic": "finance",
    "urlEnding": "bet-size-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "JHWuKoHejcYk4A7Klen7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bet Size I",
    "topic": "finance",
    "urlEnding": "bet-size-i"
  }
}
```
