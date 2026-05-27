# QuantGuide Question

## 873. No Rock

**Metadata**

- ID: `gyGwRlDCbeWUpHH5OD1l`
- URL: https://www.quantguide.io/questions/no-rock
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street
- Source: Jane Street
- Tags: Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You play rock, paper, scissors with an opponent, but your opponent cannot play rock. Every time you win, you receive $\$1$, every time you lose, you lose $\$1$, and every time you draw, nothing happens. Assuming optimal play, what is your expected profit per round?

### Hint

Note that there is no point in playing paper, as paper doesn't defeat scissors nor paper. Therefore, suppose that you play rock with probability $a$ and scissors with probability $1-a$. Furthermore, suppose that your opponent plays paper with probability $b$ and scissors with probability $1-b$. Write a function $P(a,b)$ that represents your payout as a function of $a$ and $b$. Find the equilibrium.

### 解答

Note that there is no point in playing paper, as paper doesn't defeat scissors nor paper. Therefore, suppose that you play rock with probability $a$ and scissors with probability $1-a$. Furthermore, suppose that your opponent plays paper with probability $b$ and scissors with probability $1-b$. If $P(a,b)$ represents your expected profit on this game with $a$ and $b$ fixed as above, we have that $$P(a,b) = ab(-1) + a(1-b)(1) + (1-a)b(1) + (1-a)(1-b)(0) = a + b - 3ab$$ Keeping $b$ fixed, taking the partial derivative, we see that $\dfrac{\partial P}{\partial a} = 1 - 3b$. Similarly, taking the partial derivative in $b$ yields that $\dfrac{\partial P}{\partial b} = 1 - 3a$. Setting these both equal to $0$ yields that there is an equilibrium at $a = b = \dfrac{1}{3}$. Therefore, your expected profit per round is $$P(1/3,1/3) = \dfrac{1}{3} + \dfrac{1}{3} - \dfrac{1}{3} = \dfrac{1}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "gyGwRlDCbeWUpHH5OD1l",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7114020,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "No Rock",
    "topic": "probability",
    "urlEnding": "no-rock"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "gyGwRlDCbeWUpHH5OD1l",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "No Rock",
    "topic": "probability",
    "urlEnding": "no-rock"
  }
}
```
