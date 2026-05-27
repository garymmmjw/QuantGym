# QuantGuide Question

## 904. Football Bets

**Metadata**

- ID: `Y70NE9MdVMPU6SV7Eogi`
- URL: https://www.quantguide.io/questions/football-bets
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: SIG
- Tags: Conditional Probability, Games, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:32:05 America/New_York
- Last Edited By: Gabe

### 题干

Connor and Calvin bet $\$10$ each on opposing outcomes of a football game. During the match, Connor raises the bet to $\$20$. If Calvin doesn't match Connor's bet, he automatically loses what he has bet thus far. Let $p$ be the probability that Calvin's team will win the game when Connor raises. Find the smallest value of $p$ so that Calvin should accept Connor's bet.

### Hint

What is Calvin's expected value if he doesn't accept the bet? What if he does accept it?

### 解答

We know that if Calvin doesn't accept the bet, his expected value is $-10$, as he loses his initial bet. If Calvin accepts the bet, then with probability $p$ he wins $20$ and with probability $1-p$ he loses $20$. Therefore, we need to find the smallest $p$ such that $20p - 20(1-p) \geq -10$. Solving this equation for $p$ yields $p \geq \dfrac{1}{4}$, so $p = \dfrac{1}{4}$ is the smallest value where he should accept.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Y70NE9MdVMPU6SV7Eogi",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:32:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7401425,
    "randomizable": "",
    "source": "SIG",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Football Bets",
    "topic": "probability",
    "urlEnding": "football-bets",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "Y70NE9MdVMPU6SV7Eogi",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Football Bets",
    "topic": "probability",
    "urlEnding": "football-bets"
  }
}
```
